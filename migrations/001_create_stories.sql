-- 001_create_stories.sql
-- No-Code Scrollytelling Studio stories table

CREATE TABLE IF NOT EXISTS stories (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  source_url TEXT,
  language TEXT NOT NULL DEFAULT 'tr' CHECK (language IN ('tr', 'en')),
  theme JSONB NOT NULL DEFAULT '{"mode":"dark","accent":"#7C3AED"}'::jsonb,
  cards JSONB NOT NULL DEFAULT '[]'::jsonb,
  views_count INT NOT NULL DEFAULT 0,
  completions_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stories_created_at
  ON stories (created_at DESC);
