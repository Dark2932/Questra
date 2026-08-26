'use strict';

const crypto = require('node:crypto');
const { Buffer } = require('node:buffer');
const { HttpError } = require('./lib/http');

const USERNAME_PATTERN = /^[a-zA-Z0-9_.-]{3,32}$/;
const PASSWORD_MIN_LENGTH = 8;

function normalizeUsername(value) {
  const username = String(value || '').trim();
  if (!USERNAME_PATTERN.test(username)) {
    throw new HttpError(400, '账号需使用 3-32 位字母、数字、下划线、点或短横线');
  }
  return username;
}

function normalizeNickname(value) {
  const nickname = String(value || '').trim();
  if (!nickname) throw new HttpError(400, '管理员昵称不能为空');
  if (nickname.length > 40) throw new HttpError(400, '管理员昵称不能超过 40 个字符');
  return nickname;
}

function validatePassword(value, required = true) {
  if (!value && !required) return '';
  const password = String(value || '');
  if (password.length < PASSWORD_MIN_LENGTH) throw new HttpError(400, `密码至少需要 ${PASSWORD_MIN_LENGTH} 位`);
  if (password.length > 128) throw new HttpError(400, '密码不能超过 128 位');
  return password;
}

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  return {
    salt,
    hash: crypto.scryptSync(password, salt, 64).toString('hex')
  };
}

function verifyPassword(password, row) {
  if (!row?.password_hash || !row.password_salt) return false;
  const actual = crypto.scryptSync(String(password || ''), row.password_salt, 64);
  const expected = Buffer.from(row.password_hash, 'hex');
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

function getAdminAccount(db) {
  return db.prepare('SELECT id, username, nickname, password_hash, password_salt, created_at, updated_at FROM admin_accounts WHERE id = 1').get() || null;
}

function serializeAccount(row) {
  if (!row) return null;
  return { id: row.id, username: row.username, nickname: row.nickname };
}

function createAdminAccount(db, input = {}) {
  if (getAdminAccount(db)) throw new HttpError(409, '管理员账户已经初始化');
  const username = normalizeUsername(input.username);
  const nickname = normalizeNickname(input.nickname || username);
  const password = validatePassword(input.password);
  const { salt, hash } = hashPassword(password);
  try {
    db.prepare(`
      INSERT INTO admin_accounts (id, username, nickname, password_hash, password_salt)
      VALUES (1, ?, ?, ?, ?)
    `).run(username, nickname, hash, salt);
  } catch (error) {
    if (String(error.message).includes('UNIQUE')) throw new HttpError(409, '管理员账户已经初始化');
    throw error;
  }
  return serializeAccount(getAdminAccount(db));
}

function updateAdminAccount(db, input = {}, options = {}) {
  const existing = getAdminAccount(db);
  if (!existing) throw new HttpError(409, '请先完成管理员初始化');
  const username = normalizeUsername(input.username || existing.username);
  const nickname = normalizeNickname(input.nickname || existing.nickname);
  const newPassword = input.newPassword ? validatePassword(input.newPassword) : '';
  if (newPassword && !options.trusted && !verifyPassword(input.currentPassword, existing)) {
    throw new HttpError(401, '当前密码不正确');
  }
  if (username !== existing.username && !options.trusted && !verifyPassword(input.currentPassword, existing)) {
    throw new HttpError(401, '修改账号需要验证当前密码');
  }
  const password = newPassword ? hashPassword(newPassword) : { salt: existing.password_salt, hash: existing.password_hash };
  try {
    db.prepare(`
      UPDATE admin_accounts
      SET username = ?, nickname = ?, password_hash = ?, password_salt = ?, updated_at = datetime('now')
      WHERE id = 1
    `).run(username, nickname, password.hash, password.salt);
  } catch (error) {
    if (String(error.message).includes('UNIQUE')) throw new HttpError(409, '该账号名已被占用');
    throw error;
  }
  return serializeAccount(getAdminAccount(db));
}

module.exports = {
  PASSWORD_MIN_LENGTH,
  getAdminAccount,
  serializeAccount,
  createAdminAccount,
  updateAdminAccount,
  verifyPassword
};
