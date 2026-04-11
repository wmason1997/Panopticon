use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Note {
    pub id: Uuid,
    pub weekly_progress_id: Uuid,
    pub user_id: Uuid,
    pub content: String,
    /// Premium feature: allow notes to be visible to followers
    pub is_public: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreateNoteRequest {
    pub weekly_progress_id: Uuid,
    pub content: String,
    pub is_public: Option<bool>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateNoteRequest {
    pub content: Option<String>,
    pub is_public: Option<bool>,
}
