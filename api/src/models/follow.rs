use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Follow {
    pub follower_id: Uuid,
    pub followed_id: Uuid,
    pub created_at: DateTime<Utc>,
}

/// Lightweight user summary used in follower/following lists and feeds
#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct UserSummary {
    pub id: Uuid,
    pub display_name: String,
    pub avatar_url: Option<String>,
}
