use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    Json,
};
use serde::Deserialize;
use uuid::Uuid;

use crate::{
    auth::session::AuthUser,
    error::{AppError, AppResult},
    models::{
        note::{CreateNoteRequest, Note, UpdateNoteRequest},
        user::SubscriptionTier,
    },
    AppState,
};

#[derive(Debug, Deserialize)]
pub struct NotesQuery {
    pub progress_id: Uuid,
}

/// GET /notes?progress_id=X
pub async fn list_notes(
    State(state): State<AppState>,
    AuthUser(user): AuthUser,
    Query(query): Query<NotesQuery>,
) -> AppResult<Json<Vec<Note>>> {
    let notes = sqlx::query_as!(
        Note,
        r#"
        SELECT n.id, n.weekly_progress_id, n.user_id, n.content, n.is_public, n.created_at, n.updated_at
        FROM notes n
        JOIN weekly_progress wp ON wp.id = n.weekly_progress_id
        WHERE n.weekly_progress_id = $1
          AND wp.user_id = $2
        ORDER BY n.created_at ASC
        "#,
        query.progress_id,
        user.id,
    )
    .fetch_all(&state.db)
    .await?;

    Ok(Json(notes))
}

/// POST /notes
pub async fn create_note(
    State(state): State<AppState>,
    AuthUser(user): AuthUser,
    Json(req): Json<CreateNoteRequest>,
) -> AppResult<(StatusCode, Json<Note>)> {
    if req.content.trim().is_empty() {
        return Err(AppError::BadRequest("content cannot be empty".into()));
    }

    // Verify the progress entry belongs to this user
    sqlx::query!(
        "SELECT id FROM weekly_progress WHERE id = $1 AND user_id = $2",
        req.weekly_progress_id,
        user.id,
    )
    .fetch_optional(&state.db)
    .await?
    .ok_or(AppError::NotFound)?;

    // Public notes are a premium feature
    let is_public = req.is_public.unwrap_or(false);
    if is_public && user.subscription_tier != SubscriptionTier::Premium {
        return Err(AppError::Forbidden);
    }

    let note = sqlx::query_as!(
        Note,
        r#"
        INSERT INTO notes (id, weekly_progress_id, user_id, content, is_public)
        VALUES (gen_random_uuid(), $1, $2, $3, $4)
        RETURNING id, weekly_progress_id, user_id, content, is_public, created_at, updated_at
        "#,
        req.weekly_progress_id,
        user.id,
        req.content.trim(),
        is_public,
    )
    .fetch_one(&state.db)
    .await?;

    Ok((StatusCode::CREATED, Json(note)))
}

/// PATCH /notes/:id
pub async fn update_note(
    State(state): State<AppState>,
    AuthUser(user): AuthUser,
    Path(note_id): Path<Uuid>,
    Json(req): Json<UpdateNoteRequest>,
) -> AppResult<Json<Note>> {
    // Public notes are a premium feature
    if let Some(true) = req.is_public {
        if user.subscription_tier != SubscriptionTier::Premium {
            return Err(AppError::Forbidden);
        }
    }

    let note = sqlx::query_as!(
        Note,
        r#"
        UPDATE notes SET
            content    = COALESCE($1, content),
            is_public  = COALESCE($2, is_public),
            updated_at = NOW()
        WHERE id = $3 AND user_id = $4
        RETURNING id, weekly_progress_id, user_id, content, is_public, created_at, updated_at
        "#,
        req.content.as_deref(),
        req.is_public,
        note_id,
        user.id,
    )
    .fetch_optional(&state.db)
    .await?
    .ok_or(AppError::NotFound)?;

    Ok(Json(note))
}

/// DELETE /notes/:id
pub async fn delete_note(
    State(state): State<AppState>,
    AuthUser(user): AuthUser,
    Path(note_id): Path<Uuid>,
) -> AppResult<StatusCode> {
    let result = sqlx::query!(
        "DELETE FROM notes WHERE id = $1 AND user_id = $2",
        note_id,
        user.id,
    )
    .execute(&state.db)
    .await?;

    if result.rows_affected() == 0 {
        return Err(AppError::NotFound);
    }

    Ok(StatusCode::NO_CONTENT)
}
