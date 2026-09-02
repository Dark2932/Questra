'use strict';

const { HttpError } = require('../lib/http');

const MODES = new Set(['anonymous', 'account', 'verified_email']);

function normalizePolicy(input = {}, current = {}) {
  const accessMode = input.accessMode ?? input.access_mode ?? current.accessMode ?? 'anonymous';
  if (!MODES.has(accessMode)) throw new HttpError(400, '问卷访问方式无效');
  const numberOrNull = (value, label, min = 0) => {
    if (value === undefined) return current[label];
    if (value === null || value === '' || value === 'null') return null;
    const number = Number(value);
    if (!Number.isInteger(number) || number < min) throw new HttpError(400, `${label} 必须是有效数字`);
    return number;
  };
  const policy = {
    accessMode,
    requireLoginToView: input.requireLoginToView === undefined ? Boolean(current.requireLoginToView) : Boolean(input.requireLoginToView),
    maxSubmissionsPerUser: numberOrNull(input.maxSubmissionsPerUser, 'maxSubmissionsPerUser', 1),
    maxSubmissionsTotal: numberOrNull(input.maxSubmissionsTotal, 'maxSubmissionsTotal', 1),
    cooldownSeconds: numberOrNull(input.cooldownSeconds, 'cooldownSeconds', 0),
    startsAt: input.startsAt === undefined ? (current.startsAt || null) : parseDate(input.startsAt, '开放时间'),
  };
  if (policy.accessMode === 'anonymous') policy.requireLoginToView = false;
  if (policy.accessMode !== 'anonymous') policy.requireLoginToView = true;
  if (policy.maxSubmissionsPerUser !== null && policy.accessMode === 'anonymous') {
    throw new HttpError(400, '匿名问卷不能设置按用户限制次数');
  }
  return policy;
}

function parseDate(value, label) {
  if (value === null || value === '') return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new HttpError(400, `${label}格式无效`);
  return date.toISOString();
}

function createAccessPolicyService(db) {
  const select = db.prepare('SELECT * FROM survey_access_policies WHERE survey_id=?');

  function getPolicy(surveyId) {
    const row = select.get(surveyId);
    if (!row) return { surveyId, accessMode: 'anonymous', requireLoginToView: false, maxSubmissionsPerUser: null, maxSubmissionsTotal: null, cooldownSeconds: null, startsAt: null };
    return {
      surveyId: row.survey_id,
      accessMode: row.access_mode,
      requireLoginToView: Boolean(row.require_login_to_view),
      maxSubmissionsPerUser: row.max_submissions_per_user === null ? null : Number(row.max_submissions_per_user),
      maxSubmissionsTotal: row.max_submissions_total === null ? null : Number(row.max_submissions_total),
      cooldownSeconds: row.cooldown_seconds === null ? null : Number(row.cooldown_seconds),
      startsAt: row.starts_at || null,
      updatedAt: row.updated_at
    };
  }

  function savePolicy(surveyId, input = {}) {
    const policy = normalizePolicy(input, getPolicy(surveyId));
    db.prepare(`INSERT INTO survey_access_policies
      (survey_id, access_mode, require_login_to_view, max_submissions_per_user, max_submissions_total, cooldown_seconds, starts_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(survey_id) DO UPDATE SET access_mode=excluded.access_mode,
        require_login_to_view=excluded.require_login_to_view, max_submissions_per_user=excluded.max_submissions_per_user,
        max_submissions_total=excluded.max_submissions_total, cooldown_seconds=excluded.cooldown_seconds,
        starts_at=excluded.starts_at, updated_at=datetime('now')`).run(
      surveyId, policy.accessMode, policy.requireLoginToView ? 1 : 0, policy.maxSubmissionsPerUser,
      policy.maxSubmissionsTotal, policy.cooldownSeconds, policy.startsAt
    );
    return getPolicy(surveyId);
  }

  function viewerState(policy, user) {
    const authenticated = Boolean(user);
    const emailVerified = Boolean(user?.emailVerified);
    const requiresLogin = policy.accessMode !== 'anonymous' || policy.requireLoginToView;
    const authorized = policy.accessMode === 'anonymous'
      || (authenticated && (policy.accessMode === 'account' || emailVerified));
    return { authenticated, emailVerified, requiresLogin, authorized };
  }

  function getUsage(surveyId, userId) {
    const total = Number(db.prepare('SELECT COUNT(*) AS count FROM responses WHERE survey_id=?').get(surveyId).count);
    const mine = userId ? Number(db.prepare('SELECT COUNT(*) AS count FROM responses WHERE survey_id=? AND user_id=?').get(surveyId, userId).count) : 0;
    const last = userId ? db.prepare('SELECT submitted_at FROM responses WHERE survey_id=? AND user_id=? ORDER BY submitted_at DESC LIMIT 1').get(surveyId, userId) : null;
    return { total, mine, lastSubmittedAt: last?.submitted_at || null };
  }

  function authorize(policy, user, { action = 'view', usage } = {}) {
    const state = viewerState(policy, user);
    if (action === 'view' && !policy.requireLoginToView && policy.accessMode === 'anonymous') return state;
    if (!state.authenticated && state.requiresLogin) throw new HttpError(401, '请先登录后继续');
    if (policy.accessMode === 'verified_email' && !state.emailVerified) throw new HttpError(403, '请先验证邮箱后继续');
    if (action === 'submit') {
      const current = usage || getUsage(policy.surveyId, user?.id);
      if (policy.maxSubmissionsTotal !== null && current.total >= policy.maxSubmissionsTotal) throw new HttpError(409, '该问卷已达到最大回收数量');
      if (policy.maxSubmissionsPerUser !== null && current.mine >= policy.maxSubmissionsPerUser) throw new HttpError(409, '你已达到该问卷的最大填写次数');
      if (policy.cooldownSeconds !== null && current.lastSubmittedAt && Date.now() - new Date(current.lastSubmittedAt).getTime() < policy.cooldownSeconds * 1000) {
        throw new HttpError(409, '提交过于频繁，请稍后再试');
      }
    }
    return state;
  }

  function publicPolicy(surveyId, user) {
    const policy = getPolicy(surveyId);
    const state = viewerState(policy, user);
    const usage = user ? getUsage(surveyId, user.id) : null;
    return {
      mode: policy.accessMode,
      requiresLogin: state.requiresLogin,
      requiresVerifiedEmail: policy.accessMode === 'verified_email',
      maxSubmissionsPerUser: policy.maxSubmissionsPerUser,
      maxSubmissionsTotal: policy.maxSubmissionsTotal,
      cooldownSeconds: policy.cooldownSeconds,
      remainingSubmissions: user && policy.maxSubmissionsPerUser !== null ? Math.max(0, policy.maxSubmissionsPerUser - usage.mine) : null,
      totalRemaining: policy.maxSubmissionsTotal !== null ? Math.max(0, policy.maxSubmissionsTotal - (usage?.total || 0)) : null,
      startsAt: policy.startsAt,
      authorized: state.authorized
    };
  }

  return { getPolicy, savePolicy, publicPolicy, authorize, getUsage, viewerState };
}

module.exports = { MODES, normalizePolicy, createAccessPolicyService };
