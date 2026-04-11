use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Goal {
    pub id: Uuid,
    pub user_id: Uuid,
    pub goal_type: GoalType,
    pub title: String,
    /// How many times this goal needs to be completed (default 1)
    pub target_count: i32,
    pub visibility: GoalVisibility,
    pub is_archived: bool,
    /// For weekly goals: the Monday of the target week (ISO date)
    pub week_start_date: Option<chrono::NaiveDate>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, sqlx::Type)]
#[sqlx(type_name = "goal_type", rename_all = "lowercase")]
#[serde(rename_all = "lowercase")]
pub enum GoalType {
    Recurring,
    Weekly,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, sqlx::Type)]
#[sqlx(type_name = "goal_visibility", rename_all = "lowercase")]
#[serde(rename_all = "lowercase")]
pub enum GoalVisibility {
    Public,
    Private,
}

#[derive(Debug, Deserialize)]
pub struct CreateGoalRequest {
    pub goal_type: GoalType,
    pub title: String,
    pub target_count: Option<i32>,
    pub visibility: Option<GoalVisibility>,
    /// Required when goal_type = "weekly"
    pub week_start_date: Option<chrono::NaiveDate>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateGoalRequest {
    pub title: Option<String>,
    pub target_count: Option<i32>,
    pub visibility: Option<GoalVisibility>,
    pub is_archived: Option<bool>,
}
