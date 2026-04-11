use axum::{
    routing::{delete, get, patch, post},
    Router,
};

use crate::{
    handlers::{auth, follows, goals, leaderboard, notes, progress, users},
    AppState,
};

pub fn build_router(state: AppState) -> Router {
    Router::new()
        // Auth
        .route("/auth/google", get(auth::google_login))
        .route("/auth/google/callback", get(auth::google_callback))
        .route("/auth/session", delete(auth::logout))
        // Users
        .route("/users/me", get(users::get_me))
        .route("/users/me", patch(users::update_me))
        .route("/users/me/feed", get(follows::get_feed))
        .route("/users/:id", get(users::get_user))
        .route("/users/:id/activity", get(users::get_activity))
        // Goals
        .route("/goals", post(goals::create_goal))
        .route("/goals", get(goals::list_goals))
        .route("/goals/:id", patch(goals::update_goal))
        .route("/goals/:id", delete(goals::delete_goal))
        // Progress
        .route("/progress/:goal_id", post(progress::log_progress))
        .route("/progress", get(progress::get_progress))
        .route("/progress/:id", patch(progress::update_progress))
        // Notes
        .route("/notes", post(notes::create_note))
        .route("/notes", get(notes::list_notes))
        .route("/notes/:id", patch(notes::update_note))
        .route("/notes/:id", delete(notes::delete_note))
        // Follows
        .route("/follows/:user_id", post(follows::follow_user))
        .route("/follows/:user_id", delete(follows::unfollow_user))
        .route("/follows/following", get(follows::list_following))
        .route("/follows/followers", get(follows::list_followers))
        // Leaderboard
        .route("/leaderboard", get(leaderboard::get_leaderboard))
        .route("/leaderboard/opt-in", post(leaderboard::opt_in))
        .route("/leaderboard/opt-in", delete(leaderboard::opt_out))
        .with_state(state)
}
