'use strict';

const crypto = require('node:crypto');
const { hashSessionToken } = require('../middleware/admin-auth');
const { HttpError } = require('../lib/http');

const TTL = { verify_email: 24 * 60 * 60 * 1000, reset_password: 60 * 60 * 1000 };

function issueAuthToken(db, userId, purpose) {
  if (!TTL[purpose]) throw new Error('Unsupported auth token purpose');
  db.prepare("UPDATE user_auth_tokens SET consumed_at=datetime('now') WHERE user_id=? AND purpose=? AND consumed_at IS NULL").run(userId, purpose);
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + TTL[purpose]).toISOString();
  db.prepare('INSERT INTO user_auth_tokens (token_hash,user_id,purpose,expires_at) VALUES (?,?,?,?)').run(hashSessionToken(token), userId, purpose, expiresAt);
  return { token, expiresAt };
}

function consumeAuthToken(db, token, purpose) {
  const row = db.prepare(`SELECT * FROM user_auth_tokens WHERE token_hash=? AND purpose=? AND consumed_at IS NULL AND datetime(expires_at)>datetime('now')`).get(hashSessionToken(token), purpose);
  if (!row) throw new HttpError(400, '验证链接无效或已过期');
  db.prepare("UPDATE user_auth_tokens SET consumed_at=datetime('now') WHERE token_hash=?").run(row.token_hash);
  return row;
}

module.exports = { TTL, issueAuthToken, consumeAuthToken };
