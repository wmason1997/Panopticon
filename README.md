# Panopticon

A weekly goal-tracking web app that gamifies self-improvement through social accountability. Users set recurring and one-off weekly goals, track completion, and share progress publicly — creating motivation through visibility.

Named after Bentham's "all-seeing" prison design: the awareness of being observed drives self-regulation.

**Core insight:** Changes publish at a user-configured time (default: midnight local) so users are protected from revealing exactly *when* they worked on things.

---

## Live

| Service  | URL |
|---|---|
| Frontend | https://panopticon-omnfuk8lf-wmason1997s-projects.vercel.app |
| API      | https://panopticon-production-2b7b.up.railway.app |
| Health   | https://panopticon-production-2b7b.up.railway.app/health |

---

## Stack

| Layer | Technology |
|---|---|
| Backend | Rust · Axum · SQLx |
| Database | PostgreSQL 17 |
| Frontend | Next.js 16 · TypeScript · Tailwind CSS |
| State management | TanStack Query (React Query) |
| Auth | Google OAuth2 · HTTP-only session cookies |
| Scheduling | Standalone Rust binary (`scheduler`) |

---

## Repository structure

```
.
├── api/                    # Rust/Axum backend
│   ├── migrations/         # SQLx migrations (run automatically on startup)
│   ├── src/
│   │   ├── auth/           # Google OAuth flow + session extractor
│   │   ├── handlers/       # Route handlers (auth, users, goals, progress, notes, follows, leaderboard)
│   │   ├── models/         # Typed structs mirroring the DB schema
│   │   ├── bin/
│   │   │   └── scheduler.rs  # Publish-cycle daemon
│   │   ├── config.rs
│   │   ├── db.rs
│   │   ├── error.rs
│   │   ├── main.rs
│   │   └── routes.rs
│   ├── Cargo.toml
│   └── .env.example
├── web/                    # Next.js frontend
│   ├── app/                # App Router pages and layouts
│   ├── lib/
│   │   ├── api.ts          # Typed fetch wrapper
│   │   └── types.ts        # TypeScript mirrors of Rust model types
│   └── .env.local.example
├── docker-compose.yml      # Local Postgres
├── .env.example            # Root-level env vars
└── PROBLEMS.md             # Running log of issues and solutions
```

---

## Getting started

### Prerequisites

- [Rust](https://rustup.rs) (stable)
- [Docker](https://www.docker.com) (for Postgres) or a native Postgres 17 install
- Node.js 20+ and npm

### 1. Install Rust

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source "$HOME/.cargo/env"
```

### 2. Start Postgres

```bash
docker compose up -d
```

### 3. Configure the API

```bash
cp api/.env.example api/.env
```

Open `api/.env` and fill in:

| Variable | Where to get it |
|---|---|
| `GOOGLE_CLIENT_ID` | [Google Cloud Console](https://console.cloud.google.com/apis/credentials) → OAuth 2.0 Client IDs |
| `GOOGLE_CLIENT_SECRET` | Same as above |
| `SESSION_SECRET` | `openssl rand -base64 64` |

The redirect URI registered in Google Cloud Console must match `GOOGLE_REDIRECT_URI` (default: `http://localhost:3001/auth/google/callback`).

### 4. Run the API

Migrations run automatically on startup.

```bash
cd api
cargo run
```

### 5. Run the scheduler (separate terminal)

The scheduler polls every 60 seconds for pending publish-queue entries and flips them to published.

```bash
cd api
cargo run --bin scheduler
```

### 6. Configure and run the frontend

```bash
cp web/.env.local.example web/.env.local
cd web
npm install
npm run dev
```

The app is now running at [http://localhost:3000](http://localhost:3000).

---

## How it works

### Publish cycle

Progress updates are **private until your configured publish time** (default: midnight in your timezone). When you log progress, a row is written to the `publish_queue` table with a `scheduled_publish_at` timestamp. The scheduler daemon runs every 60 seconds, finds due entries, and flips `is_published = true` on the corresponding `weekly_progress` rows. Followers only ever see published snapshots.

### Goals

- **Recurring goals** carry forward automatically week over week. Archive them to stop.
- **Weekly goals** are one-off goals tied to a specific week. They expire after their week ends.

### Week boundaries

Each user configures their own week start day (Sunday through Saturday — any day of the week). All week calculations derive from `users.week_start` at query time.

### Social

Follows are unidirectional (Strava-style) — no approval needed. The feed shows published weekly activity from users you follow. The leaderboard is opt-in and ranks by streak (consecutive weeks at ≥80% completion) and consistency, not raw percentage.

---

## API reference

```
POST   /auth/google                 Redirect to Google OAuth
GET    /auth/google/callback        OAuth callback (sets session cookie)
DELETE /auth/session                Logout

GET    /users/me                    Authenticated user profile
PATCH  /users/me                    Update profile / settings
GET    /users/me/feed               Feed of followed users' published activity
GET    /users/:id                   Public profile
GET    /users/:id/activity          Weekly activity heatmap data

POST   /goals                       Create goal
GET    /goals                       List my active goals
PATCH  /goals/:id                   Update goal
DELETE /goals/:id                   Delete goal

POST   /progress/:goal_id           Log progress (increment)
GET    /progress?week=YYYY-Www      Get a week's progress
PATCH  /progress/:id                Set progress directly

POST   /notes                       Add note to a weekly progress entry
GET    /notes?progress_id=X         List notes for a progress entry
PATCH  /notes/:id                   Update note
DELETE /notes/:id                   Delete note

POST   /follows/:user_id            Follow a user
DELETE /follows/:user_id            Unfollow
GET    /follows/following           List who I follow
GET    /follows/followers           List who follows me

GET    /leaderboard                 Opt-in leaderboard
POST   /leaderboard/opt-in          Join leaderboard
DELETE /leaderboard/opt-in          Leave leaderboard
```

---

## Development

```bash
# Run tests (backend)
cd api && cargo test

# Type-check (frontend)
cd web && npx tsc --noEmit

# Build for production (frontend)
cd web && npm run build
```

### SQLx offline mode

If you need to compile the API without a running database (e.g. in CI), generate the offline query cache first:

```bash
cd api
cargo install sqlx-cli --no-default-features --features postgres
cargo sqlx prepare
```

Then set `SQLX_OFFLINE=true` when building.

---

## Freemium

| Feature | Free | Premium |
|---|---|---|
| Unlimited goals | ✓ | ✓ |
| Basic stats (lifetime & running avg) | ✓ | ✓ |
| Activity heatmap | ✓ | ✓ |
| Social (follows, feed, leaderboard) | ✓ | ✓ |
| Private notes | ✓ | ✓ |
| Public notes | — | ✓ |
| Extended analytics | — | ✓ |
| Data export (CSV / JSON) | — | ✓ |
| Custom goal categories | — | ✓ |
