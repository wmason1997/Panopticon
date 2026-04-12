use axum::{extract::State, http::StatusCode};

use crate::{
    auth::session::AuthUser,
    error::AppResult,
    AppState,
};

/// POST /publish/now — immediately publish all pending queue entries for the current user.
/// Mirrors the scheduler's CTE logic but scoped to a single user.
pub async fn publish_now(
    State(state): State<AppState>,
    AuthUser(user): AuthUser,
) -> AppResult<StatusCode> {
    sqlx::query!(
        r#"
        WITH due AS (
            SELECT id, weekly_progress_id
            FROM publish_queue
            WHERE published_at IS NULL
              AND user_id = $1
            FOR UPDATE SKIP LOCKED
        ),
        mark_progress AS (
            UPDATE weekly_progress wp
            SET is_published = true, updated_at = NOW()
            FROM due
            WHERE wp.id = due.weekly_progress_id
        )
        UPDATE publish_queue pq
        SET published_at = NOW()
        FROM due
        WHERE pq.id = due.id
        "#,
        user.id,
    )
    .execute(&state.db)
    .await?;

    Ok(StatusCode::NO_CONTENT)
}
