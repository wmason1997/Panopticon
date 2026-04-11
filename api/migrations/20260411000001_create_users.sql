-- Users table
-- OAuth-only auth: no passwords stored.
-- Week boundaries are derived from week_start at query time.

CREATE TYPE subscription_tier AS ENUM ('free', 'premium');

CREATE TABLE users (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    email               TEXT        NOT NULL,
    display_name        TEXT        NOT NULL,
    avatar_url          TEXT,
    timezone            TEXT        NOT NULL DEFAULT 'UTC',
    -- "HH:MM" in the user's local timezone
    publish_time        TEXT        NOT NULL DEFAULT '00:00',
    -- 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
    week_start          SMALLINT    NOT NULL DEFAULT 0 CHECK (week_start BETWEEN 0 AND 6),
    oauth_provider      TEXT        NOT NULL,
    oauth_provider_id   TEXT        NOT NULL,
    subscription_tier   subscription_tier NOT NULL DEFAULT 'free',
    leaderboard_opt_in  BOOLEAN     NOT NULL DEFAULT false,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (oauth_provider, oauth_provider_id)
);

-- Sessions table (HTTP-only cookie auth)
CREATE TABLE sessions (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at  TIMESTAMPTZ NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sessions_user_id    ON sessions (user_id);
CREATE INDEX idx_sessions_expires_at ON sessions (expires_at);
