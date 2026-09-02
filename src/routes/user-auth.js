'use strict';

const express = require('express');
const { asyncRoute, HttpError } = require('../lib/http');
const { parseCookies } = require('../middleware/admin-auth');
const { getUserAuth } = require('../middleware/user-auth');
const { createUserSession, deleteUserSession, deleteUserSessions } = require('../user-session');
const { createUser, getUserByEmail, getUserById, serializeUser, verifyPassword, updateUserPassword, setEmailVerified, updateDisplayName, recordLoginFailure, recordLoginSuccess, isLocked, normalizeEmail } = require('../user-account');
const { issueAuthToken, consumeAuthToken } = require('../services/auth-token-service');

function setUserCookie(res, token, secure = false) {
  res.setHeader('Set-Cookie', `questra_user_session=${encodeURIComponent(token)}; Path=/; HttpOnly; Max-Age=2592000; SameSite=Lax${secure ? '; Secure' : ''}`);
}

function clearUserCookie(res) {
  res.setHeader('Set-Cookie', 'questra_user_session=; Path=/; HttpOnly; Max-Age=0; SameSite=Lax');
}

function sameOrigin(req) {
  const site = req.get('sec-fetch-site');
  if (site && !['same-origin', 'same-site', 'none'].includes(site)) return false;
  const origin = req.get('origin');
  if (!origin) return true;
  return origin === `${req.protocol}://${req.get('host')}`;
}

function safeReturnTo(value) {
  const target = String(value || '/');
  return target.startsWith('/') && !target.startsWith('//') ? target : '/';
}

