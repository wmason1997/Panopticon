-- Follows: unidirectional (Strava-style). No approval needed.

CREATE TABLE follows (
    follower_id UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    followed_id UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    PRIMARY KEY (follower_id, followed_id),
    -- Prevent self-follows at DB level
    CHECK (follower_id != followed_id)
);

CREATE INDEX idx_follows_follower ON follows (follower_id);
CREATE INDEX idx_follows_followed ON follows (followed_id);
