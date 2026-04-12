use axum::{
    http::StatusCode,
    routing::{delete, get, patch, post},
    Router,
};

use crate::{
    handlers::{auth, follows, goals, leaderboard, notes, progress, publish, users},
    AppState,
};

pub fn build_router(state: AppState) -> Router {
    Router::new()
        // Health check (no auth — used by Railway)
        .route("/health", get(|| async { StatusCode::OK }))
        // Auth
        .route("/auth/google", get(auth::google_login))
        .route("/auth/google/callback", get(auth::google_callback))
        .route("/auth/session", delete(auth::logout))
        // Users
        .route("/users/me", get(users::get_me).patch(users::update_me))
        .route("/users/me/feed", get(follows::get_feed))
        .route("/users/search", get(users::search_users))
        .route("/users/:id", get(users::get_user))
        .route("/users/:id/activity", get(users::get_activity))
        .route("/users/:id/notes", get(notes::list_public_notes))
        // Publish
        .route("/publish/now", post(publish::publish_now))
        // Goals
        .route("/goals", get(goals::list_goals).post(goals::create_goal))
        .route("/goals/:id", patch(goals::update_goal).delete(goals::delete_goal))
        // Progress — POST and PATCH share the same /:id path; the handler
        // interprets the id as goal_id (POST) or progress_id (PATCH).
        .route("/progress", get(progress::get_progress))
        .route("/progress/:id", post(progress::log_progress).patch(progress::update_progress))
        // Notes
        .route("/notes", get(notes::list_notes).post(notes::create_note))
        .route("/notes/:id", patch(notes::update_note).delete(notes::delete_note))
        // Follows — static segments (/following, /followers) must be registered
        // before the dynamic /:user_id to avoid matchit conflicts.
        .route("/follows/following", get(follows::list_following))
        .route("/follows/followers", get(follows::list_followers))
        .route("/follows/:user_id", post(follows::follow_user).delete(follows::unfollow_user))
        // Leaderboard
        .route("/leaderboard", get(leaderboard::get_leaderboard))
        .route("/leaderboard/opt-in", post(leaderboard::opt_in).delete(leaderboard::opt_out))
        .with_state(state)
}
