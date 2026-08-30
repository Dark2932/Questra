'use strict';

const express = require('express');

function createAdminPages({ db, config, surveyService }) {
  const router = express.Router();

  router.get('/', (req, res) => {
    const totals = db.prepare(`
      SELECT
        (SELECT COUNT(*) FROM question_pool) AS questions,
        (SELECT COUNT(*) FROM surveys) AS surveys,
        (SELECT COUNT(*) FROM surveys WHERE status = 'active' AND (expires_at IS NULL OR datetime(expires_at) > datetime('now'))) AS active_surveys,
        (SELECT COUNT(*) FROM responses) AS responses
    `).get();
    const recentSurveys = db.prepare(`
      SELECT s.*, (SELECT COUNT(*) FROM responses r WHERE r.survey_id = s.id) AS response_count,
        (SELECT COUNT(*) FROM survey_questions q WHERE q.survey_id = s.id) AS question_count
      FROM surveys s ORDER BY s.created_at DESC LIMIT 5
    `).all();
    const trend = db.prepare(`
      WITH RECURSIVE days(day) AS (
        SELECT date('now', '-6 day') UNION ALL SELECT date(day, '+1 day') FROM days WHERE day < date('now')
      )
      SELECT days.day, COUNT(responses.id) AS count FROM days
      LEFT JOIN responses ON date(responses.submitted_at) = days.day
      GROUP BY days.day ORDER BY days.day
    `).all();
    res.render('admin/dashboard', { siteName: config.siteName, siteIcon: config.siteIcon, siteIconAsInitial: config.siteIconAsInitial, siteInitial: config.siteInitial, siteInitialColor: config.siteInitialColor, themeColor: config.themeColor, totals, recentSurveys, trend });
  });

  router.get('/questions', (req, res) => res.render('admin/questions', { siteName: config.siteName, siteIcon: config.siteIcon, siteIconAsInitial: config.siteIconAsInitial, siteInitial: config.siteInitial, siteInitialColor: config.siteInitialColor, themeColor: config.themeColor }));
  router.get('/surveys', (req, res) => res.render('admin/surveys', { siteName: config.siteName, siteIcon: config.siteIcon, siteIconAsInitial: config.siteIconAsInitial, siteInitial: config.siteInitial, siteInitialColor: config.siteInitialColor, themeColor: config.themeColor }));
  router.get('/surveys/:id/responses', (req, res) => {
    const survey = surveyService.getSurvey(req.params.id);
    res.render('admin/responses', { siteName: config.siteName, siteIcon: config.siteIcon, siteIconAsInitial: config.siteIconAsInitial, siteInitial: config.siteInitial, siteInitialColor: config.siteInitialColor, themeColor: config.themeColor, survey });
  });

  return router;
}

module.exports = { createAdminPages };
