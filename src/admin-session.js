'use strict';

const crypto = require('node:crypto');
const { hashSessionToken } = require('./middleware/admin-auth');

const SESSION_DAYS = 7;

function createSession(db, accountId = 1) {
  cleanupExpiredSessions(db);
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000).toISOString();
  db.prepare('INSERT INTO admin_sessions (token_hash, account_id, expires_at) VALUES (?, ?, ?)').run(hashSessionToken(token), accountId, expiresAt);
  return { token, expiresAt };
}

function deleteSession(db, token) {
  if (!token) return;
  db.prepare('DELETE FROM admin_sessions WHERE token_hash = ?').run(hashSessionToken(token));
}

function deleteAccountSessions(db, accountId = 1) {
  db.prepare('DELETE FROM admin_sessions WHERE account_id = ?').run(accountId);
}

function cleanupExpiredSessions(db) {
  db.prepare("DELETE FROM admin_sessions WHERE datetime(expires_at) <= datetime('now')").run();
}

module.exports = { SESSION_DAYS, createSession, deleteSession, deleteAccountSessions, cleanupExpiredSessions };
