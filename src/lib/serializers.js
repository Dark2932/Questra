'use strict';

function parseJson(value, fallback) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function serializeQuestion(row) {
  return {
    id: row.id,
    poolQuestionId: row.pool_question_id ?? undefined,
    title: row.title,
    type: row.type,
    options: parseJson(row.options_json, []),
    required: Boolean(row.is_required),
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function serializeSurvey(row, questions) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    responseCount: row.response_count,
    questionCount: row.question_count,
    ...(questions ? { questions } : {})
  };
}

module.exports = { parseJson, serializeQuestion, serializeSurvey };
