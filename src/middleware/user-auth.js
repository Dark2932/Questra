'use strict';

const { parseCookies } = require('./admin-auth');
const { findUserSession } = require('../user-session');
const { serializeUser } = require('../user-account');

function getUserAuth(req, db) {
  const cookies = parseCookies(req.get('cookie'));
  const session = findUserSession(db, cookies.questra_user_session);
  return session ? { user: serializeUser(session), row: session, token: cookies.questra_user_session } : null;
}

function optionalUserAuth(db) {
  return (req, res, next) => { req.userAuth = getUserAuth(req, db); next(); };
}

function requireUserAuth(db, { verified = false } = {}) {
  return (req, res, next) => {
    req.userAuth = getUserAuth(req, db);
    if (!req.userAuth) return res.status(401).json({ error: '请先登录后继续' });
    if (verified && !req.userAuth.user.emailVerified) return res.status(403).json({ error: '请先验证邮箱后继续' });
    next();
  };
}

module.exports = { getUserAuth, optionalUserAuth, requireUserAuth };
