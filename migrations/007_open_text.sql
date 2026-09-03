ALTER TABLE question_pool ADD COLUMN is_open_text INTEGER NOT NULL DEFAULT 0 CHECK (is_open_text IN (0, 1));
ALTER TABLE survey_questions ADD COLUMN is_open_text INTEGER NOT NULL DEFAULT 0 CHECK (is_open_text IN (0, 1));
