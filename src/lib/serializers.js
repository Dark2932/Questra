'use strict';

function parseJson(value, fallback) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function serializeQuestion(row, options = {}) {
  const question = {
    id: row.id,
    poolQuestionId: row.pool_question_id ?? undefined,
    title: row.title,
    type: row.is_judgment ? 'judgment' : row.type,
    storageType: row.type,
    isJudgment: Boolean(row.is_judgment),
    options: parseJson(row.options_json, []),
    required: Boolean(row.is_required),
    points: Number(row.points || 0),
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
  if (options.includeAnswer) {
    question.correctAnswer = row.correct_answer_json === null || row.correct_answer_json === undefined
      ? null
      : parseJson(row.correct_answer_json, null);
  }
  return question;
}

function serializeSurvey(row, questions) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    kind: row.kind || 'survey',
    scoringMode: row.scoring_mode || null,
    maxScore: row.max_score === null || row.max_score === undefined ? null : Number(row.max_score),
    scoringConfig: parseJson(row.scoring_config_json, null),
    status: row.status,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    responseCount: row.response_count,
    questionCount: row.question_count,
    selectionMode: row.selection_mode || 'manual',
    sourceGroupId: row.source_group_id ?? null,
    selectionConfig: parseJson(row.selection_config_json, null),
    ...(questions ? { questions } : {})
  };
}

module.exports = { parseJson, serializeQuestion, serializeSurvey };
