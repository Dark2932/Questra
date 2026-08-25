ALTER TABLE question_pool ADD COLUMN is_judgment INTEGER NOT NULL DEFAULT 0;
ALTER TABLE survey_questions ADD COLUMN is_judgment INTEGER NOT NULL DEFAULT 0;
ALTER TABLE surveys ADD COLUMN selection_mode TEXT NOT NULL DEFAULT 'manual';
ALTER TABLE surveys ADD COLUMN source_group_id INTEGER;
ALTER TABLE surveys ADD COLUMN selection_config_json TEXT;

CREATE TABLE IF NOT EXISTS question_groups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS question_group_items (
  group_id INTEGER NOT NULL,
  question_id INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (group_id, question_id),
  FOREIGN KEY (group_id) REFERENCES question_groups(id) ON DELETE CASCADE,
  FOREIGN KEY (question_id) REFERENCES question_pool(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_question_group_items_question ON question_group_items(question_id);
