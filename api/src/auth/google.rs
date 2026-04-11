use anyhow::Result;
use oauth2::{
    basic::BasicClient, AuthUrl, ClientId, ClientSecret, RedirectUrl, TokenUrl,
};
use serde::Deserialize;

use crate::config::Config;

pub fn build_oauth_client(config: &Config) -> Result<BasicClient> {
    let client = BasicClient::new(
        ClientId::new(config.google_client_id.clone()),
        Some(ClientSecret::new(config.google_client_secret.clone())),
        AuthUrl::new("https://accounts.google.com/o/oauth2/v2/auth".into())?,
        Some(TokenUrl::new(
            "https://oauth2.googleapis.com/token".into(),
        )?),
    )
    .set_redirect_uri(RedirectUrl::new(config.google_redirect_uri.clone())?);

    Ok(client)
}

#[derive(Debug, Deserialize)]
pub struct GoogleUserInfo {
    pub sub: String,
    pub email: String,
    pub name: String,
    pub picture: Option<String>,
}

pub async fn fetch_user_info(access_token: &str) -> Result<GoogleUserInfo> {
    let client = reqwest::Client::new();
    let info = client
        .get("https://www.googleapis.com/oauth2/v3/userinfo")
        .bearer_auth(access_token)
        .send()
        .await?
        .error_for_status()?
        .json::<GoogleUserInfo>()
        .await?;
    Ok(info)
}
