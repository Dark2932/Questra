'use strict';

const crypto = require('node:crypto');
function parseCookies(header = '') {
  return Object.fromEntries(String(header).split(';').filter(Boolean).map((part) => {
    const [key, ...value] = part.trim().split('=');
    try {
      return [key, decodeURIComponent(value.join('='))];
    } catch {
      return [key, ''];
    }
  }));
}

function hashSessionToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

function getCredential(req) {
  const bearer = req.get('authorization')?.replace(/^Bearer\s+/i, '');
  const cookies = parseCookies(req.get('cookie'));
  return {
    value: bearer || req.get('x-admin-token') || req.query.token || cookies.questra_session || cookies.questra_admin_token,
    source: bearer ? 'bearer' : req.query.token ? 'query' : cookies.questra_session ? 'session-cookie' : 'token-cookie',
    cookies
  };
}

function findSession(db, token) {
  if (!db || !token) return null;
  const row = db.prepare(`
    SELECT s.token_hash, a.id, a.username, a.nickname
    FROM admin_sessions s JOIN admin_accounts a ON a.id = s.account_id
    WHERE s.token_hash = ? AND datetime(s.expires_at) > datetime('now')
  `).get(hashSessionToken(token));
  return row ? { id: row.id, username: row.username, nickname: row.nickname } : null;
}

function authenticateRequest(req, { adminToken, db }) {
  const credential = getCredential(req);
  if (!credential.value) return null;
  if (adminToken && credential.value === adminToken) {
    return { type: 'legacy-token', user: null, credential };
  }
  const user = findSession(db, credential.value);
  return user ? { type: 'session', user, credential } : null;
}

function createAdminAuth(adminToken, db) {
  return function adminAuth(req, res, next) {
    const auth = authenticateRequest(req, { adminToken, db });
    if (!auth) {
      if (req.originalUrl.startsWith('/api/')) {
        return res.status(401).json({ error: '账号未登录或授权已失效' });
      }
      return res.status(401).render('admin/unauthorized', { siteName: res.locals.siteName });
    }

    req.adminAuth = auth;
    if (auth.type === 'legacy-token' && auth.credential.source === 'query' && !auth.credential.cookies.questra_admin_token) {
      const secure = req.secure ? '; Secure' : '';
      res.setHeader('Set-Cookie', `questra_admin_token=${encodeURIComponent(adminToken)}; Path=/; HttpOnly; SameSite=Lax${secure}`);
    }
    next();
  };
}

module.exports = { createAdminAuth, authenticateRequest, findSession, hashSessionToken, parseCookies };
