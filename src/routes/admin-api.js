'use strict';

const express = require('express');
const { asyncRoute, HttpError } = require('../lib/http');
const { parseJson, serializeQuestion, serializeSurvey } = require('../lib/serializers');

function createAdminApi({ db, surveyService }) {
  const router = express.Router();

  router.get('/dashboard', (req, res) => {
    const totals = db.prepare(`
      SELECT
        (SELECT COUNT(*) FROM question_pool) AS questions,
        (SELECT COUNT(*) FROM surveys) AS surveys,
        (SELECT COUNT(*) FROM surveys WHERE status = 'active' AND (expires_at IS NULL OR datetime(expires_at) > datetime('now'))) AS active_surveys,
        (SELECT COUNT(*) FROM responses) AS responses
    `).get();
    const trend = db.prepare(`
      WITH RECURSIVE days(day) AS (
        SELECT date('now', '-6 day') UNION ALL
        SELECT date(day, '+1 day') FROM days WHERE day < date('now')
      )
      SELECT days.day, COUNT(responses.id) AS count
      FROM days LEFT JOIN responses ON date(responses.submitted_at) = days.day
      GROUP BY days.day ORDER BY days.day
    `).all();
    res.json({ totals, trend });
  });

  router.get('/questions', (req, res) => {
    const rows = db.prepare('SELECT * FROM question_pool ORDER BY updated_at DESC, id DESC').all();
    res.json(rows.map(serializeQuestion));
  });

  router.post('/questions', (req, res) => {
    const question = surveyService.normalizeQuestion(req.body);
    const result = db.prepare(`
      INSERT INTO question_pool (title, type, options_json, is_required) VALUES (?, ?, ?, ?)
    `).run(question.title, question.type, JSON.stringify(question.options), Number(question.required));
    res.status(201).json(serializeQuestion(db.prepare('SELECT * FROM question_pool WHERE id = ?').get(result.lastInsertRowid)));
  });

  router.put('/questions/:id', (req, res) => {
    const question = surveyService.normalizeQuestion(req.body);
    const result = db.prepare(`
      UPDATE question_pool SET title = ?, type = ?, options_json = ?, is_required = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(question.title, question.type, JSON.stringify(question.options), Number(question.required), req.params.id);
    if (!result.changes) throw new HttpError(404, '题目不存在');
    res.json(serializeQuestion(db.prepare('SELECT * FROM question_pool WHERE id = ?').get(req.params.id)));
  });

  router.delete('/questions/:id', (req, res) => {
    const result = db.prepare('DELETE FROM question_pool WHERE id = ?').run(req.params.id);
    if (!result.changes) throw new HttpError(404, '题目不存在');
    res.status(204).end();
  });

  router.get('/surveys', (req, res) => {
    const rows = db.prepare(`
      SELECT s.*,
        (SELECT COUNT(*) FROM survey_questions q WHERE q.survey_id = s.id) AS question_count,
        (SELECT COUNT(*) FROM responses r WHERE r.survey_id = s.id) AS response_count
      FROM surveys s ORDER BY s.created_at DESC
    `).all();
    res.json(rows.map((row) => serializeSurvey(row)));
  });

  router.post('/surveys', (req, res) => {
    res.status(201).json(surveyService.createSurvey(req.body));
  });

  router.get('/surveys/:id', (req, res) => {
    res.json(surveyService.getSurvey(req.params.id));
  });

  router.put('/surveys/:id', (req, res) => {
    const current = surveyService.getSurvey(req.params.id, false);
    const title = req.body.title === undefined ? current.title : String(req.body.title).trim();
    const description = req.body.description === undefined ? current.description : String(req.body.description).trim();
    const status = req.body.status === undefined ? current.status : String(req.body.status);
    const expiresAt = req.body.expiresAt === undefined
      ? current.expiresAt
      : surveyService.parseOptionalDate(req.body.expiresAt);
    if (!title) throw new HttpError(400, '问卷标题不能为空');
    if (!['active', 'closed'].includes(status)) throw new HttpError(400, '问卷状态无效');

    db.prepare(`
      UPDATE surveys SET title = ?, description = ?, status = ?, expires_at = ?, updated_at = datetime('now') WHERE id = ?
    `).run(title, description, status, expiresAt, req.params.id);
    res.json(surveyService.getSurvey(req.params.id));
  });

  router.delete('/surveys/:id', (req, res) => {
    const result = db.prepare('DELETE FROM surveys WHERE id = ?').run(req.params.id);
    if (!result.changes) throw new HttpError(404, '问卷不存在');
    res.status(204).end();
  });

  router.get('/surveys/:id/responses', (req, res) => {
    const survey = surveyService.getSurvey(req.params.id);
    const responseRows = db.prepare('SELECT * FROM responses WHERE survey_id = ? ORDER BY submitted_at DESC').all(req.params.id);
    const answersByResponse = db.prepare(`
      SELECT a.survey_question_id, a.value_json
      FROM answers a WHERE a.response_id = ?
    `);
    const responses = responseRows.map((response) => ({
      id: response.id,
      submittedAt: response.submitted_at,
      answers: Object.fromEntries(answersByResponse.all(response.id).map((answer) => [
        answer.survey_question_id,
        parseJson(answer.value_json, null)
      ]))
    }));
    res.json({ survey, responses });
  });

  return router;
}

module.exports = { createAdminApi };
