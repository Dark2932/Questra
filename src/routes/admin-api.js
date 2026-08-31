'use strict';

const express = require('express');
const { asyncRoute, HttpError } = require('../lib/http');
const { parseJson, serializeQuestion, serializeSurvey } = require('../lib/serializers');
const { getAdminAccount, serializeAccount, updateAdminAccount } = require('../admin-account');
const { deleteAccountSessions } = require('../admin-session');
const { getSiteSettings, updateSiteSettings } = require('../settings');

function createAdminApi({ db, surveyService, config, app, updateService }) {
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
    const recentSurveys = db.prepare(`
      SELECT s.*, (SELECT COUNT(*) FROM responses r WHERE r.survey_id = s.id) AS response_count,
        (SELECT COUNT(*) FROM survey_questions q WHERE q.survey_id = s.id AND q.is_active = 1) AS question_count
      FROM surveys s ORDER BY s.created_at DESC LIMIT 5
    `).all();
    res.json({ totals, trend, recentSurveys });
  });

  router.get('/settings', (req, res) => {
    res.json({ site: getSiteSettings(db, config.siteName), account: serializeAccount(getAdminAccount(db)) });
  });

  router.put('/settings/site', (req, res) => {
    const site = updateSiteSettings(db, req.body);
    config.siteName = site.siteName;
    config.siteIcon = site.siteIcon;
    config.siteIconAsInitial = site.siteIconAsInitial;
    config.siteInitial = site.siteInitial;
    config.siteInitialColor = site.siteInitialColor;
    config.themeColor = site.themeColor;
    app.locals.siteName = site.siteName;
    app.locals.siteIcon = site.siteIcon;
    app.locals.siteIconAsInitial = site.siteIconAsInitial;
    app.locals.siteInitial = site.siteInitial;
    app.locals.siteInitialColor = site.siteInitialColor;
    app.locals.themeColor = site.themeColor;
    res.json({ site });
  });

  router.put('/settings/account', (req, res) => {
    const previous = getAdminAccount(db);
    const account = updateAdminAccount(db, req.body, { trusted: req.adminAuth?.type === 'legacy-token' });
    const requiresLogin = Boolean(req.body.newPassword || previous?.username !== account.username);
    if (requiresLogin) deleteAccountSessions(db, account.id);
    res.json({ account, requiresLogin });
  });

  router.get('/update', asyncRoute(async (req, res) => {
    res.json(await updateService.checkForUpdate());
  }));

  router.get('/update/status', (req, res) => {
    res.json(typeof updateService.getUpdateStatus === 'function'
      ? updateService.getUpdateStatus()
      : { currentVersion: null, installationType: 'global', sourceBuild: false, updateSupported: true, checked: false });
  });

  router.post('/update/install', asyncRoute(async (req, res) => {
    res.json(await updateService.installLatest());
  }));

  router.get('/questions', (req, res) => {
    const rows = db.prepare('SELECT * FROM question_pool ORDER BY updated_at DESC, id DESC').all();
    res.json(rows.map((row) => ({ ...serializeQuestion(row, { includeAnswer: true }), groupIds: surveyService.questionGroupIds(row.id) })));
  });

  router.get('/groups', (req, res) => res.json(surveyService.listGroups()));
  router.post('/groups', (req, res) => res.status(201).json(surveyService.createGroup(req.body)));
  router.put('/groups/:id', (req, res) => res.json(surveyService.updateGroup(req.params.id, req.body)));
  router.delete('/groups/:id', (req, res) => { surveyService.deleteGroup(req.params.id); res.status(204).end(); });

  router.post('/questions', (req, res) => {
    const question = surveyService.normalizeQuestion(req.body);
    const result = db.prepare(`
      INSERT INTO question_pool (title, type, options_json, is_required, correct_answer_json, is_judgment) VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      question.title,
      question.type,
      JSON.stringify(question.options),
      Number(question.required),
      question.correctAnswer === null ? null : JSON.stringify(question.correctAnswer),
      Number(question.isJudgment)
    );
    if (req.body.groupIds) surveyService.setQuestionGroups(result.lastInsertRowid, req.body.groupIds);
    res.status(201).json({ ...serializeQuestion(
      db.prepare('SELECT * FROM question_pool WHERE id = ?').get(result.lastInsertRowid),
      { includeAnswer: true }
    ), groupIds: surveyService.questionGroupIds(result.lastInsertRowid) });
  });

  router.put('/questions/:id', (req, res) => {
    const question = surveyService.normalizeQuestion(req.body);
    const result = db.prepare(`
      UPDATE question_pool SET title = ?, type = ?, options_json = ?, is_required = ?, correct_answer_json = ?, is_judgment = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(
      question.title,
      question.type,
      JSON.stringify(question.options),
      Number(question.required),
      question.correctAnswer === null ? null : JSON.stringify(question.correctAnswer),
      Number(question.isJudgment),
      req.params.id
    );
    if (!result.changes) throw new HttpError(404, '题目不存在');
    if (req.body.groupIds) surveyService.setQuestionGroups(req.params.id, req.body.groupIds);
    res.json({ ...serializeQuestion(db.prepare('SELECT * FROM question_pool WHERE id = ?').get(req.params.id), { includeAnswer: true }), groupIds: surveyService.questionGroupIds(req.params.id) });
  });

  router.delete('/questions/:id', (req, res) => {
    const result = db.prepare('DELETE FROM question_pool WHERE id = ?').run(req.params.id);
    if (!result.changes) throw new HttpError(404, '题目不存在');
    res.status(204).end();
  });

  router.get('/surveys', (req, res) => {
    const rows = db.prepare(`
      SELECT s.*,
        (SELECT COUNT(*) FROM survey_questions q WHERE q.survey_id = s.id AND q.is_active = 1) AS question_count,
        (SELECT COUNT(*) FROM responses r WHERE r.survey_id = s.id) AS response_count
      FROM surveys s ORDER BY s.created_at DESC
    `).all();
    res.json(rows.map((row) => serializeSurvey(row)));
  });

  router.post('/surveys', (req, res) => {
    res.status(201).json(surveyService.createSurvey(req.body));
  });

  router.get('/surveys/:id', (req, res) => {
    res.json(surveyService.getSurvey(req.params.id, true, true));
  });

  router.put('/surveys/:id', (req, res) => {
    res.json(surveyService.updateSurvey(req.params.id, req.body));
  });

  router.delete('/surveys/:id', (req, res) => {
    const result = db.prepare('DELETE FROM surveys WHERE id = ?').run(req.params.id);
    if (!result.changes) throw new HttpError(404, '问卷不存在');
    res.status(204).end();
  });

  router.get('/surveys/:id/export', (req, res) => {
    const survey = surveyService.getSurvey(req.params.id, true, true);
    const responseRows = db.prepare('SELECT * FROM responses WHERE survey_id = ? ORDER BY submitted_at ASC').all(req.params.id);
    const answersByResponse = db.prepare('SELECT survey_question_id, value_json FROM answers WHERE response_id = ?');
    const exportQuestions = db.prepare(`
      SELECT q.* FROM survey_questions q
      WHERE q.survey_id = ? AND (
        q.is_active = 1 OR EXISTS (SELECT 1 FROM answers a WHERE a.survey_question_id = q.id)
      )
      ORDER BY q.id
    `).all(req.params.id);
    survey.questions = exportQuestions.map((question) => ({
      ...serializeQuestion(question, { includeAnswer: true }),
      archived: !question.is_active
    }));
    const questions = survey.questions.map((question) => ({
      id: question.id,
      title: question.title + (question.archived ? '（历史）' : '')
    }));

    const rows = responseRows.map((response) => {
      const answers = Object.fromEntries(answersByResponse.all(response.id).map((answer) => [
        answer.survey_question_id,
        parseJson(answer.value_json, null)
      ]));
      return {
        submittedAt: response.submitted_at,
        answers,
        score: response.score === null ? null : Number(response.score),
        maxScore: response.max_score === null ? null : Number(response.max_score)
      };
    });

    const includeScores = survey.kind === 'exam' || rows.some((row) => row.score !== null);
    const format = String(req.query.format || 'csv').toLowerCase();
    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="survey-${survey.id}.json"`);
      return res.json({ survey, responses: rows });
    }

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="survey-${survey.id}.csv"`);
    // UTF-8 BOM 让 Excel 正确识别中文。
    const header = ['提交时间', ...questions.map((q) => q.title), ...(includeScores ? ['得分', '满分'] : [])];
    const lines = [header, ...rows.map((row) => [
      row.submittedAt,
      ...questions.map((q) => {
        const value = row.answers[q.id];
        return Array.isArray(value) ? value.join('、') : (value === null || value === undefined ? '' : String(value));
      }),
      ...(includeScores ? [row.score ?? '', row.maxScore ?? ''] : [])
    ])];
    const csv = lines.map((line) => line.map((cell) => {
      const text = String(cell);
      return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
    }).join(',')).join('\r\n');
    res.send('\uFEFF' + csv);
  });

  router.get('/surveys/:id/responses', (req, res) => {
    const survey = surveyService.getSurvey(req.params.id, true, true);
    survey.questions = db.prepare(`
      SELECT q.* FROM survey_questions q
      WHERE q.survey_id = ? AND (
        q.is_active = 1 OR EXISTS (SELECT 1 FROM answers a WHERE a.survey_question_id = q.id)
      )
      ORDER BY q.id
    `).all(req.params.id).map((question) => ({
      ...serializeQuestion(question, { includeAnswer: true }),
      archived: !question.is_active
    }));
    const responseRows = db.prepare('SELECT * FROM responses WHERE survey_id = ? ORDER BY submitted_at DESC').all(req.params.id);
    const answersByResponse = db.prepare(`
      SELECT a.survey_question_id, a.value_json, a.is_correct, a.awarded_score
      FROM answers a WHERE a.response_id = ?
    `);
    const responses = responseRows.map((response) => ({
      id: response.id,
      submittedAt: response.submitted_at,
      score: response.score === null ? null : Number(response.score),
      maxScore: response.max_score === null ? null : Number(response.max_score),
      answers: Object.fromEntries(answersByResponse.all(response.id).map((answer) => [
        answer.survey_question_id,
        {
          value: parseJson(answer.value_json, null),
          isCorrect: answer.is_correct === null ? null : Boolean(answer.is_correct),
          awardedScore: answer.awarded_score === null ? null : Number(answer.awarded_score)
        }
      ]))
    }));
    res.json({ survey, responses, hasScores: survey.kind === 'exam' || responses.some((response) => response.score !== null) });
  });

  return router;
}

module.exports = { createAdminApi };
