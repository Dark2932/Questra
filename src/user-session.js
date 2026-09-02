'use strict';

const crypto = require('node:crypto');
const { hashSessionToken } = require('./middleware/admin-auth');
const { getUserById } = require('./user-account');

const SESSION_DAYS = 30;

function createUserSession(db, userId) {
  cleanupExpiredUserSessions(db);
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000).toISOString();
  db.prepare('INSERT INTO user_sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)').run(hashSessionToken(token), userId, expiresAt);
  return { token, expiresAt };
}

function findUserSession(db, token) {
  if (!token) return null;
  const row = db.prepare(`SELECT s.user_id, s.expires_at, u.* FROM user_sessions s JOIN users u ON u.id=s.user_id
    WHERE s.token_hash=? AND s.revoked_at IS NULL AND u.status != 'disabled' AND datetime(s.expires_at)>datetime('now')`).get(hashSessionToken(token));
  return row && getUserById(db, row.user_id) ? row : null;
}

function deleteUserSession(db, token) {
  if (token) db.prepare('DELETE FROM user_sessions WHERE token_hash=?').run(hashSessionToken(token));
}

function deleteUserSessions(db, userId) { return db.prepare('DELETE FROM user_sessions WHERE user_id=?').run(userId); }
function cleanupExpiredUserSessions(db) { db.prepare("DELETE FROM user_sessions WHERE datetime(expires_at)<=datetime('now') OR revoked_at IS NOT NULL").run(); }

module.exports = { SESSION_DAYS, createUserSession, findUserSession, deleteUserSession, deleteUserSessions, cleanupExpiredUserSessions };
