use axum::{
    extract::{Query, State},
    response::{IntoResponse, Redirect},
};
use axum_extra::extract::cookie::{Cookie, CookieJar, SameSite};
use chrono::Utc;
use oauth2::{
    reqwest::async_http_client, AuthorizationCode, CsrfToken, Scope,
    TokenResponse,
};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::{
    auth::{google::fetch_user_info, session::SESSION_COOKIE},
    error::{AppError, AppResult},
    AppState,
};

pub async fn google_login(State(state): State<AppState>) -> impl IntoResponse {
    let (auth_url, _csrf_token) = state
        .oauth_client
        .authorize_url(CsrfToken::new_random)
        .add_scope(Scope::new("openid".into()))
        .add_scope(Scope::new("email".into()))
        .add_scope(Scope::new("profile".into()))
        .url();

    // TODO: store csrf_token in a short-lived cookie for CSRF validation
    Redirect::to(auth_url.as_str())
}

#[derive(Debug, Deserialize)]
pub struct GoogleCallbackParams {
    pub code: String,
    pub state: String,
}

#[derive(Debug, Serialize)]
pub struct AuthResponse {
    pub user_id: Uuid,
    pub display_name: String,
}

pub async fn google_callback(
    State(state): State<AppState>,
    Query(params): Query<GoogleCallbackParams>,
    jar: CookieJar,
) -> AppResult<(CookieJar, Redirect)> {
    // Exchange code for token
    let token = state
        .oauth_client
        .exchange_code(AuthorizationCode::new(params.code))
        .request_async(async_http_client)
        .await
        .map_err(|e| AppError::Internal(anyhow::anyhow!("OAuth token exchange failed: {e}")))?;

    let access_token = token.access_token().secret();
    let user_info = fetch_user_info(access_token)
        .await
        .map_err(|e| AppError::Internal(anyhow::anyhow!("Failed to fetch Google user info: {e}")))?;

    // Upsert user
    let user = sqlx::query!(
        r#"
        INSERT INTO users (id, email, display_name, avatar_url, oauth_provider, oauth_provider_id)
        VALUES (gen_random_uuid(), $1, $2, $3, 'google', $4)
        ON CONFLICT (oauth_provider, oauth_provider_id)
        DO UPDATE SET
            email        = EXCLUDED.email,
            display_name = EXCLUDED.display_name,
            avatar_url   = EXCLUDED.avatar_url,
            updated_at   = NOW()
        RETURNING id
        "#,
        user_info.email,
        user_info.name,
        user_info.picture,
        user_info.sub,
    )
    .fetch_one(&state.db)
    .await?;

    // Create session (30-day expiry)
    let session_id = Uuid::new_v4();
    let expires_at = Utc::now() + chrono::Duration::days(30);

    sqlx::query!(
        "INSERT INTO sessions (id, user_id, expires_at) VALUES ($1, $2, $3)",
        session_id,
        user.id,
        expires_at,
    )
    .execute(&state.db)
    .await?;

    let cookie = Cookie::build((SESSION_COOKIE, session_id.to_string()))
        .http_only(true)
        .secure(true)
        .same_site(SameSite::None)
        .path("/")
        .max_age(time::Duration::days(30))
        .build();

    let updated_jar = jar.add(cookie);
    let redirect_url = format!("{}/dashboard", state.config.frontend_url);

    Ok((updated_jar, Redirect::to(&redirect_url)))
}

pub async fn logout(
    State(state): State<AppState>,
    jar: CookieJar,
) -> AppResult<CookieJar> {
    if let Some(session_cookie) = jar.get(SESSION_COOKIE) {
        if let Ok(session_id) = Uuid::parse_str(session_cookie.value()) {
            sqlx::query!("DELETE FROM sessions WHERE id = $1", session_id)
                .execute(&state.db)
                .await?;
        }
    }

    let removal = Cookie::build((SESSION_COOKIE, ""))
        .path("/")
        .max_age(time::Duration::seconds(0))
        .build();

    Ok(jar.remove(removal))
}
