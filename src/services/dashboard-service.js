'use strict';

const { HttpError } = require('../lib/http');

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MAX_RANGE_DAYS = 366;
const RECENT_RESPONSE_LIMIT = 20;

function utcDateString(date) {
  return date.toISOString().slice(0, 10);
}

function shiftUtcDate(dateString, days) {
  const date = new Date(`${dateString}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return utcDateString(date);
}

function parseDate(value, label) {
  const text = String(value || '');
  if (!DATE_PATTERN.test(text)) throw new HttpError(400, `${label}格式无效，请使用 YYYY-MM-DD`);
  const date = new Date(`${text}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || utcDateString(date) !== text) {
    throw new HttpError(400, `${label}不是有效日期`);
  }
  return text;
}

function dateRange(query = {}, now = new Date()) {
  const type = String(query.range || 'week');
  const today = utcDateString(now);
  let startDate;
  let endDate;

  if (type === 'week') {
    startDate = shiftUtcDate(today, -6);
    endDate = today;
  } else if (type === 'month') {
    startDate = shiftUtcDate(today, -29);
    endDate = today;
  } else if (type === 'custom') {
    startDate = parseDate(query.startDate, '开始日期');
    endDate = parseDate(query.endDate, '结束日期');
  } else {
    throw new HttpError(400, '统计范围无效');
  }

  if (startDate > endDate) throw new HttpError(400, '开始日期不能晚于结束日期');
  const days = [];
  for (let day = startDate; day <= endDate; day = shiftUtcDate(day, 1)) {
    days.push(day);
    if (days.length > MAX_RANGE_DAYS) throw new HttpError(400, `统计范围不能超过 ${MAX_RANGE_DAYS} 天`);
  }

  return { type, startDate, endDate, days };
}

function toIsoTimestamp(value) {
  if (!value) return null;
  return `${String(value).replace(' ', 'T')}Z`;
}

function sqliteTimestamp(date) {
  return date.toISOString().replace('T', ' ').slice(0, 19);
}

