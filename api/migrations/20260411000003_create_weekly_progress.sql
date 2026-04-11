-- Weekly progress: one row per (goal, user, week).
-- is_published flips to true when the scheduler flushes the publish_queue.

CREATE TABLE weekly_progress (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    goal_id         UUID        NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
    user_id         UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    -- Start of the week per this user's week_start setting
    week_start_date DATE        NOT NULL,
    completed_count INT         NOT NULL DEFAULT 0 CHECK (completed_count >= 0),
    -- Snapshot of goal.target_count at the time of first progress in this week
    target_count    INT         NOT NULL DEFAULT 1 CHECK (target_count >= 1),
    is_published    BOOLEAN     NOT NULL DEFAULT false,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (goal_id, user_id, week_start_date)
);

CREATE INDEX idx_wp_user_week ON weekly_progress (user_id, week_start_date);
CREATE INDEX idx_wp_published ON weekly_progress (user_id, is_published);
