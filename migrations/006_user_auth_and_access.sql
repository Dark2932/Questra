-- 普通用户身份、邮箱验证、问卷访问策略和答卷归属。
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  email_normalized TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'locked', 'disabled')),
  email_verified_at TEXT,
  failed_login_count INTEGER NOT NULL DEFAULT 0,
  locked_until TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS user_sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  last_seen_at TEXT,
  revoked_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expiry ON user_sessions(expires_at);

CREATE TABLE IF NOT EXISTS user_auth_tokens (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  purpose TEXT NOT NULL CHECK (purpose IN ('verify_email', 'reset_password')),
  expires_at TEXT NOT NULL,
  consumed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_user_auth_tokens_user_purpose ON user_auth_tokens(user_id, purpose, expires_at);

CREATE TABLE IF NOT EXISTS survey_access_policies (
  survey_id TEXT PRIMARY KEY,
  access_mode TEXT NOT NULL DEFAULT 'anonymous' CHECK (access_mode IN ('anonymous', 'account', 'verified_email')),
  require_login_to_view INTEGER NOT NULL DEFAULT 0 CHECK (require_login_to_view IN (0, 1)),
  max_submissions_per_user INTEGER,
  max_submissions_total INTEGER,
  cooldown_seconds INTEGER,
  starts_at TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (survey_id) REFERENCES surveys(id) ON DELETE CASCADE,
  CHECK (max_submissions_per_user IS NULL OR max_submissions_per_user > 0),
  CHECK (max_submissions_total IS NULL OR max_submissions_total > 0),
  CHECK (cooldown_seconds IS NULL OR cooldown_seconds >= 0)
);

ALTER TABLE responses ADD COLUMN user_id TEXT REFERENCES users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_responses_survey_user_submitted ON responses(survey_id, user_id, submitted_at);

INSERT OR IGNORE INTO survey_access_policies (survey_id)
SELECT id FROM surveys;
