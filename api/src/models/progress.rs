use chrono::{DateTime, NaiveDate, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct WeeklyProgress {
    pub id: Uuid,
    pub goal_id: Uuid,
    pub user_id: Uuid,
    /// The start of the week (respects user's week_start setting)
    pub week_start_date: NaiveDate,
    pub completed_count: i32,
    /// Snapshot of target_count from the goal at week start
    pub target_count: i32,
    /// Whether this progress has been published (visible to followers)
    pub is_published: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct LogProgressRequest {
    /// How much to increment completed_count by (default 1)
    pub increment: Option<i32>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateProgressRequest {
    pub completed_count: Option<i32>,
}