function getDashboardData(db, query = {}, options = {}) {
  const now = options.now || new Date();
  const range = dateRange(query, now);
  const today = utcDateString(now);
  const totalsRow = db.prepare(`
    SELECT
      (SELECT COUNT(*) FROM question_pool) AS questions,
      (SELECT COUNT(*) FROM surveys) AS surveys,
      (SELECT COUNT(*) FROM surveys WHERE status = 'active' AND (expires_at IS NULL OR datetime(expires_at) > datetime('now'))) AS active_surveys,
      (SELECT COUNT(*) FROM responses) AS responses,
      (SELECT AVG(r.score * 100.0 / r.max_score)
        FROM responses r JOIN surveys s ON s.id = r.survey_id
        WHERE s.kind = 'exam' AND r.score IS NOT NULL AND r.max_score > 0
          AND date(r.submitted_at) BETWEEN date(?, '-6 day') AND date(?)) AS average_exam_score_7d
  `).get(today, today);

  const trendRows = db.prepare(`
    SELECT date(r.submitted_at) AS day, s.id AS survey_id, s.title AS survey_title, s.kind,
      COUNT(*) AS count
    FROM responses r
    JOIN surveys s ON s.id = r.survey_id
    WHERE date(r.submitted_at) BETWEEN date(?) AND date(?)
    GROUP BY date(r.submitted_at), s.id, s.title, s.kind
    ORDER BY day, s.created_at, s.id
  `).all(range.startDate, range.endDate);

  const countsByDay = new Map(range.days.map((day) => [day, 0]));
  const surveyTotals = new Map();
  const trendBySurvey = trendRows.map((row) => {
    const count = Number(row.count || 0);
    countsByDay.set(row.day, (countsByDay.get(row.day) || 0) + count);
    const current = surveyTotals.get(row.survey_id) || {
      surveyId: row.survey_id,
      surveyTitle: row.survey_title,
      kind: row.kind,
      count: 0
    };
    current.count += count;
    surveyTotals.set(row.survey_id, current);
    return {
      day: row.day,
      surveyId: row.survey_id,
      surveyTitle: row.survey_title,
      kind: row.kind,
      count
    };
  });

  const recentResponses = db.prepare(`
    SELECT r.id, r.submitted_at, r.score, r.max_score,
      s.id AS survey_id, s.title AS survey_title, s.kind,
      u.display_name
    FROM responses r
    JOIN surveys s ON s.id = r.survey_id
    LEFT JOIN users u ON u.id = r.user_id
    ORDER BY datetime(r.submitted_at) DESC, r.rowid DESC
    LIMIT ?
  `).all(RECENT_RESPONSE_LIMIT).map((row) => ({
    id: row.id,
    submittedAt: toIsoTimestamp(row.submitted_at),
    surveyId: row.survey_id,
    surveyTitle: row.survey_title,
    kind: row.kind,
    participant: row.display_name ? { displayName: row.display_name } : null,
    score: row.score === null ? null : Number(row.score),
    maxScore: row.max_score === null ? null : Number(row.max_score),
    status: row.score === null ? 'submitted' : 'graded'
  }));

  const averageExamScore7d = totalsRow.average_exam_score_7d === null
    ? null
    : Math.round(Number(totalsRow.average_exam_score_7d) * 10) / 10;
  const totals = {
    questions: Number(totalsRow.questions || 0),
    surveys: Number(totalsRow.surveys || 0),
    active_surveys: Number(totalsRow.active_surveys || 0),
    activeSurveys: Number(totalsRow.active_surveys || 0),
    responses: Number(totalsRow.responses || 0),
    averageExamScore7d
  };

  const todayRow = db.prepare(`
    SELECT
      COUNT(*) AS response_count,
      SUM(CASE WHEN s.kind = 'exam' THEN 1 ELSE 0 END) AS exam_count,
      SUM(CASE WHEN s.kind = 'exam' AND r.score IS NOT NULL AND r.max_score > 0 THEN 1 ELSE 0 END) AS graded_exam_count,
      SUM(CASE WHEN s.kind = 'exam' AND r.score IS NOT NULL AND r.max_score > 0 AND r.score * 100.0 / r.max_score >= 60 THEN 1 ELSE 0 END) AS passed_exam_count
    FROM responses r JOIN surveys s ON s.id = r.survey_id
    WHERE date(r.submitted_at) = date(?)
  `).get(today);
  const gradedExamCount = Number(todayRow.graded_exam_count || 0);
  const todayOverview = {
    responses: Number(todayRow.response_count || 0),
    exams: Number(todayRow.exam_count || 0),
    passRate: gradedExamCount ? Math.round(Number(todayRow.passed_exam_count || 0) * 1000 / gradedExamCount) / 10 : null
  };

  const highErrorQuestions = db.prepare(`
    SELECT q.id, q.title, COUNT(a.id) AS attempts,
      SUM(CASE WHEN a.is_correct = 0 THEN 1 ELSE 0 END) AS errors
    FROM answers a
    JOIN survey_questions q ON q.id = a.survey_question_id
    WHERE a.is_correct IS NOT NULL
    GROUP BY q.id, q.title
    HAVING COUNT(a.id) >= 3
      AND SUM(CASE WHEN a.is_correct = 0 THEN 1 ELSE 0 END) * 1.0 / COUNT(a.id) >= 0.5
    ORDER BY errors * 1.0 / attempts DESC, attempts DESC, q.id
    LIMIT 5
  `).all().map((row) => ({
    id: row.id,
    title: row.title,
    attempts: Number(row.attempts),
    errorRate: Math.round(Number(row.errors || 0) * 1000 / Number(row.attempts || 1)) / 10
  }));

  const expiringSurveys = db.prepare(`
    SELECT id, title, kind, expires_at
    FROM surveys
    WHERE status = 'active'
      AND expires_at IS NOT NULL
      AND datetime(expires_at) > datetime(?)
      AND datetime(expires_at) <= datetime(?, '+7 day')
    ORDER BY datetime(expires_at), title
    LIMIT 5
  `).all(sqliteTimestamp(now), sqliteTimestamp(now)).map((row) => ({
    id: row.id,
    title: row.title,
    kind: row.kind,
    expiresAt: toIsoTimestamp(row.expires_at)
  }));

  return {
    totals,
    range: { type: range.type, startDate: range.startDate, endDate: range.endDate },
    trend: range.days.map((day) => ({ day, count: countsByDay.get(day) || 0 })),
    trendBySurvey,
    surveyTotals: [...surveyTotals.values()].sort((a, b) => b.count - a.count || a.surveyTitle.localeCompare(b.surveyTitle, 'zh-CN')),
    recentResponses,
    todayOverview,
    alerts: { highErrorQuestions, expiringSurveys }
  };
}

module.exports = { dateRange, getDashboardData };
