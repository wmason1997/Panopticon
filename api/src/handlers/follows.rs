use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
};
use uuid::Uuid;

use crate::{
    auth::session::AuthUser,
    error::{AppError, AppResult},
    models::follow::UserSummary,
    AppState,
};

/// POST /follows/:user_id — follow a user
pub async fn follow_user(
    State(state): State<AppState>,
    AuthUser(user): AuthUser,
    Path(target_id): Path<Uuid>,
) -> AppResult<StatusCode> {
    if user.id == target_id {
        return Err(AppError::BadRequest("cannot follow yourself".into()));
    }

    // Ensure target exists
    sqlx::query!("SELECT id FROM users WHERE id = $1", target_id)
        .fetch_optional(&state.db)
        .await?
        .ok_or(AppError::NotFound)?;

    sqlx::query!(
        r#"
        INSERT INTO follows (follower_id, followed_id)
        VALUES ($1, $2)
        ON CONFLICT DO NOTHING
        "#,
        user.id,
        target_id,
    )
    .execute(&state.db)
    .await?;

    Ok(StatusCode::NO_CONTENT)
}

/// DELETE /follows/:user_id — unfollow
pub async fn unfollow_user(
    State(state): State<AppState>,
    AuthUser(user): AuthUser,
    Path(target_id): Path<Uuid>,
) -> AppResult<StatusCode> {
    sqlx::query!(
        "DELETE FROM follows WHERE follower_id = $1 AND followed_id = $2",
        user.id,
        target_id,
    )
    .execute(&state.db)
    .await?;

    Ok(StatusCode::NO_CONTENT)
}

/// GET /follows/following — list users I follow
pub async fn list_following(
    State(state): State<AppState>,
    AuthUser(user): AuthUser,
) -> AppResult<Json<Vec<UserSummary>>> {
    let users = sqlx::query_as!(
        UserSummary,
        r#"
        SELECT u.id, u.display_name, u.avatar_url
        FROM follows f
        JOIN users u ON u.id = f.followed_id
        WHERE f.follower_id = $1
        ORDER BY f.created_at DESC
        "#,
        user.id,
    )
    .fetch_all(&state.db)
    .await?;

    Ok(Json(users))
}

/// GET /follows/followers — list users who follow me
pub async fn list_followers(
    State(state): State<AppState>,
    AuthUser(user): AuthUser,
) -> AppResult<Json<Vec<UserSummary>>> {
    let users = sqlx::query_as!(
        UserSummary,
        r#"
        SELECT u.id, u.display_name, u.avatar_url
        FROM follows f
        JOIN users u ON u.id = f.follower_id
        WHERE f.followed_id = $1
        ORDER BY f.created_at DESC
        "#,
        user.id,
    )
    .fetch_all(&state.db)
    .await?;

    Ok(Json(users))
}

/// GET /users/me/feed — published activity from users I follow
pub async fn get_feed(
    State(state): State<AppState>,
    AuthUser(user): AuthUser,
) -> AppResult<Json<Vec<FeedItem>>> {
    let items = sqlx::query_as!(
        FeedItem,
        r#"
        SELECT
            u.id        AS user_id,
            u.display_name,
            u.avatar_url,
            wp.week_start_date,
            SUM(wp.completed_count)::int AS completed,
            SUM(wp.target_count)::int    AS target
        FROM follows f
        JOIN users u          ON u.id = f.followed_id
        JOIN weekly_progress wp ON wp.user_id = u.id AND wp.is_published = true
        WHERE f.follower_id = $1
        GROUP BY u.id, u.display_name, u.avatar_url, wp.week_start_date
        ORDER BY wp.week_start_date DESC, u.display_name ASC
        LIMIT 200
        "#,
        user.id,
    )
    .fetch_all(&state.db)
    .await?;

    Ok(Json(items))
}

#[derive(Debug, serde::Serialize, sqlx::FromRow)]
pub struct FeedItem {
    pub user_id: Uuid,
    pub display_name: String,
    pub avatar_url: Option<String>,
    pub week_start_date: chrono::NaiveDate,
    pub completed: Option<i32>,
    pub target: Option<i32>,
}
