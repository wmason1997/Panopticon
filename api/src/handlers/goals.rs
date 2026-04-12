use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    Json,
};
use serde::Deserialize as QueryDeserialize;

#[derive(Debug, QueryDeserialize)]
pub struct GoalsQuery {
    pub archived: Option<bool>,
}
use uuid::Uuid;

use crate::{
    auth::session::AuthUser,
    error::{AppError, AppResult},
    models::goal::{CreateGoalRequest, Goal, GoalType, GoalVisibility, UpdateGoalRequest},
    utils::current_week_start,
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

    // Pass enum values as strings and cast in SQL so SQLx infers TEXT params,
    // avoiding the "no built-in mapping for custom enum" compile error.
    let goal = sqlx::query_as!(
        Goal,
        r#"
        INSERT INTO goals (id, user_id, goal_type, title, target_count, visibility, week_start_date)
        VALUES (gen_random_uuid(), $1, $2::text::goal_type, $3, $4, $5::text::goal_visibility, $6)
        RETURNING id, user_id,
                  goal_type     as "goal_type: GoalType",
                  title, target_count,
                  visibility    as "visibility: GoalVisibility",
                  is_archived, week_start_date,
                  created_at, updated_at
        "#,
        user.id,
        goal_type_str(&req.goal_type),
        req.title.trim(),
        target_count,
        visibility_str(&visibility),
        req.week_start_date,
    )
    .fetch_one(&state.db)
    .await?;

    Ok((StatusCode::CREATED, Json(goal)))
}

/// GET /goals — active recurring + current-week goals.
/// Pass ?archived=true to get archived recurring goals instead.
pub async fn list_goals(
    State(state): State<AppState>,
    AuthUser(user): AuthUser,
    Query(params): Query<GoalsQuery>,
) -> AppResult<Json<Vec<Goal>>> {
    let week_start = current_week_start(user.week_start);

    let goals = if params.archived.unwrap_or(false) {
        // Archived recurring goals only (weekly goals expire, no need to archive)
        sqlx::query_as!(
            Goal,
            r#"
            SELECT id, user_id,
                   goal_type  as "goal_type: GoalType",
                   title, target_count,
                   visibility as "visibility: GoalVisibility",
                   is_archived, week_start_date,
                   created_at, updated_at
            FROM goals
            WHERE user_id = $1
              AND is_archived = true
              AND goal_type = 'recurring'
            ORDER BY updated_at DESC
            "#,
            user.id,
        )
        .fetch_all(&state.db)
        .await?
    } else {
        sqlx::query_as!(
            Goal,
            r#"
            SELECT id, user_id,
                   goal_type  as "goal_type: GoalType",
                   title, target_count,
                   visibility as "visibility: GoalVisibility",
                   is_archived, week_start_date,
                   created_at, updated_at
            FROM goals
            WHERE user_id = $1
              AND is_archived = false
              AND (
                  goal_type = 'recurring'
                  OR (goal_type = 'weekly' AND week_start_date = $2)
              )
            ORDER BY created_at ASC
            "#,
            user.id,
            week_start,
        )
        .fetch_all(&state.db)
        .await?
    };

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
            visibility   = COALESCE($3::text::goal_visibility, visibility),
            is_archived  = COALESCE($4, is_archived),
            updated_at   = NOW()
        WHERE id = $5 AND user_id = $6
        RETURNING id, user_id,
                  goal_type  as "goal_type: GoalType",
                  title, target_count,
                  visibility as "visibility: GoalVisibility",
                  is_archived, week_start_date,
                  created_at, updated_at
        "#,
        req.title.as_deref(),
        req.target_count,
        req.visibility.as_ref().map(|v| visibility_str(v)),
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

fn goal_type_str(t: &GoalType) -> &'static str {
    match t {
        GoalType::Recurring => "recurring",
        GoalType::Weekly => "weekly",
    }
}

fn visibility_str(v: &GoalVisibility) -> &'static str {
    match v {
        GoalVisibility::Public => "public",
        GoalVisibility::Private => "private",
    }
}
