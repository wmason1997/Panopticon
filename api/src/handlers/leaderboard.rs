use axum::{extract::State, http::StatusCode, Json};
use serde::Serialize;
use uuid::Uuid;

use crate::{
    auth::session::AuthUser,
    error::AppResult,
    AppState,
};

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct LeaderboardEntry {
    pub user_id: Uuid,
    pub display_name: String,
    pub avatar_url: Option<String>,
    /// Consecutive weeks at ≥80% completion
    pub current_streak: i64,
    /// Average completion % over all tracked weeks
    pub lifetime_avg_pct: Option<f64>,
}

/// GET /leaderboard — opt-in streak/consistency leaderboard
pub async fn get_leaderboard(
    State(state): State<AppState>,
) -> AppResult<Json<Vec<LeaderboardEntry>>> {
    let entries = sqlx::query_as!(
        LeaderboardEntry,
        r#"
        WITH weekly_completion AS (
            SELECT
                wp.user_id,
                wp.week_start_date,
                SUM(wp.completed_count)::float / NULLIF(SUM(wp.target_count)::float, 0) AS pct
            FROM weekly_progress wp
            WHERE wp.is_published = true
            GROUP BY wp.user_id, wp.week_start_date
        ),
        streaks AS (
            SELECT
                user_id,
                COUNT(*) FILTER (WHERE pct >= 0.8) AS streak_weeks
            FROM (
                SELECT
                    user_id,
                    week_start_date,
                    pct,
                    ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY week_start_date DESC) AS rn,
                    ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY week_start_date DESC) -
                    ROW_NUMBER() OVER (PARTITION BY user_id, (pct >= 0.8)::int ORDER BY week_start_date DESC) AS grp
                FROM weekly_completion
            ) sub
            WHERE grp = 0 AND pct >= 0.8
            GROUP BY user_id
        ),
        lifetime AS (
            SELECT user_id, AVG(pct) * 100 AS lifetime_avg_pct
            FROM weekly_completion
            GROUP BY user_id
        )
        SELECT
            u.id         AS user_id,
            u.display_name,
            u.avatar_url,
            COALESCE(s.streak_weeks, 0) AS "current_streak!: i64",
            l.lifetime_avg_pct
        FROM users u
        JOIN lifetime l    ON l.user_id = u.id
        LEFT JOIN streaks s ON s.user_id = u.id
        WHERE u.leaderboard_opt_in = true
        ORDER BY s.streak_weeks DESC NULLS LAST, l.lifetime_avg_pct DESC NULLS LAST
        LIMIT 100
        "#,
    )
    .fetch_all(&state.db)
    .await?;

    Ok(Json(entries))
}

/// POST /leaderboard/opt-in
pub async fn opt_in(
    State(state): State<AppState>,
    AuthUser(user): AuthUser,
) -> AppResult<StatusCode> {
    sqlx::query!(
        "UPDATE users SET leaderboard_opt_in = true, updated_at = NOW() WHERE id = $1",
        user.id
    )
    .execute(&state.db)
    .await?;

    Ok(StatusCode::NO_CONTENT)
}

/// DELETE /leaderboard/opt-in
pub async fn opt_out(
    State(state): State<AppState>,
    AuthUser(user): AuthUser,
) -> AppResult<StatusCode> {
    sqlx::query!(
        "UPDATE users SET leaderboard_opt_in = false, updated_at = NOW() WHERE id = $1",
        user.id
    )
    .execute(&state.db)
    .await?;

    Ok(StatusCode::NO_CONTENT)
}
