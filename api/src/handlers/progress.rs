use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    Json,
};
use chrono::{Datelike, Duration, NaiveDate, Utc};
use serde::Deserialize;
use uuid::Uuid;

use crate::{
    auth::session::AuthUser,
    error::{AppError, AppResult},
    models::progress::{LogProgressRequest, UpdateProgressRequest, WeeklyProgress},
    AppState,
};

#[derive(Debug, Deserialize)]
pub struct WeekQuery {
    /// ISO week string "YYYY-Www" e.g. "2026-W15"
    pub week: Option<String>,
}

/// GET /progress?week=YYYY-Www
pub async fn get_progress(
    State(state): State<AppState>,
    AuthUser(user): AuthUser,
    Query(query): Query<WeekQuery>,
) -> AppResult<Json<Vec<WeeklyProgress>>> {
    let week_start = match query.week {
        Some(ref s) => parse_iso_week(s)?,
        None => current_week_start(user.week_start),
    };

    let rows = sqlx::query_as!(
        WeeklyProgress,
        r#"
        SELECT id, goal_id, user_id, week_start_date,
               completed_count, target_count, is_published,
               created_at, updated_at
        FROM weekly_progress
        WHERE user_id = $1 AND week_start_date = $2
        "#,
        user.id,
        week_start,
    )
    .fetch_all(&state.db)
    .await?;

    Ok(Json(rows))
}

/// POST /progress/:goal_id — log progress (increment)
pub async fn log_progress(
    State(state): State<AppState>,
    AuthUser(user): AuthUser,
    Path(goal_id): Path<Uuid>,
    Json(req): Json<LogProgressRequest>,
) -> AppResult<(StatusCode, Json<WeeklyProgress>)> {
    let increment = req.increment.unwrap_or(1).max(1);
    let week_start = current_week_start(user.week_start);

    // Ensure the goal belongs to this user
    let goal = sqlx::query!(
        "SELECT target_count FROM goals WHERE id = $1 AND user_id = $2 AND is_archived = false",
        goal_id,
        user.id,
    )
    .fetch_optional(&state.db)
    .await?
    .ok_or(AppError::NotFound)?;

    // Upsert the progress row, then enqueue the change
    let progress = sqlx::query_as!(
        WeeklyProgress,
        r#"
        INSERT INTO weekly_progress (id, goal_id, user_id, week_start_date, completed_count, target_count)
        VALUES (gen_random_uuid(), $1, $2, $3, $4, $5)
        ON CONFLICT (goal_id, user_id, week_start_date)
        DO UPDATE SET
            completed_count = LEAST(
                weekly_progress.completed_count + $4,
                weekly_progress.target_count
            ),
            updated_at = NOW()
        RETURNING id, goal_id, user_id, week_start_date,
                  completed_count, target_count, is_published,
                  created_at, updated_at
        "#,
        goal_id,
        user.id,
        week_start,
        increment,
        goal.target_count,
    )
    .fetch_one(&state.db)
    .await?;

    // Enqueue for publish cycle
    enqueue_publish(&state, user.id, progress.id, &progress).await?;

    Ok((StatusCode::OK, Json(progress)))
}

/// PATCH /progress/:id
pub async fn update_progress(
    State(state): State<AppState>,
    AuthUser(user): AuthUser,
    Path(progress_id): Path<Uuid>,
    Json(req): Json<UpdateProgressRequest>,
) -> AppResult<Json<WeeklyProgress>> {
    let progress = sqlx::query_as!(
        WeeklyProgress,
        r#"
        UPDATE weekly_progress SET
            completed_count = COALESCE($1, completed_count),
            updated_at      = NOW()
        WHERE id = $2 AND user_id = $3
        RETURNING id, goal_id, user_id, week_start_date,
                  completed_count, target_count, is_published,
                  created_at, updated_at
        "#,
        req.completed_count,
        progress_id,
        user.id,
    )
    .fetch_optional(&state.db)
    .await?
    .ok_or(AppError::NotFound)?;

    enqueue_publish(&state, user.id, progress.id, &progress).await?;

    Ok(Json(progress))
}

/// Compute the start of the current week given the user's week_start (0=Sun…6=Sat)
pub fn current_week_start(week_start: i16) -> NaiveDate {
    let today = Utc::now().date_naive();
    // weekday(): Mon=0…Sun=6
    let today_dow = today.weekday().num_days_from_sunday() as i16; // 0=Sun
    let days_since_start = (today_dow - week_start).rem_euclid(7);
    today - Duration::days(days_since_start as i64)
}

fn parse_iso_week(s: &str) -> AppResult<NaiveDate> {
    // Expects "YYYY-Www"
    let err = || AppError::BadRequest(format!("invalid week format '{s}', expected YYYY-Www"));
    let parts: Vec<&str> = s.split('-').collect();
    if parts.len() != 2 || !parts[1].starts_with('W') {
        return Err(err());
    }
    let year: i32 = parts[0].parse().map_err(|_| err())?;
    let week: u32 = parts[1][1..].parse().map_err(|_| err())?;

    NaiveDate::from_isoywd_opt(year, week, chrono::Weekday::Mon)
        .ok_or_else(err)
}

async fn enqueue_publish(
    state: &AppState,
    user_id: Uuid,
    progress_id: Uuid,
    progress: &WeeklyProgress,
) -> AppResult<()> {
    // Look up user's publish schedule
    let user = sqlx::query!(
        "SELECT timezone, publish_time FROM users WHERE id = $1",
        user_id
    )
    .fetch_one(&state.db)
    .await?;

    let scheduled = next_publish_time(&user.timezone, &user.publish_time)?;

    let payload = serde_json::json!({
        "completed_count": progress.completed_count,
        "target_count": progress.target_count,
    });

    sqlx::query!(
        r#"
        INSERT INTO publish_queue (id, user_id, weekly_progress_id, change_payload, scheduled_publish_at)
        VALUES (gen_random_uuid(), $1, $2, $3, $4)
        ON CONFLICT (user_id, weekly_progress_id)
        DO UPDATE SET
            change_payload       = EXCLUDED.change_payload,
            scheduled_publish_at = EXCLUDED.scheduled_publish_at,
            published_at         = NULL
        "#,
        user_id,
        progress_id,
        payload,
        scheduled,
    )
    .execute(&state.db)
    .await?;

    Ok(())
}

fn next_publish_time(
    timezone: &str,
    publish_time: &str,
) -> AppResult<chrono::DateTime<Utc>> {
    use chrono::TimeZone;

    let tz: chrono_tz::Tz = timezone
        .parse()
        .map_err(|_| AppError::BadRequest(format!("invalid timezone: {timezone}")))?;

    let parts: Vec<u32> = publish_time
        .split(':')
        .filter_map(|p| p.parse().ok())
        .collect();

    if parts.len() != 2 {
        return Err(AppError::Internal(anyhow::anyhow!(
            "invalid publish_time in DB: {publish_time}"
        )));
    }

    let now = Utc::now().with_timezone(&tz);
    let today = now.date_naive();
    let today_at_publish = tz
        .from_local_datetime(&today.and_hms_opt(parts[0], parts[1], 0).unwrap())
        .single()
        .unwrap()
        .with_timezone(&Utc);

    if today_at_publish > Utc::now() {
        Ok(today_at_publish)
    } else {
        Ok(today_at_publish + Duration::days(1))
    }
}
