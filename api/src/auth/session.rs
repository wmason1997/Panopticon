use axum::{extract::FromRequestParts, http::request::Parts};
use axum_extra::extract::CookieJar;
use sqlx::PgPool;
use uuid::Uuid;

use crate::{error::AppError, models::user::User};

pub const SESSION_COOKIE: &str = "session_id";

/// Extractor that resolves the current authenticated user from the session cookie.
/// Returns `AppError::Unauthorized` if the cookie is missing, invalid, or expired.
pub struct AuthUser(pub User);

#[axum::async_trait]
impl<S> FromRequestParts<S> for AuthUser
where
    S: Send + Sync + AsRef<PgPool>,
{
    type Rejection = AppError;

    async fn from_request_parts(parts: &mut Parts, state: &S) -> Result<Self, Self::Rejection> {
        let jar = CookieJar::from_request_parts(parts, state)
            .await
            .map_err(|_| AppError::Unauthorized)?;

        let session_id = jar
            .get(SESSION_COOKIE)
            .and_then(|c| Uuid::parse_str(c.value()).ok())
            .ok_or(AppError::Unauthorized)?;

        let pool: &PgPool = state.as_ref();

        let user = sqlx::query_as!(
            User,
            r#"
            SELECT u.id, u.email, u.display_name, u.avatar_url,
                   u.timezone, u.publish_time, u.week_start,
                   u.oauth_provider, u.oauth_provider_id,
                   u.subscription_tier as "subscription_tier: _",
                   u.leaderboard_opt_in,
                   u.created_at, u.updated_at
            FROM sessions s
            JOIN users u ON u.id = s.user_id
            WHERE s.id = $1 AND s.expires_at > NOW()
            "#,
            session_id
        )
        .fetch_optional(pool)
        .await?
        .ok_or(AppError::Unauthorized)?;

        Ok(AuthUser(user))
    }
}
