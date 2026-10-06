-- Username uniqueness registry (avoids listUsers 1000 ceiling)
CREATE TABLE IF NOT EXISTS usernames (
  username TEXT PRIMARY KEY,
  auth_user_id TEXT NOT NULL,
  role TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS usernames_auth_idx ON usernames (auth_user_id);
