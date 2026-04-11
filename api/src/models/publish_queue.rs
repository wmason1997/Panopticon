use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct PublishQueueEntry {
    pub id: Uuid,
    pub user_id: Uuid,
    pub weekly_progress_id: Uuid,
    /// JSON snapshot of what changed (completed_count, etc.)
    pub change_payload: Value,
    pub scheduled_publish_at: DateTime<Utc>,
    /// Null until the scheduler has processed this entry
    pub published_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
}
