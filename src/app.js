'use strict';

const fs = require('node:fs');
const path = require('node:path');
const express = require('express');
const { createAdminAuth } = require('./middleware/admin-auth');
const { createSurveyService } = require('./services/survey-service');
const { createAdminApi } = require('./routes/admin-api');
const { createAdminPages } = require('./routes/admin-pages');
const { createPublicRoutes } = require('./routes/public');

function createApp({ db, config, adminToken }) {
  const app = express();
  const surveyService = createSurveyService(db);
  const adminAuth = createAdminAuth(adminToken);
  const distPath = path.join(__dirname, '..', 'client', 'dist');
  const spaAvailable = fs.existsSync(path.join(distPath, 'index.html'));

  app.disable('x-powered-by');
  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, '..', 'views'));
  app.locals.siteName = config.siteName;
  app.use(express.json({ limit: '256kb' }));
  app.use(express.urlencoded({ extended: false, limit: '256kb' }));
  app.use('/static', express.static(path.join(__dirname, '..', 'public'), { maxAge: '1h' }));

  app.get('/api/config', (req, res) => res.json({ siteName: config.siteName }));

  app.get('/', (req, res) => res.redirect('/admin'));
  app.use(createPublicRoutes({ db, config, surveyService }));
  app.use('/api/admin', adminAuth, createAdminApi({ db, surveyService }));

  if (spaAvailable) {
    app.use('/assets', express.static(path.join(distPath, 'assets'), { maxAge: '1h', immutable: true }));
    app.get('/admin/{*path}', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    app.get('/admin', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    app.get('/s/:id', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    app.get('/s/:id', (req, res) => {
      const survey = surveyService.getSurvey(req.params.id);
      surveyService.ensureSurveyOpen(survey);
      res.render('survey', { survey, siteName: config.siteName });
    });
    app.use('/admin', adminAuth, createAdminPages({ db, config, surveyService }));
  }

  app.use((req, res) => {
    const error = { status: 404, message: '页面不存在' };
    if (req.path.startsWith('/api/')) return res.status(404).json({ error: error.message });
    if (spaAvailable) return res.sendFile(path.join(distPath, 'index.html'));
    res.status(404).render('error', { siteName: config.siteName, error });
  });

  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    const status = Number(error.status) || 500;
    if (status >= 500) console.error(error.stack || error.message);
    if (req.path.startsWith('/api/')) {
      return res.status(status).json({ error: status >= 500 ? '服务器处理失败' : error.message });
    }
    if (spaAvailable) return res.sendFile(path.join(distPath, 'index.html'));
    res.status(status).render('error', {
      siteName: config.siteName,
      error: { status, message: status >= 500 ? '服务器处理失败，请稍后重试' : error.message }
    });
  });

  return app;
}

module.exports = { createApp };
