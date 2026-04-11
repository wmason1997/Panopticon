use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct User {
    pub id: Uuid,
    pub email: String,
    pub display_name: String,
    pub avatar_url: Option<String>,
    /// IANA timezone string, e.g. "America/New_York"
    pub timezone: String,
    /// "HH:MM" in the user's local timezone — when published changes become visible
    pub publish_time: String,
    /// Day of week the user's week starts: 0=Sun, 1=Mon, …, 6=Sat
    pub week_start: i16,
    pub oauth_provider: String,
    pub oauth_provider_id: String,
    pub subscription_tier: SubscriptionTier,
    pub leaderboard_opt_in: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, sqlx::Type)]
#[sqlx(type_name = "subscription_tier", rename_all = "lowercase")]
#[serde(rename_all = "lowercase")]
pub enum SubscriptionTier {
    Free,
    Premium,
}

/// Public-facing profile (excludes private fields like email, oauth details)
#[derive(Debug, Serialize)]
pub struct PublicProfile {
    pub id: Uuid,
    pub display_name: String,
    pub avatar_url: Option<String>,
    pub subscription_tier: SubscriptionTier,
    pub leaderboard_opt_in: bool,
    pub created_at: DateTime<Utc>,
}

impl From<User> for PublicProfile {
    fn from(u: User) -> Self {
        Self {
            id: u.id,
            display_name: u.display_name,
            avatar_url: u.avatar_url,
            subscription_tier: u.subscription_tier,
            leaderboard_opt_in: u.leaderboard_opt_in,
            created_at: u.created_at,
        }
    }
}

#[derive(Debug, Deserialize)]
pub struct UpdateProfileRequest {
    pub display_name: Option<String>,
    pub timezone: Option<String>,
    pub publish_time: Option<String>,
    pub week_start: Option<i16>,
}
