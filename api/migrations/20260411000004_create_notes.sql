-- Notes: per-goal, per-week optional notes.
-- is_public = true requires premium tier (enforced in application layer).

CREATE TABLE notes (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    weekly_progress_id  UUID        NOT NULL REFERENCES weekly_progress(id) ON DELETE CASCADE,
    user_id             UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content             TEXT        NOT NULL CHECK (length(trim(content)) > 0),
    is_public           BOOLEAN     NOT NULL DEFAULT false,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notes_progress_id ON notes (weekly_progress_id);
CREATE INDEX idx_notes_user_id     ON notes (user_id);
