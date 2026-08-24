'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { openDatabase, migrate } = require('../src/db');
const { createApp } = require('../src/app');

test('题目深拷贝、Token 鉴权和答卷提交流程', async (t) => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'questra-'));
  const db = openDatabase(path.join(tempDir, 'test.db'));
  migrate(db);
  const hookCalls = [];
  const app = createApp({
    db,
    adminToken: 'test-token',
    config: {
      siteName: 'Test Questra',
      hooks: {
        beforeSubmit(data) { hookCalls.push(['before', data]); },
        afterSubmit(data) { hookCalls.push(['after', data]); }
      }
    }
  });
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  const adminHeaders = { authorization: 'Bearer test-token', 'content-type': 'application/json' };

  t.after(() => {
    server.close();
    db.close();
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  const unauthorized = await fetch(`${baseUrl}/api/admin/questions`);
  assert.equal(unauthorized.status, 401);
  assert.match(unauthorized.headers.get('content-type'), /json/);

  const createQuestion = await fetch(`${baseUrl}/api/admin/questions`, {
    method: 'POST', headers: adminHeaders,
    body: JSON.stringify({ title: '原始标题', type: 'single', options: ['A', 'B'], required: true })
  });
  assert.equal(createQuestion.status, 201);
  const question = await createQuestion.json();

  const createSurvey = await fetch(`${baseUrl}/api/admin/surveys`, {
    method: 'POST', headers: adminHeaders,
    body: JSON.stringify({ title: '测试问卷', questionIds: [question.id] })
  });
  assert.equal(createSurvey.status, 201);
  const survey = await createSurvey.json();

  await fetch(`${baseUrl}/api/admin/questions/${question.id}`, {
    method: 'PUT', headers: adminHeaders,
    body: JSON.stringify({ title: '已修改的题池标题', type: 'single', options: ['C', 'D'], required: false })
  });
  const publicSurvey = await (await fetch(`${baseUrl}/api/surveys/${survey.id}`)).json();
  assert.equal(publicSurvey.questions[0].title, '原始标题');
  assert.deepEqual(publicSurvey.questions[0].options, ['A', 'B']);

  const submit = await fetch(`${baseUrl}/api/surveys/${survey.id}/responses`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ answers: { [publicSurvey.questions[0].id]: 'A' } })
  });
  assert.equal(submit.status, 201);
  const result = await submit.json();
  assert.ok(result.id);
  assert.deepEqual(hookCalls.map(([name]) => name), ['before', 'after']);
  assert.equal(hookCalls[1][1].responseId, result.id);

  const responses = await fetch(`${baseUrl}/api/admin/surveys/${survey.id}/responses`, { headers: adminHeaders });
  const responseData = await responses.json();
  assert.equal(responseData.responses.length, 1);
  assert.equal(responseData.responses[0].answers[publicSurvey.questions[0].id], 'A');
});

test('选填单选题允许空答案，过期问卷拒绝提交', async (t) => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'questra-edge-'));
  const db = openDatabase(path.join(tempDir, 'test.db'));
  migrate(db);
  const app = createApp({ db, adminToken: 'token', config: { siteName: 'Test', hooks: {} } });
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  const headers = { authorization: 'Bearer token', 'content-type': 'application/json' };
  t.after(() => {
    server.close();
    db.close();
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  const question = await (await fetch(`${baseUrl}/api/admin/questions`, {
    method: 'POST', headers,
    body: JSON.stringify({ title: '选填题', type: 'single', options: ['A', 'B'], required: false })
  })).json();
  const survey = await (await fetch(`${baseUrl}/api/admin/surveys`, {
    method: 'POST', headers,
    body: JSON.stringify({ title: '选填问卷', questionIds: [question.id] })
  })).json();
  const emptySubmit = await fetch(`${baseUrl}/api/surveys/${survey.id}/responses`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ answers: { [survey.questions[0].id]: '' } })
  });
  assert.equal(emptySubmit.status, 201);

  await fetch(`${baseUrl}/api/admin/surveys/${survey.id}`, {
    method: 'PUT', headers,
    body: JSON.stringify({ expiresAt: '2020-01-01T00:00:00.000Z' })
  });
  const expiredSubmit = await fetch(`${baseUrl}/api/surveys/${survey.id}/responses`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ answers: {} })
  });
  assert.equal(expiredSubmit.status, 410);
});
