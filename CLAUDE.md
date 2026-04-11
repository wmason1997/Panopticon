# CLAUDE.md — Panopticon

## Overview
Panopticon is a weekly goal-tracking web app that gamifies self-improvement through social accountability. Users set recurring and one-off weekly goals, track completion, and share progress publicly — creating motivation through visibility. Named after Bentham's "all-seeing" prison design: the awareness of being observed drives self-regulation.

**Core insight:** Accountability through visibility. Changes publish at a user-configured time (default: midnight local) so users are protected from revealing exactly *when* they worked on things.

## Architecture

- **Backend:** Rust (Axum) + SQLx + PostgreSQL
- **Frontend:** Next.js (React/TypeScript)
- **Auth:** OAuth2 (Google sign-in) — do not roll custom auth
- **Scheduling:** Cron job or scheduled task for the daily publish cycle
- **Repo structure:** Monorepo (`/api`, `/web`)

## Core Data Model

### Users
- id, email, display_name, avatar_url, timezone (IANA), publish_time (default "00:00"), created_at
- OAuth provider + provider_id for auth
- Subscription tier: free | premium

### Goals
Two types:
- **Recurring:** Persist week over week (e.g., "Run twice this week," "Solve 3 LeetCode problems"). User can archive/delete but they carry forward automatically.
- **Weekly:** One-off goals for a specific week (e.g., "Take nephew to see Santa"). Expire after their week ends.

Fields: id, user_id, type (recurring|weekly), title, target_count (optional, default 1), visibility (public|private — controls whether the goal *text* is shown to others), is_archived, created_at

### WeeklyProgress
Tracks completion per goal per week (weeks are Mon–Sun or user-configured).
Fields: id, goal_id, user_id, week_start_date, completed_count, target_count (snapshot from goal at week start), created_at, updated_at

### Notes
Per-goal, per-week optional notes (e.g., specific LeetCode problem solved, code snippet, date completed).
Fields: id, weekly_progress_id, content (text/markdown), is_public (default false), created_at

### Follows (unidirectional, Strava-style)
Fields: follower_id, followed_id, created_at

### PublishQueue
Tracks pending changes that become visible at the user's configured publish time.
Fields: id, user_id, weekly_progress_id, change_payload (JSON), scheduled_publish_at, published_at (null until published)

## Key Features (MVP)

### Goal Management
- CRUD for recurring and weekly goals
- Recurring goals auto-populate into each new week
- Users can mark goals complete (increment completed_count toward target_count)
- Archive recurring goals to stop them from carrying forward

### Publish Cycle
- All progress updates are **private** until the user's configured publish time (default: midnight in their timezone)
- A scheduled job runs continuously, checking for users whose publish time has arrived, and flushes their pending changes to public
- Users see their own real-time progress; others see the last-published snapshot
- Future consideration: manual "post now" override

### Profile & Stats
- **Lifetime average:** % of goals completed across all tracked weeks
- **Running average:** % over a user-configurable window (3 months to 1 year)
- **Activity chart:** GitHub-contribution-style heatmap of weekly completion visible to others
- Users choose whether specific goal titles are visible or hidden (percentages are always public)

### Social
- Unidirectional follows (Strava model) — follow anyone, no approval needed
- Feed showing followed users' weekly activity (published snapshots only)
- Leaderboard: **opt-in**, based on **streaks and consistency** (not raw percentage, to avoid easy-goal gaming)
  - Streak = consecutive weeks at ≥80% completion (or similar threshold)
  - Consistency = low variance in completion % over time

### Auth
- Google OAuth2 sign-in
- Session management via secure HTTP-only cookies or JWT (prefer cookies)

## Freemium Model

### Free Tier
- Unlimited recurring and weekly goals
- Basic stats (lifetime average, running average)
- Activity chart
- Social features (follow, feed, leaderboard)
- Notes on goals (private only)

### Premium Tier
- Extended analytics and historical data
- Public notes option
- Custom goal boards / categories
- Data export (CSV/JSON)
- More granular running average windows
- Potentially: private goals beyond a free-tier cap

## API Routes (suggested)

```
POST   /auth/google          — OAuth login
DELETE /auth/session          — Logout

GET    /users/:id             — Public profile + stats
GET    /users/:id/activity    — Activity heatmap data
PATCH  /users/me              — Update profile/settings (timezone, publish_time)
GET    /users/me/feed         — Feed of followed users' activity

POST   /goals                 — Create goal
GET    /goals                 — List my goals (recurring + current week)
PATCH  /goals/:id             — Update goal
DELETE /goals/:id             — Delete/archive goal

POST   /progress/:goal_id     — Log progress (increment)
GET    /progress?week=YYYY-WW — Get week's progress
PATCH  /progress/:id          — Update progress entry

POST   /notes                 — Add note to a weekly progress entry
GET    /notes?progress_id=X   — Get notes for a progress entry
PATCH  /notes/:id             — Update note
DELETE /notes/:id             — Delete note

POST   /follows/:user_id      — Follow a user
DELETE /follows/:user_id      — Unfollow
GET    /follows/following      — List who I follow
GET    /follows/followers      — List who follows me

GET    /leaderboard            — Opt-in streak/consistency leaderboard
POST   /leaderboard/opt-in     — Join leaderboard
DELETE /leaderboard/opt-in     — Leave leaderboard
```

## Tech Decisions & Conventions

- Use `sqlx` with compile-time checked queries where possible
- Use `chrono` and `chrono-tz` for all time handling — store everything as UTC in the DB, convert at the application layer
- Migrations via `sqlx migrate`
- Error handling: use `thiserror` for library errors, `anyhow` in handlers, return proper HTTP status codes
- Serialization: `serde` + `serde_json`
- Frontend state management: React hooks + React Query (TanStack Query) for server state
- Styling: Tailwind CSS
- Testing: `cargo test` for backend, Vitest + React Testing Library for frontend

## Development Workflow

1. Start with DB schema and migrations
2. Build auth flow (Google OAuth)
3. Implement goal CRUD + progress tracking (core loop)
4. Build publish cycle scheduler
5. Add profile stats and activity chart
6. Implement follows and feed
7. Add leaderboard
8. Freemium gating (can be last — build everything, then gate)

## Non-Goals for MVP
- Lock-in periods (too complex, revisit post-launch)
- Mobile app (responsive web first)
- Real-time notifications / push
- Team/group goals
- Goal difficulty ratings or peer validation
