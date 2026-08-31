-- 编辑已收集答卷的实例时，旧题目快照继续服务于历史答卷，新快照用于后续提交。
ALTER TABLE survey_questions ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1));
CREATE INDEX IF NOT EXISTS idx_survey_questions_active ON survey_questions(survey_id, is_active, sort_order);
