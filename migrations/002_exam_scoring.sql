-- 问题池标准答案。NULL 表示该题尚未配置答案，只能用于普通问卷。
ALTER TABLE question_pool ADD COLUMN correct_answer_json TEXT;

-- kind 区分普通问卷和考试；计分配置随实例保存，避免发布后发生漂移。
ALTER TABLE surveys ADD COLUMN kind TEXT NOT NULL DEFAULT 'survey';
ALTER TABLE surveys ADD COLUMN scoring_mode TEXT;
ALTER TABLE surveys ADD COLUMN max_score REAL;
ALTER TABLE surveys ADD COLUMN scoring_config_json TEXT;

-- 标准答案和单题分值都属于问卷题目快照。
ALTER TABLE survey_questions ADD COLUMN correct_answer_json TEXT;
ALTER TABLE survey_questions ADD COLUMN points REAL NOT NULL DEFAULT 0;

-- 答卷保存最终成绩，每题同时保存判定结果与实际得分。
ALTER TABLE responses ADD COLUMN score REAL;
ALTER TABLE responses ADD COLUMN max_score REAL;
ALTER TABLE answers ADD COLUMN is_correct INTEGER;
ALTER TABLE answers ADD COLUMN awarded_score REAL;
