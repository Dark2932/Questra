'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { URL } = require('node:url');
const test = require('node:test');
const { openDatabase, migrate } = require('../src/db');
const { createApp } = require('../src/app');

test('普通用户注册、邮箱验证和问卷填写次数限制', async (t) => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'questra-user-'));
  const db = openDatabase(path.join(tempDir, 'test.db'));
  migrate(db);
  const messages = [];
  const app = createApp({
    db,
    adminToken: 'admin-token',
    config: { siteName: 'User Test', publicUrl: 'http://example.test', hooks: {} },
    emailService: {
      configured: true,
      async sendVerificationEmail(message) { messages.push(message); },
      async sendPasswordResetEmail() {}
    }
  });
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  const adminHeaders = { authorization: 'Bearer admin-token', 'content-type': 'application/json' };
  let userCookie;
  t.after(() => { server.close(); db.close(); fs.rmSync(tempDir, { recursive: true, force: true }); });

  const question = await (await fetch(`${baseUrl}/api/admin/questions`, {
    method: 'POST', headers: adminHeaders,
    body: JSON.stringify({ title: '用户题', type: 'single', options: ['A', 'B'], required: true })
  })).json();
  const survey = await (await fetch(`${baseUrl}/api/admin/surveys`, {
    method: 'POST', headers: adminHeaders,
    body: JSON.stringify({ title: '受保护问卷', questionIds: [question.id], accessPolicy: { accessMode: 'verified_email', maxSubmissionsPerUser: 1 } })
  })).json();

  const blocked = await fetch(`${baseUrl}/api/surveys/${survey.id}`);
  assert.equal(blocked.status, 200);
  assert.equal((await blocked.json()).questions, undefined);

  const registered = await fetch(`${baseUrl}/api/user/auth/register`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'person@example.com', password: 'password123', displayName: '测试用户' })
  });
  assert.equal(registered.status, 201);
  assert.equal(messages.length, 1);
  const verificationToken = new URL(messages[0].verifyUrl).searchParams.get('token');
  const verifyPage = await fetch(`${baseUrl}/user/verify?token=${encodeURIComponent(verificationToken)}`);
  assert.equal(verifyPage.status, 200);
  assert.match(verifyPage.headers.get('content-type'), /text\/html/);

  const loginBeforeVerify = await fetch(`${baseUrl}/api/user/auth/login`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'person@example.com', password: 'password123' })
  });
  assert.equal(loginBeforeVerify.status, 200);
  userCookie = loginBeforeVerify.headers.get('set-cookie').split(';')[0];
  const verify = await fetch(`${baseUrl}/api/user/auth/verify`, {
    method: 'POST', headers: { 'content-type': 'application/json', cookie: userCookie },
    body: JSON.stringify({ token: verificationToken })
  });
  assert.equal(verify.status, 200);
  userCookie = verify.headers.get('set-cookie').split(';')[0];

  const allowed = await fetch(`${baseUrl}/api/surveys/${survey.id}`, { headers: { cookie: userCookie } });
  const publicSurvey = await allowed.json();
  assert.equal(publicSurvey.questions.length, 1);
  assert.equal(publicSurvey.accessPolicy.remainingSubmissions, 1);

  const submit = await fetch(`${baseUrl}/api/surveys/${survey.id}/responses`, {
    method: 'POST', headers: { 'content-type': 'application/json', cookie: userCookie },
    body: JSON.stringify({ answers: { [publicSurvey.questions[0].id]: 'A' } })
  });
  assert.equal(submit.status, 201);
  const duplicate = await fetch(`${baseUrl}/api/surveys/${survey.id}/responses`, {
    method: 'POST', headers: { 'content-type': 'application/json', cookie: userCookie },
    body: JSON.stringify({ answers: { [publicSurvey.questions[0].id]: 'A' } })
  });
  assert.equal(duplicate.status, 409);
});