function createUserAuthRoutes({ db, config, emailService, registrationLimiter, authLimiter }) {
  const router = express.Router();
  const publicUrl = () => String(config.publicUrl || '').replace(/\/$/, '');
  const urlFor = (path, token, req, returnTo = '') => `${publicUrl() || `${req.protocol}://${req.get('host')}`}${path}?token=${encodeURIComponent(token)}${returnTo ? `&returnTo=${encodeURIComponent(safeReturnTo(returnTo))}` : ''}`;

  router.post('/api/user/auth/register', registrationLimiter, asyncRoute(async (req, res) => {
    if (!sameOrigin(req)) throw new HttpError(403, '请求来源无效');
    if (config.userRegistration === false) throw new HttpError(403, '当前站点未开放用户注册');
    if (!emailService.configured) throw new HttpError(503, '站点尚未配置邮件服务，暂时无法注册');
    const email = normalizeEmail(req.body.email);
    const existing = getUserByEmail(db, email);
    if (existing) return res.status(202).json({ message: '如果该邮箱可以注册，验证邮件将会发送到邮箱' });
    const user = db.transaction(() => {
      const created = createUser(db, req.body);
      const token = issueAuthToken(db, created.id, 'verify_email');
      return { created, token };
    })();
    try {
      await emailService.sendVerificationEmail({ to: user.created.email, displayName: user.created.display_name, verifyUrl: urlFor('/user/verify', user.token.token, req, req.body.returnTo), siteName: config.siteName });
    } catch (error) {
      console.error(`[user-email] verification delivery failed: ${error.message}`);
      throw new HttpError(503, '验证邮件发送失败，请稍后重新发送');
    }
    res.status(201).json({ message: '注册成功，请查收验证邮件', user: serializeUser(user.created) });
  }));

  router.post('/api/user/auth/verify', authLimiter, asyncRoute(async (req, res) => {
    if (!sameOrigin(req)) throw new HttpError(403, '请求来源无效');
    const token = consumeAuthToken(db, req.body.token, 'verify_email');
    const user = setEmailVerified(db, token.user_id);
    const session = createUserSession(db, user.id);
    setUserCookie(res, session.token, req.secure);
    res.json({ message: '邮箱验证成功', user: serializeUser(user) });
  }));

  router.post('/api/user/auth/resend-verification', authLimiter, asyncRoute(async (req, res) => {
    if (!sameOrigin(req)) throw new HttpError(403, '请求来源无效');
    const user = getUserByEmail(db, normalizeEmail(req.body.email));
    if (user && !user.email_verified_at && emailService.configured) {
      const token = issueAuthToken(db, user.id, 'verify_email');
      await emailService.sendVerificationEmail({ to: user.email, displayName: user.display_name, verifyUrl: urlFor('/user/verify', token.token, req), siteName: config.siteName }).catch(() => {});
    }
    res.status(202).json({ message: '如果该邮箱需要验证，验证邮件将会发送到邮箱' });
  }));

  router.post('/api/user/auth/login', authLimiter, (req, res) => {
    if (!sameOrigin(req)) return res.status(403).json({ error: '请求来源无效' });
    const user = getUserByEmail(db, String(req.body.email || ''));
    if (!user || isLocked(user) || !verifyPassword(req.body.password, user)) {
      if (user && !isLocked(user)) recordLoginFailure(db, user);
      return res.status(401).json({ error: '邮箱或密码错误' });
    }
    recordLoginSuccess(db, user.id);
    const session = createUserSession(db, user.id);
    setUserCookie(res, session.token, req.secure);
    res.json({ user: serializeUser(getUserById(db, user.id)), returnTo: safeReturnTo(req.body.returnTo) });
  });

  router.get('/api/user/auth/me', (req, res) => {
    const auth = getUserAuth(req, db);
    if (!auth) return res.status(401).json({ error: '用户未登录或会话已失效' });
    res.json({ authenticated: true, user: auth.user });
  });

  router.post('/api/user/auth/logout', (req, res) => {
    if (!sameOrigin(req)) return res.status(403).json({ error: '请求来源无效' });
    const cookies = parseCookies(req.get('cookie'));
    deleteUserSession(db, cookies.questra_user_session);
    clearUserCookie(res);
    res.status(204).end();
  });

  router.post('/api/user/auth/forgot-password', authLimiter, asyncRoute(async (req, res) => {
    if (!sameOrigin(req)) throw new HttpError(403, '请求来源无效');
    const user = getUserByEmail(db, String(req.body.email || ''));
    if (user && emailService.configured) {
      const token = issueAuthToken(db, user.id, 'reset_password');
      await emailService.sendPasswordResetEmail({ to: user.email, displayName: user.display_name, resetUrl: urlFor('/user/reset-password', token.token, req), siteName: config.siteName }).catch(() => {});
    }
    res.status(202).json({ message: '如果该邮箱已注册，密码重置邮件将会发送到邮箱' });
  }));

  router.post('/api/user/auth/reset-password', authLimiter, (req, res) => {
    if (!sameOrigin(req)) return res.status(403).json({ error: '请求来源无效' });
    const token = consumeAuthToken(db, req.body.token, 'reset_password');
    const user = updateUserPassword(db, token.user_id, req.body.password);
    deleteUserSessions(db, user.id);
    const session = createUserSession(db, user.id);
    setUserCookie(res, session.token, req.secure);
    res.json({ message: '密码已重置', user: serializeUser(user) });
  });

  router.put('/api/user/profile', authLimiter, (req, res) => {
    if (!sameOrigin(req)) return res.status(403).json({ error: '请求来源无效' });
    const auth = getUserAuth(req, db);
    if (!auth) return res.status(401).json({ error: '请先登录后继续' });
    const user = updateDisplayName(db, auth.user.id, req.body.displayName);
    res.json({ user: serializeUser(user) });
  });

  router.put('/api/user/password', authLimiter, (req, res) => {
    if (!sameOrigin(req)) return res.status(403).json({ error: '请求来源无效' });
    const auth = getUserAuth(req, db);
    if (!auth) return res.status(401).json({ error: '请先登录后继续' });
    if (!verifyPassword(req.body.currentPassword, auth.row)) return res.status(401).json({ error: '当前密码不正确' });
    const user = updateUserPassword(db, auth.user.id, req.body.newPassword);
    deleteUserSessions(db, user.id);
    const session = createUserSession(db, user.id);
    setUserCookie(res, session.token, req.secure);
    res.json({ user: serializeUser(user) });
  });

  return router;
}

module.exports = { createUserAuthRoutes, setUserCookie, clearUserCookie, safeReturnTo };
