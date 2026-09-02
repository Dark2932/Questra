'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { openDatabase, migrate } = require('../src/db');
const { createApp } = require('../src/app');

function utcDay(offset = 0) {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}

test('仪表盘接口按真实答卷聚合指标、趋势和最新流水', async (t) => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'questra-dashboard-'));
  const db = openDatabase(path.join(tempDir, 'test.db'));
  migrate(db);
  const app = createApp({ db, adminToken: 'dashboard-token', config: { siteName: 'Test', hooks: {} } });
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  const headers = { authorization: 'Bearer dashboard-token' };
  t.after(() => {
    server.close();
    db.close();
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  db.prepare("INSERT INTO question_pool (title, type) VALUES ('题目一', 'text'), ('题目二', 'text')").run();
  const insertSurvey = db.prepare('INSERT INTO surveys (id, title, status, expires_at, kind, max_score) VALUES (?, ?, ?, ?, ?, ?)');
  insertSurvey.run('survey-a', '客户反馈', 'active', null, 'survey', null);
  insertSurvey.run('exam-a', '安全考试', 'active', null, 'exam', 100);
  insertSurvey.run('expired-a', '已过期问卷', 'active', '2020-01-01 00:00:00', 'survey', null);
  insertSurvey.run('closed-a', '已关闭问卷', 'closed', null, 'survey', null);

  const insertResponse = db.prepare('INSERT INTO responses (id, survey_id, submitted_at, score, max_score) VALUES (?, ?, ?, ?, ?)');
  insertResponse.run('response-yesterday', 'exam-a', `${utcDay(-1)} 09:00:00`, 80, 100);
  insertResponse.run('response-today-exam', 'exam-a', `${utcDay()} 10:00:00`, 100, 100);
  insertResponse.run('response-today-survey', 'survey-a', `${utcDay()} 11:00:00`, null, null);
  insertResponse.run('response-old', 'exam-a', `${utcDay(-10)} 08:00:00`, 0, 100);

  const response = await fetch(`${baseUrl}/api/admin/dashboard?range=custom&startDate=${utcDay(-1)}&endDate=${utcDay()}`, { headers });
  assert.equal(response.status, 200);
  const dashboard = await response.json();

  assert.deepEqual(dashboard.range, { type: 'custom', startDate: utcDay(-1), endDate: utcDay() });
  assert.equal(dashboard.totals.questions, 2);
  assert.equal(dashboard.totals.surveys, 4);
  assert.equal(dashboard.totals.active_surveys, 2);
  assert.equal(dashboard.totals.activeSurveys, 2);
  assert.equal(dashboard.totals.responses, 4);
  assert.equal(dashboard.totals.averageExamScore7d, 90);
  assert.deepEqual(dashboard.trend, [
    { day: utcDay(-1), count: 1 },
    { day: utcDay(), count: 2 }
  ]);
  assert.deepEqual(dashboard.trendBySurvey.map(({ day, surveyId, count }) => ({ day, surveyId, count })), [
    { day: utcDay(-1), surveyId: 'exam-a', count: 1 },
    { day: utcDay(), surveyId: 'exam-a', count: 1 },
    { day: utcDay(), surveyId: 'survey-a', count: 1 }
  ]);
  assert.deepEqual(dashboard.surveyTotals.map(({ surveyId, count }) => ({ surveyId, count })), [
    { surveyId: 'exam-a', count: 2 },
    { surveyId: 'survey-a', count: 1 }
  ]);
  assert.equal(dashboard.recentResponses[0].id, 'response-today-survey');
  assert.equal(dashboard.recentResponses[0].status, 'submitted');
  assert.equal(dashboard.recentResponses[1].status, 'graded');
  assert.equal(dashboard.recentResponses[1].score, 100);
  assert.ok(Array.isArray(dashboard.recentSurveys), '应保留原有最近实例字段');
});

test('仪表盘接口拒绝无效或过大的自定义日期范围', async (t) => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'questra-dashboard-range-'));
  const db = openDatabase(path.join(tempDir, 'test.db'));
  migrate(db);
  const app = createApp({ db, adminToken: 'dashboard-token', config: { siteName: 'Test', hooks: {} } });
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  const headers = { authorization: 'Bearer dashboard-token' };
  t.after(() => {
    server.close();
    db.close();
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  const missingEnd = await fetch(`${baseUrl}/api/admin/dashboard?range=custom&startDate=2026-01-01`, { headers });
  assert.equal(missingEnd.status, 400);
  const invalidDate = await fetch(`${baseUrl}/api/admin/dashboard?range=custom&startDate=2026-02-30&endDate=2026-03-01`, { headers });
  assert.equal(invalidDate.status, 400);
  const tooLarge = await fetch(`${baseUrl}/api/admin/dashboard?range=custom&startDate=2025-01-01&endDate=2026-01-02`, { headers });
  assert.equal(tooLarge.status, 400);
});
