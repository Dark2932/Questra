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

  const finalOptions = type === 'text' ? [] : [...new Set(options)];
  let correctAnswer = null;
  if (input.correctAnswer !== undefined && input.correctAnswer !== null && input.correctAnswer !== '') {
    if (type === 'single') {
      correctAnswer = String(input.correctAnswer).trim();
      if (!finalOptions.includes(correctAnswer)) throw new HttpError(400, '单选题标准答案必须是已有选项');
    } else {
      const values = Array.isArray(input.correctAnswer) ? input.correctAnswer : [input.correctAnswer];
      correctAnswer = [...new Set(values.map((value) => String(value).trim()).filter(Boolean))];
      if (!correctAnswer.length) correctAnswer = null;
      if (type === 'multiple' && correctAnswer?.some((value) => !finalOptions.includes(value))) {
        throw new HttpError(400, '多选题标准答案必须来自已有选项');
      }
    }
  }

  return { title, type, required, options: finalOptions, correctAnswer };
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

  function getSurvey(id, includeQuestions = true, includeAnswers = false) {
    const row = surveyById.get(id);
    if (!row) throw new HttpError(404, '问卷不存在');
    const questions = includeQuestions
      ? questionsBySurvey.all(id).map((question) => serializeQuestion(question, { includeAnswer: includeAnswers }))
      : undefined;
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
    const kind = input.kind === 'exam' ? 'exam' : 'survey';
    if (!title) throw new HttpError(400, '问卷标题不能为空');
    if (!questionIds.length) throw new HttpError(400, '请至少选择一道题目');

    const sourceQuestions = questionIds.map((id) => poolById.get(id));
    if (sourceQuestions.some((question) => !question)) throw new HttpError(400, '选择的题目不存在');

    let scoringMode = null;
    let maxScore = null;
    let scoringConfig = null;
    let questionPoints = new Map(sourceQuestions.map((question) => [question.id, 0]));
    if (kind === 'exam') {
      if (sourceQuestions.some((question) => question.correct_answer_json === null)) {
        throw new HttpError(400, '考试中的每道题都必须先在问题池设置标准答案');
      }
      ({ scoringMode, maxScore, scoringConfig, questionPoints } = buildScoring(input, sourceQuestions));
    }

    const id = randomUUID();
    const insertSurvey = db.prepare(`
      INSERT INTO surveys
        (id, title, description, expires_at, kind, scoring_mode, max_score, scoring_config_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const insertQuestion = db.prepare(`
      INSERT INTO survey_questions
        (survey_id, pool_question_id, title, type, options_json, is_required, sort_order, correct_answer_json, points)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    db.transaction(() => {
      insertSurvey.run(id, title, description, expiresAt, kind, scoringMode, maxScore, scoringConfig ? JSON.stringify(scoringConfig) : null);
      sourceQuestions.forEach((question, index) => {
        // 复制完整值而不是依赖题池外键，这是问卷生成后互不影响的关键。
        insertQuestion.run(
          id,
          question.id,
          question.title,
          question.type,
          question.options_json,
          question.is_required,
          index,
          question.correct_answer_json,
          questionPoints.get(question.id)
        );
      });
    })();

    return getSurvey(id, true, true);
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

  function saveResponse(survey, validatedAnswers) {
    const responseId = randomUUID();
    const gradedAnswers = validatedAnswers.map((answer) => gradeAnswer(survey.kind, answer));
    const score = survey.kind === 'exam'
      ? roundScore(gradedAnswers.reduce((sum, answer) => sum + answer.awardedScore, 0))
      : null;
    const insertResponse = db.prepare('INSERT INTO responses (id, survey_id, score, max_score) VALUES (?, ?, ?, ?)');
    const insertAnswer = db.prepare(`
      INSERT INTO answers
        (response_id, survey_question_id, value_json, is_correct, awarded_score)
      VALUES (?, ?, ?, ?, ?)
    `);
    db.transaction(() => {
      insertResponse.run(responseId, survey.id, score, survey.maxScore);
      for (const answer of gradedAnswers) {
        insertAnswer.run(
          responseId,
          answer.question.id,
          JSON.stringify(answer.value),
          answer.isCorrect === null ? null : Number(answer.isCorrect),
          answer.awardedScore
        );
      }
    })();
    return { responseId, score, maxScore: survey.maxScore, gradedAnswers };
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

function positiveNumber(value, message) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) throw new HttpError(400, message);
  return number;
}

function roundScore(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function buildScoring(input, sourceQuestions) {
  const scoringMode = String(input.scoringMode || '');
  if (!['weighted', 'per_question'].includes(scoringMode)) throw new HttpError(400, '请选择有效的计分模式');

  if (scoringMode === 'weighted') {
    const maxScore = positiveNumber(input.totalScore, '满分必须大于 0');
    const counts = sourceQuestions.reduce((result, question) => {
      result[question.type] = (result[question.type] || 0) + 1;
      return result;
    }, {});
    const typeWeights = {};
    for (const type of Object.keys(counts)) {
      typeWeights[type] = positiveNumber(input.typeWeights?.[type], '每个目标题型的权重必须大于 0');
    }
    const weightTotal = Object.values(typeWeights).reduce((sum, weight) => sum + weight, 0);
    if (Math.abs(weightTotal - 100) > 0.001) throw new HttpError(400, '目标题型权重总和必须为 100%');

    const questionPoints = new Map(sourceQuestions.map((question) => [
      question.id,
      maxScore * typeWeights[question.type] / 100 / counts[question.type]
    ]));
    return { scoringMode, maxScore, scoringConfig: { typeWeights, typeCounts: counts }, questionPoints };
  }

  const questionScores = input.questionScores && typeof input.questionScores === 'object' ? input.questionScores : {};
  const questionPoints = new Map();
  for (const question of sourceQuestions) {
    questionPoints.set(question.id, positiveNumber(questionScores[question.id], `请设置“${question.title}”的分值`));
  }
  const maxScore = roundScore([...questionPoints.values()].reduce((sum, score) => sum + score, 0));
  return {
    scoringMode,
    maxScore,
    scoringConfig: { questionScores: Object.fromEntries(questionPoints) },
    questionPoints
  };
}

function normalizedText(value) {
  return String(value ?? '').trim().toLocaleLowerCase();
}

function gradeAnswer(kind, answer) {
  if (kind !== 'exam') return { ...answer, isCorrect: null, awardedScore: null };
  const expected = answer.question.correctAnswer;
  let isCorrect = false;
  if (answer.question.type === 'multiple') {
    const actualSet = new Set(answer.value);
    isCorrect = Array.isArray(expected)
      && actualSet.size === expected.length
      && expected.every((value) => actualSet.has(value));
  } else if (answer.question.type === 'text') {
    const actual = normalizedText(answer.value);
    isCorrect = actual !== '' && Array.isArray(expected) && expected.some((value) => normalizedText(value) === actual);
  } else {
    isCorrect = answer.value === expected;
  }
  return {
    ...answer,
    isCorrect,
    awardedScore: isCorrect ? Number(answer.question.points) : 0
  };
}

module.exports = { createSurveyService, normalizeQuestion };
