//! Publish cycle scheduler.
//!
//! Runs in a loop, checking every 60 seconds for pending publish_queue entries
//! whose scheduled_publish_at has arrived. For each batch it:
//!   1. Marks the corresponding weekly_progress rows as is_published = true.
//!   2. Stamps published_at on the queue entries.

use anyhow::Result;
use sqlx::PgPool;
use tokio::time::{sleep, Duration};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt, EnvFilter};

#[tokio::main]
async fn main() -> Result<()> {
    let _ = dotenvy::dotenv();

    tracing_subscriber::registry()
        .with(EnvFilter::try_from_default_env().unwrap_or_else(|_| "info".into()))
        .with(tracing_subscriber::fmt::layer())
        .init();

    let database_url = std::env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    let pool = sqlx::postgres::PgPoolOptions::new()
        .max_connections(5)
        .connect(&database_url)
        .await?;

    tracing::info!("scheduler started — polling every 60 seconds");

    loop {
        match publish_pending(&pool).await {
            Ok(count) if count > 0 => tracing::info!("published {count} progress entries"),
            Ok(_) => {}
            Err(e) => tracing::error!("publish cycle error: {e:#}"),
        }
        sleep(Duration::from_secs(60)).await;
    }
}

async fn publish_pending(pool: &PgPool) -> Result<u64> {
    // Use a CTE to atomically claim and publish in one round-trip
    let result = sqlx::query!(
        r#"
        WITH due AS (
            SELECT id, weekly_progress_id
            FROM publish_queue
            WHERE published_at IS NULL
              AND scheduled_publish_at <= NOW()
            FOR UPDATE SKIP LOCKED
        ),
        mark_progress AS (
            UPDATE weekly_progress wp
            SET is_published = true, updated_at = NOW()
            FROM due
            WHERE wp.id = due.weekly_progress_id
        )
        UPDATE publish_queue pq
        SET published_at = NOW()
        FROM due
        WHERE pq.id = due.id
        "#
    )
    .execute(pool)
    .await?;

    Ok(result.rows_affected())
}
