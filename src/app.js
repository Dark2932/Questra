'use strict';

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

  app.disable('x-powered-by');
  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, '..', 'views'));
  app.locals.siteName = config.siteName;
  app.use(express.json({ limit: '256kb' }));
  app.use(express.urlencoded({ extended: false, limit: '256kb' }));
  app.use('/static', express.static(path.join(__dirname, '..', 'public'), { maxAge: '1h' }));

  app.get('/', (req, res) => res.redirect('/admin'));
  app.use(createPublicRoutes({ db, config, surveyService }));
  app.use('/api/admin', adminAuth, createAdminApi({ db, surveyService }));
  app.use('/admin', adminAuth, createAdminPages({ db, config, surveyService }));

  app.use((req, res) => {
    const error = { status: 404, message: '页面不存在' };
    if (req.path.startsWith('/api/')) return res.status(404).json({ error: error.message });
    res.status(404).render('error', { siteName: config.siteName, error });
  });

  // 生产环境不向浏览器泄露堆栈，详细信息仍写入启动终端便于排查。
  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    const status = Number(error.status) || 500;
    if (status >= 500) console.error(error.stack || error.message);
    if (req.path.startsWith('/api/')) {
      return res.status(status).json({ error: status >= 500 ? '服务器处理失败' : error.message });
    }
    res.status(status).render('error', {
      siteName: config.siteName,
      error: { status, message: status >= 500 ? '服务器处理失败，请稍后重试' : error.message }
    });
  });

  return app;
}

module.exports = { createApp };
