use anyhow::{Context, Result};

#[derive(Debug, Clone)]
pub struct Config {
    pub database_url: String,
    pub google_client_id: String,
    pub google_client_secret: String,
    pub google_redirect_uri: String,
    pub session_secret: String,
    pub host: String,
    pub port: u16,
    pub frontend_url: String,
}

impl Config {
    pub fn from_env() -> Result<Self> {
        Ok(Self {
            database_url: required("DATABASE_URL")?,
            google_client_id: required("GOOGLE_CLIENT_ID")?,
            google_client_secret: required("GOOGLE_CLIENT_SECRET")?,
            google_redirect_uri: required("GOOGLE_REDIRECT_URI")?,
            session_secret: required("SESSION_SECRET")?,
            host: std::env::var("HOST").unwrap_or_else(|_| "0.0.0.0".into()),
            port: std::env::var("PORT")
                .unwrap_or_else(|_| "3001".into())
                .parse()
                .context("PORT must be a valid port number")?,
            frontend_url: std::env::var("FRONTEND_URL")
                .unwrap_or_else(|_| "http://localhost:3000".into()),
        })
    }
}

fn required(key: &str) -> Result<String> {
    std::env::var(key).with_context(|| format!("missing required env var: {key}"))
}
