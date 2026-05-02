use axum::{
    extract::{Path, Query, State},
    Json,
};
use serde::Deserialize;
use uuid::Uuid;

use crate::{
    auth::session::AuthUser,
    error::{AppError, AppResult},
    models::{follow::UserSummary, user::{PublicProfile, UpdateProfileRequest, User}},
    AppState,
};

#[derive(Debug, Deserialize)]
pub struct WeekQuery {
    pub date: chrono::NaiveDate,
}

#[derive(Debug, serde::Serialize, sqlx::FromRow)]
pub struct WeekGoalItem {
    pub goal_title: Option<String>,
    pub completed_count: i32,
    pub target_count: i32,
}

#[derive(Debug, Deserialize)]
pub struct SearchQuery {
    pub q: Option<String>,
}

/// GET /users/search?q=term — search users by display name
pub async fn search_users(
    State(state): State<AppState>,
    Query(params): Query<SearchQuery>,
) -> AppResult<Json<Vec<UserSummary>>> {
    let q = params.q.unwrap_or_default();
    let q = q.trim().to_string();
    if q.is_empty() {
        return Ok(Json(vec![]));
    }
    let pattern = format!("%{}%", q.to_lowercase());
    let users = sqlx::query_as!(
        UserSummary,
        r#"
        SELECT id, display_name, avatar_url
        FROM users
        WHERE LOWER(display_name) LIKE $1
        ORDER BY display_name
        LIMIT 20
        "#,
        pattern,
    )
    .fetch_all(&state.db)
    .await?;
    Ok(Json(users))
}

/// GET /users/:id — public profile with follower/following counts
pub async fn get_user(
    State(state): State<AppState>,
    Path(user_id): Path<Uuid>,
) -> AppResult<Json<PublicProfile>> {
    let profile = sqlx::query_as!(
        PublicProfile,
        r#"
        SELECT
            u.id,
            u.display_name,
            u.avatar_url,
            u.subscription_tier as "subscription_tier: _",
            u.leaderboard_opt_in,
            u.created_at,
            (SELECT COUNT(*) FROM follows WHERE followed_id = u.id)::bigint AS "follower_count!",
            (SELECT COUNT(*) FROM follows WHERE follower_id = u.id)::bigint AS "following_count!"
        FROM users u
        WHERE u.id = $1
        "#,
        user_id
    )
    .fetch_optional(&state.db)
    .await?
    .ok_or(AppError::NotFound)?;

    Ok(Json(profile))
}

/// GET /users/me — authenticated user's own full profile
pub async fn get_me(AuthUser(user): AuthUser) -> Json<User> {
    Json(user)
}

/// PATCH /users/me — update profile / settings
pub async fn update_me(
    State(state): State<AppState>,
    AuthUser(user): AuthUser,
    Json(req): Json<UpdateProfileRequest>,
) -> AppResult<Json<User>> {
    // Validate timezone if provided
    if let Some(ref tz) = req.timezone {
        tz.parse::<chrono_tz::Tz>()
            .map_err(|_| AppError::BadRequest(format!("unknown timezone: {tz}")))?;
    }

    // Validate publish_time format "HH:MM"
    if let Some(ref pt) = req.publish_time {
        let parts: Vec<&str> = pt.split(':').collect();
        let valid = parts.len() == 2
            && parts[0].parse::<u8>().map(|h| h < 24).unwrap_or(false)
            && parts[1].parse::<u8>().map(|m| m < 60).unwrap_or(false);
        if !valid {
            return Err(AppError::BadRequest(
                "publish_time must be HH:MM (e.g. 00:00)".into(),
            ));
        }
    }

    // Validate week_start 0-6
    if let Some(ws) = req.week_start {
        if !(0..=6).contains(&ws) {
            return Err(AppError::BadRequest(
                "week_start must be 0 (Sun) through 6 (Sat)".into(),
            ));
        }
    }

    let updated = sqlx::query_as!(
        User,
        r#"
        UPDATE users SET
            display_name = COALESCE($1, display_name),
            timezone     = COALESCE($2, timezone),
            publish_time = COALESCE($3, publish_time),
            week_start   = COALESCE($4, week_start),
            updated_at   = NOW()
        WHERE id = $5
        RETURNING id, email, display_name, avatar_url, timezone, publish_time, week_start,
                  oauth_provider, oauth_provider_id,
                  subscription_tier as "subscription_tier: _",
                  leaderboard_opt_in, created_at, updated_at
        "#,
        req.display_name,
        req.timezone,
        req.publish_time,
        req.week_start,
        user.id,
    )
    .fetch_one(&state.db)
    .await?;

    Ok(Json(updated))
}

/// GET /users/:id/activity — heatmap data (published weeks only)
pub async fn get_activity(
    State(state): State<AppState>,
    Path(user_id): Path<Uuid>,
) -> AppResult<Json<Vec<ActivityPoint>>> {
    // Aggregate completed_count / target_count per published week
    let rows = sqlx::query_as!(
        ActivityPoint,
        r#"
        SELECT
            wp.week_start_date,
            SUM(wp.completed_count)::int AS completed,
            SUM(wp.target_count)::int    AS target
        FROM weekly_progress wp
        WHERE wp.user_id = $1 AND wp.is_published = true
        GROUP BY wp.week_start_date
        ORDER BY wp.week_start_date
        "#,
        user_id
    )
    .fetch_all(&state.db)
    .await?;

    Ok(Json(rows))
}

#[derive(Debug, serde::Serialize, sqlx::FromRow)]
pub struct ActivityPoint {
    pub week_start_date: chrono::NaiveDate,
    pub completed: Option<i32>,
    pub target: Option<i32>,
}

/// GET /users/:id/week?date=YYYY-MM-DD — per-goal breakdown for a published week
pub async fn get_week_goals(
    State(state): State<AppState>,
    Path(user_id): Path<Uuid>,
    Query(params): Query<WeekQuery>,
) -> AppResult<Json<Vec<WeekGoalItem>>> {
    let rows = sqlx::query_as!(
        WeekGoalItem,
        r#"
        SELECT
            CASE WHEN g.visibility::text = 'public' THEN g.title ELSE NULL END AS goal_title,
            wp.completed_count,
            wp.target_count
        FROM weekly_progress wp
        JOIN goals g ON g.id = wp.goal_id
        WHERE wp.user_id = $1
          AND wp.week_start_date = $2
          AND wp.is_published = true
        ORDER BY g.visibility::text DESC, g.title
        "#,
        user_id,
        params.date,
    )
    .fetch_all(&state.db)
    .await?;

    Ok(Json(rows))
}
