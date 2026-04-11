-- Publish queue: pending changes that become visible at the user's publish time.
-- The scheduler polls this table and flips is_published on weekly_progress.
-- On conflict (same user + progress entry), we overwrite — only the latest
-- state needs to be published.

CREATE TABLE publish_queue (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    weekly_progress_id  UUID        NOT NULL REFERENCES weekly_progress(id) ON DELETE CASCADE,
    -- JSON snapshot of the change (completed_count, target_count)
    change_payload      JSONB       NOT NULL,
    scheduled_publish_at TIMESTAMPTZ NOT NULL,
    -- NULL until the scheduler processes this entry
    published_at        TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Only one pending entry per (user, progress entry) at a time
    UNIQUE (user_id, weekly_progress_id)
);

CREATE INDEX idx_pq_due ON publish_queue (scheduled_publish_at)
    WHERE published_at IS NULL;
