use std::net::SocketAddr;

use anyhow::Result;
use oauth2::basic::BasicClient;
use sqlx::PgPool;
use tower_http::{cors::CorsLayer, trace::TraceLayer};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt, EnvFilter};

mod auth;
mod config;
mod db;
mod error;
mod handlers;
mod models;
mod routes;

#[derive(Clone)]
pub struct AppState {
    pub db: PgPool,
    pub config: config::Config,
    pub oauth_client: BasicClient,
}

impl AsRef<PgPool> for AppState {
    fn as_ref(&self) -> &PgPool {
        &self.db
    }
}

#[tokio::main]
async fn main() -> Result<()> {
    // Load .env if present (ignored in production where vars are injected)
    let _ = dotenvy::dotenv();

    tracing_subscriber::registry()
        .with(EnvFilter::try_from_default_env().unwrap_or_else(|_| "info".into()))
        .with(tracing_subscriber::fmt::layer())
        .init();

    let config = config::Config::from_env()?;

    let db = db::connect(&config.database_url).await?;
    tracing::info!("connected to database");

    db::run_migrations(&db).await?;
    tracing::info!("migrations applied");

    let oauth_client = auth::google::build_oauth_client(&config)?;

    let state = AppState {
        db,
        config: config.clone(),
        oauth_client,
    };

    let cors = CorsLayer::new()
        .allow_origin(
            config
                .frontend_url
                .parse::<axum::http::HeaderValue>()
                .expect("invalid FRONTEND_URL"),
        )
        .allow_methods([
            axum::http::Method::GET,
            axum::http::Method::POST,
            axum::http::Method::PATCH,
            axum::http::Method::DELETE,
        ])
        .allow_headers([axum::http::header::CONTENT_TYPE])
        .allow_credentials(true);

    let app = routes::build_router(state)
        .layer(TraceLayer::new_for_http())
        .layer(cors);

    let addr: SocketAddr = format!("{}:{}", config.host, config.port).parse()?;
    tracing::info!("listening on {addr}");

    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}
