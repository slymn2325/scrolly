ALTER TABLE stories
  ADD COLUMN IF NOT EXISTS owner_user_id TEXT;

ALTER TABLE stories
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_stories_owner_user_id
  ON stories (owner_user_id, created_at DESC)
  WHERE owner_user_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS story_usage (
  bucket_key TEXT PRIMARY KEY,
  count INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
