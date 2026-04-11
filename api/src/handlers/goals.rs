use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
};
use chrono::Utc;
use uuid::Uuid;

use crate::{
    auth::session::AuthUser,
    error::{AppError, AppResult},
    models::goal::{CreateGoalRequest, Goal, GoalType, GoalVisibility, UpdateGoalRequest},
    AppState,
};

/// POST /goals
pub async fn create_goal(
    State(state): State<AppState>,
    AuthUser(user): AuthUser,
    Json(req): Json<CreateGoalRequest>,
) -> AppResult<(StatusCode, Json<Goal>)> {
    if req.title.trim().is_empty() {
        return Err(AppError::BadRequest("title cannot be empty".into()));
    }

    if req.goal_type == GoalType::Weekly && req.week_start_date.is_none() {
        return Err(AppError::BadRequest(
            "week_start_date is required for weekly goals".into(),
        ));
    }

    let target_count = req.target_count.unwrap_or(1).max(1);
    let visibility = req.visibility.unwrap_or(GoalVisibility::Public);

    let goal = sqlx::query_as!(
        Goal,
        r#"
        INSERT INTO goals (id, user_id, goal_type, title, target_count, visibility, week_start_date)
        VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6)
        RETURNING id, user_id,
                  goal_type as "goal_type: _",
                  title, target_count,
                  visibility as "visibility: _",
                  is_archived, week_start_date,
                  created_at, updated_at
        "#,
        user.id,
        goal_type_to_str(&req.goal_type),
        req.title.trim(),
        target_count,
        visibility_to_str(&visibility),
        req.week_start_date,
    )
    .fetch_one(&state.db)
    .await?;

    Ok((StatusCode::CREATED, Json(goal)))
}

/// GET /goals — list my goals (recurring + current week's weekly goals)
pub async fn list_goals(
    State(state): State<AppState>,
    AuthUser(user): AuthUser,
) -> AppResult<Json<Vec<Goal>>> {
    let today = Utc::now().date_naive();

    let goals = sqlx::query_as!(
        Goal,
        r#"
        SELECT id, user_id,
               goal_type as "goal_type: _",
               title, target_count,
               visibility as "visibility: _",
               is_archived, week_start_date,
               created_at, updated_at
        FROM goals
        WHERE user_id = $1
          AND is_archived = false
          AND (
              goal_type = 'recurring'
              OR (goal_type = 'weekly' AND week_start_date >= $2 - INTERVAL '6 days' AND week_start_date <= $2)
          )
        ORDER BY created_at ASC
        "#,
        user.id,
        today,
    )
    .fetch_all(&state.db)
    .await?;

    Ok(Json(goals))
}

/// PATCH /goals/:id
pub async fn update_goal(
    State(state): State<AppState>,
    AuthUser(user): AuthUser,
    Path(goal_id): Path<Uuid>,
    Json(req): Json<UpdateGoalRequest>,
) -> AppResult<Json<Goal>> {
    let goal = sqlx::query_as!(
        Goal,
        r#"
        UPDATE goals SET
            title        = COALESCE($1, title),
            target_count = COALESCE($2, target_count),
            visibility   = COALESCE($3::goal_visibility, visibility),
            is_archived  = COALESCE($4, is_archived),
            updated_at   = NOW()
        WHERE id = $5 AND user_id = $6
        RETURNING id, user_id,
                  goal_type as "goal_type: _",
                  title, target_count,
                  visibility as "visibility: _",
                  is_archived, week_start_date,
                  created_at, updated_at
        "#,
        req.title.as_deref(),
        req.target_count,
        req.visibility.as_ref().map(|v| visibility_to_str(v)),
        req.is_archived,
        goal_id,
        user.id,
    )
    .fetch_optional(&state.db)
    .await?
    .ok_or(AppError::NotFound)?;

    Ok(Json(goal))
}

/// DELETE /goals/:id
pub async fn delete_goal(
    State(state): State<AppState>,
    AuthUser(user): AuthUser,
    Path(goal_id): Path<Uuid>,
) -> AppResult<StatusCode> {
    let result = sqlx::query!(
        "DELETE FROM goals WHERE id = $1 AND user_id = $2",
        goal_id,
        user.id,
    )
    .execute(&state.db)
    .await?;

    if result.rows_affected() == 0 {
        return Err(AppError::NotFound);
    }

    Ok(StatusCode::NO_CONTENT)
}

fn goal_type_to_str(t: &GoalType) -> &'static str {
    match t {
        GoalType::Recurring => "recurring",
        GoalType::Weekly => "weekly",
    }
}

fn visibility_to_str(v: &GoalVisibility) -> &'static str {
    match v {
        GoalVisibility::Public => "public",
        GoalVisibility::Private => "private",
    }
}
