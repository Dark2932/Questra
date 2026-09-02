'use strict';

const crypto = require('node:crypto');
const { Buffer } = require('node:buffer');
const { randomUUID } = require('node:crypto');
const { HttpError } = require('./lib/http');

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_MIN_LENGTH = 8;

function normalizeEmail(value) {
  const email = String(value || '').trim();
  if (email.length > 254 || !EMAIL_PATTERN.test(email)) throw new HttpError(400, '请输入有效的邮箱地址');
  return email;
}

function normalizeDisplayName(value, fallback = '') {
  const name = String(value || fallback).trim();
  if (!name) throw new HttpError(400, '显示名称不能为空');
  if (name.length > 40) throw new HttpError(400, '显示名称不能超过 40 个字符');
  return name;
}

function validatePassword(value) {
  const password = String(value || '');
  if (password.length < PASSWORD_MIN_LENGTH) throw new HttpError(400, `密码至少需要 ${PASSWORD_MIN_LENGTH} 位`);
  if (password.length > 128) throw new HttpError(400, '密码不能超过 128 位');
  return password;
}

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  return { salt, hash: crypto.scryptSync(password, salt, 64).toString('hex') };
}

function verifyPassword(password, row) {
  if (!row?.password_hash || !row.password_salt) return false;
  const actual = crypto.scryptSync(String(password || ''), row.password_salt, 64);
  const expected = Buffer.from(row.password_hash, 'hex');
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

function serializeUser(row, { includeEmail = true } = {}) {
  if (!row) return null;
  return {
    id: row.id,
    email: includeEmail ? row.email : undefined,
    displayName: row.display_name,
    status: row.status,
    emailVerified: Boolean(row.email_verified_at),
    emailVerifiedAt: row.email_verified_at || null
  };
}

function createUser(db, input = {}) {
  const email = normalizeEmail(input.email);
  const displayName = normalizeDisplayName(input.displayName, email.split('@')[0]);
  const password = validatePassword(input.password);
  const { salt, hash } = hashPassword(password);
  const id = randomUUID();
  try {
    db.prepare(`INSERT INTO users (id, email, email_normalized, display_name, password_hash, password_salt)
      VALUES (?, ?, ?, ?, ?, ?)`).run(id, email, email.toLowerCase(), displayName, hash, salt);
  } catch (error) {
    if (String(error.message).includes('UNIQUE')) throw new HttpError(409, '该邮箱已注册');
    throw error;
  }
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id);
}

function getUserById(db, id) { return db.prepare('SELECT * FROM users WHERE id = ?').get(id) || null; }
function getUserByEmail(db, email) { return db.prepare('SELECT * FROM users WHERE email_normalized = ?').get(String(email || '').trim().toLowerCase()) || null; }

function updateUserPassword(db, userId, password) {
  const existing = getUserById(db, userId);
  if (!existing) throw new HttpError(404, '用户不存在');
  const { salt, hash } = hashPassword(validatePassword(password));
  db.prepare("UPDATE users SET password_hash=?, password_salt=?, failed_login_count=0, locked_until=NULL, updated_at=datetime('now') WHERE id=?").run(hash, salt, userId);
  return getUserById(db, userId);
}

function setEmailVerified(db, userId) {
  db.prepare("UPDATE users SET status=CASE WHEN status='disabled' THEN status ELSE 'active' END, email_verified_at=datetime('now'), updated_at=datetime('now') WHERE id=?").run(userId);
  return getUserById(db, userId);
}

function updateDisplayName(db, userId, value) {
  const displayName = normalizeDisplayName(value);
  db.prepare("UPDATE users SET display_name=?, updated_at=datetime('now') WHERE id=?").run(displayName, userId);
  return getUserById(db, userId);
}

function recordLoginFailure(db, user) {
  const count = Number(user.failed_login_count || 0) + 1;
  const lockedUntil = count >= 5 ? new Date(Date.now() + 15 * 60 * 1000).toISOString() : null;
  db.prepare("UPDATE users SET failed_login_count=?, locked_until=?, status=CASE WHEN status='disabled' THEN status ELSE CASE WHEN ? IS NULL THEN status ELSE 'locked' END END, updated_at=datetime('now') WHERE id=?").run(count, lockedUntil, lockedUntil, user.id);
}

function recordLoginSuccess(db, userId) {
  db.prepare("UPDATE users SET failed_login_count=0, locked_until=NULL, status=CASE WHEN status='locked' THEN 'active' ELSE status END, updated_at=datetime('now') WHERE id=?").run(userId);
}

function isLocked(user) {
  return user?.status === 'disabled' || (user?.locked_until && new Date(user.locked_until).getTime() > Date.now());
}

function listUsers(db) {
  return db.prepare(`
    SELECT u.id, u.email, u.display_name, u.status, u.email_verified_at,
      u.failed_login_count, u.locked_until, u.created_at, u.updated_at,
      (SELECT COUNT(*) FROM responses r WHERE r.user_id = u.id) AS response_count,
      (SELECT COUNT(*) FROM user_sessions s WHERE s.user_id = u.id AND s.revoked_at IS NULL AND datetime(s.expires_at) > datetime('now')) AS active_session_count
    FROM users u ORDER BY u.created_at DESC
  `).all();
}

function setUserStatus(db, userId, status) {
  if (!['active', 'disabled'].includes(status)) throw new HttpError(400, '用户状态无效');
  const result = db.prepare(`UPDATE users SET status=?, locked_until=NULL, failed_login_count=0, updated_at=datetime('now') WHERE id=?`).run(status, userId);
  if (!result.changes) throw new HttpError(404, '用户不存在');
  return getUserById(db, userId);
}

function deleteUserAndAnonymize(db, userId) {
  const result = db.transaction(() => {
    db.prepare('UPDATE responses SET user_id=NULL WHERE user_id=?').run(userId);
    return db.prepare('DELETE FROM users WHERE id=?').run(userId);
  })();
  if (!result.changes) throw new HttpError(404, '用户不存在');
}

module.exports = {
  PASSWORD_MIN_LENGTH,
  normalizeEmail,
  normalizeDisplayName,
  validatePassword,
  hashPassword,
  verifyPassword,
  serializeUser,
  createUser,
  getUserById,
  getUserByEmail,
  updateUserPassword,
  setEmailVerified,
  updateDisplayName,
  recordLoginFailure,
  recordLoginSuccess,
  isLocked,
  listUsers,
  setUserStatus,
  deleteUserAndAnonymize
};
