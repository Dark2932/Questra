'use strict';

const { randomUUID } = require('node:crypto');
const { HttpError } = require('../lib/http');
const { serializeQuestion, serializeSurvey } = require('../lib/serializers');

const QUESTION_TYPES = new Set(['single', 'multiple', 'text']);

function normalizeQuestion(input) {
  const title = String(input.title || '').trim();
  const type = String(input.type || '');
  const required = input.required === true || input.required === 1 || input.required === '1';
  const options = Array.isArray(input.options)
    ? input.options.map((option) => String(option).trim()).filter(Boolean)
    : [];

  if (!title) throw new HttpError(400, '题目标题不能为空');
  if (!QUESTION_TYPES.has(type)) throw new HttpError(400, '不支持的题目类型');
  if ((type === 'single' || type === 'multiple') && options.length < 2) {
    throw new HttpError(400, '单选题和多选题至少需要两个选项');
  }

  return { title, type, required, options: type === 'text' ? [] : options };
}

function parseOptionalDate(value) {
  if (value === undefined || value === null || value === '') return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new HttpError(400, '有效期格式无效');
  return date.toISOString();
}

function createSurveyService(db) {
  const poolById = db.prepare('SELECT * FROM question_pool WHERE id = ?');
  const surveyById = db.prepare(`
    SELECT s.*,
      (SELECT COUNT(*) FROM survey_questions q WHERE q.survey_id = s.id) AS question_count,
      (SELECT COUNT(*) FROM responses r WHERE r.survey_id = s.id) AS response_count
    FROM surveys s WHERE s.id = ?
  `);
  const questionsBySurvey = db.prepare('SELECT * FROM survey_questions WHERE survey_id = ? ORDER BY sort_order, id');

  function getSurvey(id, includeQuestions = true) {
    const row = surveyById.get(id);
    if (!row) throw new HttpError(404, '问卷不存在');
    const questions = includeQuestions ? questionsBySurvey.all(id).map(serializeQuestion) : undefined;
    return serializeSurvey(row, questions);
  }

  function ensureSurveyOpen(survey) {
    if (survey.status !== 'active') throw new HttpError(410, '该问卷已停止回收');
    if (survey.expiresAt && new Date(survey.expiresAt).getTime() <= Date.now()) {
      throw new HttpError(410, '该问卷已过期');
    }
  }

  function createSurvey(input) {
    const title = String(input.title || '').trim();
    const description = String(input.description || '').trim();
    const questionIds = Array.isArray(input.questionIds)
      ? [...new Set(input.questionIds.map(Number).filter(Number.isInteger))]
      : [];
    const expiresAt = parseOptionalDate(input.expiresAt);
    if (!title) throw new HttpError(400, '问卷标题不能为空');
    if (!questionIds.length) throw new HttpError(400, '请至少选择一道题目');

    const sourceQuestions = questionIds.map((id) => poolById.get(id));
    if (sourceQuestions.some((question) => !question)) throw new HttpError(400, '选择的题目不存在');

    const id = randomUUID();
    const insertSurvey = db.prepare(`
      INSERT INTO surveys (id, title, description, expires_at) VALUES (?, ?, ?, ?)
    `);
    const insertQuestion = db.prepare(`
      INSERT INTO survey_questions
        (survey_id, pool_question_id, title, type, options_json, is_required, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    db.transaction(() => {
      insertSurvey.run(id, title, description, expiresAt);
      sourceQuestions.forEach((question, index) => {
        // 复制完整值而不是依赖题池外键，这是问卷生成后互不影响的关键。
        insertQuestion.run(
          id,
          question.id,
          question.title,
          question.type,
          question.options_json,
          question.is_required,
          index
        );
      });
    })();

    return getSurvey(id);
  }

  function validateAnswers(survey, rawAnswers) {
    if (!rawAnswers || typeof rawAnswers !== 'object' || Array.isArray(rawAnswers)) {
      throw new HttpError(400, 'answers 必须是以题目 ID 为键的对象');
    }

    return survey.questions.map((question) => {
      const raw = rawAnswers[String(question.id)] ?? rawAnswers[question.id];
      const empty = raw === undefined || raw === null || raw === '' || (Array.isArray(raw) && raw.length === 0);
      if (question.required && empty) throw new HttpError(400, `“${question.title}”为必填题`);

      if (question.type === 'multiple') {
        if (empty) return { question, value: [] };
        if (!Array.isArray(raw)) throw new HttpError(400, `“${question.title}”答案格式错误`);
        const value = [...new Set(raw.map(String))];
        if (value.some((item) => !question.options.includes(item))) {
          throw new HttpError(400, `“${question.title}”包含无效选项`);
        }
        return { question, value };
      }

      const value = empty ? '' : String(raw).trim();
      if (question.type === 'single' && value && !question.options.includes(value)) {
        throw new HttpError(400, `“${question.title}”包含无效选项`);
      }
      if (question.type === 'text' && value.length > 10000) {
        throw new HttpError(400, `“${question.title}”内容不能超过 10000 字`);
      }
      return { question, value };
    });
  }

  function saveResponse(surveyId, validatedAnswers) {
    const responseId = randomUUID();
    const insertResponse = db.prepare('INSERT INTO responses (id, survey_id) VALUES (?, ?)');
    const insertAnswer = db.prepare(`
      INSERT INTO answers (response_id, survey_question_id, value_json) VALUES (?, ?, ?)
    `);
    db.transaction(() => {
      insertResponse.run(responseId, surveyId);
      for (const answer of validatedAnswers) {
        insertAnswer.run(responseId, answer.question.id, JSON.stringify(answer.value));
      }
    })();
    return responseId;
  }

  return {
    normalizeQuestion,
    parseOptionalDate,
    getSurvey,
    ensureSurveyOpen,
    createSurvey,
    validateAnswers,
    saveResponse
  };
}

module.exports = { createSurveyService, normalizeQuestion };
