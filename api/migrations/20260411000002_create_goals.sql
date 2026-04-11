-- Goals table

CREATE TYPE goal_type       AS ENUM ('recurring', 'weekly');
CREATE TYPE goal_visibility AS ENUM ('public', 'private');

CREATE TABLE goals (
    id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID            NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    goal_type       goal_type       NOT NULL,
    title           TEXT            NOT NULL CHECK (length(trim(title)) > 0),
    target_count    INT             NOT NULL DEFAULT 1 CHECK (target_count >= 1),
    visibility      goal_visibility NOT NULL DEFAULT 'public',
    is_archived     BOOLEAN         NOT NULL DEFAULT false,
    -- Populated only for weekly goals; the first day of the target week
    week_start_date DATE,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    -- Weekly goals must specify a week; recurring goals must not
    CONSTRAINT weekly_requires_date CHECK (
        (goal_type = 'weekly'    AND week_start_date IS NOT NULL) OR
        (goal_type = 'recurring' AND week_start_date IS NULL)
    )
);

CREATE INDEX idx_goals_user_id ON goals (user_id);
CREATE INDEX idx_goals_user_type_archived ON goals (user_id, goal_type, is_archived);
