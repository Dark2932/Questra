'use strict';

const fs = require('node:fs');
const path = require('node:path');
const express = require('express');
const { createAdminAuth, authenticateRequest, parseCookies } = require('./middleware/admin-auth');
const { createSurveyService } = require('./services/survey-service');
const { createAdminApi } = require('./routes/admin-api');
const { createAdminPages } = require('./routes/admin-pages');
const { createPublicRoutes } = require('./routes/public');
const { securityHeaders } = require('./middleware/security');
const { createRateLimit } = require('./middleware/rate-limit');
const { createAdminAccount, getAdminAccount, serializeAccount, verifyPassword } = require('./admin-account');
const { createSession, deleteSession } = require('./admin-session');
const { DEFAULT_SITE_ICON_URL, getSiteSettings, updateSiteSettings } = require('./settings');

function setSessionCookie(res, token, secure = false) {
  const secureFlag = secure ? '; Secure' : '';
  res.setHeader('Set-Cookie', `questra_session=${encodeURIComponent(token)}; Path=/; HttpOnly; Max-Age=604800; SameSite=Lax${secureFlag}`);
}

function createApp({ db, config, adminToken }) {
  const app = express();
  const siteSettings = getSiteSettings(db, config.siteName || 'Questra');
  config.siteName = siteSettings.siteName;
  config.siteIcon = siteSettings.siteIcon;
  config.siteIconAsInitial = siteSettings.siteIconAsInitial;
  config.siteInitial = siteSettings.siteInitial;
  config.siteInitialColor = siteSettings.siteInitialColor;
  config.themeColor = siteSettings.themeColor;
  const surveyService = createSurveyService(db);
  const adminAuth = createAdminAuth(adminToken, db);
  const distPath = path.join(__dirname, '..', 'client', 'dist');
  const spaAvailable = fs.existsSync(path.join(distPath, 'index.html'));
  // 个人服务器场景：提交接口和写操作按 IP 限流，防止脚本灌入。
  const submitLimiter = createRateLimit({ windowMs: 60_000, max: 30 });
  const adminWriteLimiter = createRateLimit({ windowMs: 60_000, max: 60 });
  const loginLimiter = createRateLimit({ windowMs: 60_000, max: 10 });

  app.disable('x-powered-by');
  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, '..', 'views'));
  app.locals.siteName = config.siteName;
  app.locals.siteIcon = config.siteIcon;
  app.locals.siteIconAsInitial = config.siteIconAsInitial;
  app.locals.siteInitial = config.siteInitial;
  app.locals.siteInitialColor = config.siteInitialColor;
  app.locals.themeColor = config.themeColor;
  app.locals.defaultSiteIcon = DEFAULT_SITE_ICON_URL;
  app.use(securityHeaders);
  // 轻量请求日志直接输出到启动 Questra 的终端，便于个人服务器调试。
  if (config.logging !== false) {
    app.use((req, res, next) => {
      const startedAt = process.hrtime.bigint();
      res.once('finish', () => {
        const elapsedMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
        const status = res.statusCode >= 500 ? 'ERROR' : res.statusCode >= 400 ? 'WARN' : 'INFO';
        const safeUrl = req.originalUrl.replace(/([?&]token=)[^&]*/gi, '$1[redacted]');
        console.log(`[${status}] ${new Date().toISOString()} ${req.method} ${safeUrl} ${res.statusCode} ${elapsedMs.toFixed(1)}ms`);
      });
      next();
    });
  }
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: false, limit: '2mb' }));
  app.use('/static', express.static(path.join(__dirname, '..', 'public'), { maxAge: '1h' }));

  app.get('/api/config', (req, res) => res.json({ siteName: config.siteName, siteIcon: config.siteIcon || '', siteIconAsInitial: config.siteIconAsInitial, siteInitial: config.siteInitial, siteInitialColor: config.siteInitialColor, themeColor: config.themeColor }));

  app.get('/api/setup/status', (req, res) => {
    const account = getAdminAccount(db);
    res.json({ initialized: Boolean(account), siteName: config.siteName, siteIcon: config.siteIcon || '', siteIconAsInitial: config.siteIconAsInitial, siteInitial: config.siteInitial, siteInitialColor: config.siteInitialColor, themeColor: config.themeColor });
  });

  app.post('/api/setup', loginLimiter, (req, res) => {
    if (getAdminAccount(db)) return res.status(409).json({ error: '管理员账户已经初始化，请直接登录' });
    const created = db.transaction(() => {
      const account = createAdminAccount(db, req.body);
      const settings = updateSiteSettings(db, req.body);
      return { account, settings };
    })();
    config.siteName = created.settings.siteName;
    config.siteIcon = created.settings.siteIcon;
    config.siteIconAsInitial = created.settings.siteIconAsInitial;
    config.siteInitial = created.settings.siteInitial;
    config.siteInitialColor = created.settings.siteInitialColor;
    config.themeColor = created.settings.themeColor;
    app.locals.siteName = config.siteName;
    app.locals.siteIcon = config.siteIcon;
    app.locals.siteIconAsInitial = config.siteIconAsInitial;
    app.locals.siteInitial = config.siteInitial;
    app.locals.siteInitialColor = config.siteInitialColor;
    app.locals.themeColor = config.themeColor;
    const session = createSession(db, created.account.id);
    setSessionCookie(res, session.token, req.secure);
    res.status(201).json({ user: created.account, site: created.settings });
  });

  app.post('/api/auth/login', loginLimiter, (req, res) => {
    const account = getAdminAccount(db);
    if (!account) return res.status(409).json({ error: '请先完成管理员初始化' });
    if (!verifyPassword(req.body.password, account) || String(req.body.username || '').trim() !== account.username) {
      return res.status(401).json({ error: '账号或密码错误' });
    }
    const session = createSession(db, account.id);
    setSessionCookie(res, session.token, req.secure);
    res.json({ user: serializeAccount(account) });
  });

  app.get('/api/auth/me', (req, res) => {
    const auth = authenticateRequest(req, { adminToken, db });
    if (!auth) return res.status(401).json({ error: '账号未登录或授权已失效' });
    const account = getAdminAccount(db);
    res.json({ authenticated: true, authType: auth.type, user: serializeAccount(account) });
  });

  app.post('/api/auth/logout', (req, res) => {
    const cookies = parseCookies(req.get('cookie'));
    deleteSession(db, cookies.questra_session);
    res.setHeader('Set-Cookie', [
      'questra_session=; Path=/; HttpOnly; Max-Age=0; SameSite=Lax',
      'questra_admin_token=; Path=/; HttpOnly; Max-Age=0; SameSite=Lax'
    ]);
    res.status(204).end();
  });

  // 健康检查：验证服务进程与数据库连接，供反向代理 / systemd 探测。
  app.get('/api/health', (req, res) => {
    let database = 'ok';
    try {
      db.prepare('SELECT 1').get();
    } catch {
      database = 'error';
    }
    res.status(database === 'ok' ? 200 : 503).json({
      status: database === 'ok' ? 'ok' : 'degraded',
      database,
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    });
  });

  app.get('/', (req, res) => res.redirect('/admin'));
  app.use(createPublicRoutes({ db, config, surveyService, submitLimiter }));
  app.use('/api/admin', adminWriteLimiter, adminAuth, createAdminApi({ db, surveyService, config, app }));

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
      res.render('survey', { survey, siteName: config.siteName, siteIcon: config.siteIcon, siteIconAsInitial: config.siteIconAsInitial, siteInitial: config.siteInitial, siteInitialColor: config.siteInitialColor, themeColor: config.themeColor });
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
