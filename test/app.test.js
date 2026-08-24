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
  assert.equal(responseData.responses[0].answers[publicSurvey.questions[0].id].value, 'A');
});

test('考试权重计分、答案保密和逐题分值模式', async (t) => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'questra-exam-'));
  const db = openDatabase(path.join(tempDir, 'test.db'));
  migrate(db);
  const app = createApp({ db, adminToken: 'exam-token', config: { siteName: 'Test', hooks: {} } });
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  const headers = { authorization: 'Bearer exam-token', 'content-type': 'application/json' };
  t.after(() => {
    server.close();
    db.close();
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  async function addQuestion(payload) {
    const response = await fetch(`${baseUrl}/api/admin/questions`, {
      method: 'POST', headers, body: JSON.stringify({ required: true, ...payload })
    });
    assert.equal(response.status, 201);
    return response.json();
  }

  const single = await addQuestion({ title: '单选', type: 'single', options: ['A', 'B'], correctAnswer: 'A' });
  const multiple = await addQuestion({ title: '多选', type: 'multiple', options: ['A', 'B', 'C'], correctAnswer: ['A', 'C'] });
  const text = await addQuestion({ title: '文本', type: 'text', options: [], correctAnswer: ['Node.js', 'nodejs'] });

  const invalidWeight = await fetch(`${baseUrl}/api/admin/surveys`, {
    method: 'POST', headers,
    body: JSON.stringify({
      kind: 'exam', title: '错误权重', questionIds: [single.id, multiple.id, text.id],
      scoringMode: 'weighted', totalScore: 100, typeWeights: { single: 40, multiple: 30, text: 20 }
    })
  });
  assert.equal(invalidWeight.status, 400);

  const examResponse = await fetch(`${baseUrl}/api/admin/surveys`, {
    method: 'POST', headers,
    body: JSON.stringify({
      kind: 'exam', title: '权重考试', questionIds: [single.id, multiple.id, text.id],
      scoringMode: 'weighted', totalScore: 100, typeWeights: { single: 40, multiple: 30, text: 30 }
    })
  });
  assert.equal(examResponse.status, 201);
  const exam = await examResponse.json();
  assert.deepEqual(exam.questions.map((question) => question.points), [40, 30, 30]);

  const publicExam = await (await fetch(`${baseUrl}/api/surveys/${exam.id}`)).json();
  assert.equal(publicExam.kind, 'exam');
  assert.equal(publicExam.maxScore, 100);
  assert.equal('correctAnswer' in publicExam.questions[0], false);

  const submit = await fetch(`${baseUrl}/api/surveys/${exam.id}/responses`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ answers: {
      [publicExam.questions[0].id]: 'A',
      [publicExam.questions[1].id]: ['A'],
      [publicExam.questions[2].id]: ' NODE.JS '
    } })
  });
  assert.equal(submit.status, 201);
  const score = await submit.json();
  assert.equal(score.score, 70);
  assert.equal(score.maxScore, 100);

  const detail = await (await fetch(`${baseUrl}/api/admin/surveys/${exam.id}/responses`, { headers })).json();
  assert.deepEqual(detail.responses[0].score, 70);
  assert.equal(detail.responses[0].answers[publicExam.questions[1].id].isCorrect, false);

  const perQuestionResponse = await fetch(`${baseUrl}/api/admin/surveys`, {
    method: 'POST', headers,
    body: JSON.stringify({
      kind: 'exam', title: '逐题考试', questionIds: [single.id, multiple.id], scoringMode: 'per_question',
      questionScores: { [single.id]: 5, [multiple.id]: 15 }
    })
  });
  assert.equal(perQuestionResponse.status, 201);
  const perQuestionExam = await perQuestionResponse.json();
  assert.equal(perQuestionExam.maxScore, 20);
  assert.deepEqual(perQuestionExam.questions.map((question) => question.points), [5, 15]);
});

test('健康检查与提交限流', async (t) => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'questra-limit-'));
  const db = openDatabase(path.join(tempDir, 'test.db'));
  migrate(db);
  const app = createApp({ db, adminToken: 'limit-token', config: { siteName: 'Test', hooks: {} } });
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  t.after(() => {
    server.close();
    db.close();
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  const health = await fetch(`${baseUrl}/api/health`);
  assert.equal(health.status, 200);
  const healthData = await health.json();
  assert.equal(healthData.status, 'ok');
  assert.equal(healthData.database, 'ok');

  const question = await (await fetch(`${baseUrl}/api/admin/questions`, {
    method: 'POST', headers: { authorization: 'Bearer limit-token', 'content-type': 'application/json' },
    body: JSON.stringify({ title: '限流题', type: 'single', options: ['A', 'B'], required: false })
  })).json();
  const survey = await (await fetch(`${baseUrl}/api/admin/surveys`, {
    method: 'POST', headers: { authorization: 'Bearer limit-token', 'content-type': 'application/json' },
    body: JSON.stringify({ title: '限流问卷', questionIds: [question.id] })
  })).json();

  // 提交限流上限为 30，前 30 次成功，第 31 次应返回 429。
  const body = { answers: { [survey.questions[0].id]: 'A' } };
  let last;
  for (let i = 0; i < 31; i++) {
    last = await fetch(`${baseUrl}/api/surveys/${survey.id}/responses`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body)
    });
  }
  assert.equal(last.status, 429);
  assert.ok(Number(last.headers.get('Retry-After')) > 0);
  const limited = await last.json();
  assert.equal(typeof limited.error, 'string');
});

test('答卷导出 CSV 与 JSON', async (t) => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'questra-export-'));
  const db = openDatabase(path.join(tempDir, 'test.db'));
  migrate(db);
  const app = createApp({ db, adminToken: 'export-token', config: { siteName: 'Test', hooks: {} } });
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  const headers = { authorization: 'Bearer export-token', 'content-type': 'application/json' };
  t.after(() => {
    server.close();
    db.close();
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  const question = await (await fetch(`${baseUrl}/api/admin/questions`, {
    method: 'POST', headers,
    body: JSON.stringify({ title: '编辑器,包含逗号', type: 'single', options: ['A', 'B'], required: true })
  })).json();
  const survey = await (await fetch(`${baseUrl}/api/admin/surveys`, {
    method: 'POST', headers,
    body: JSON.stringify({ title: '导出问卷', questionIds: [question.id] })
  })).json();
  await fetch(`${baseUrl}/api/surveys/${survey.id}/responses`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ answers: { [survey.questions[0].id]: 'A' } })
  });

  const csv = await fetch(`${baseUrl}/api/admin/surveys/${survey.id}/export`, { headers });
  assert.equal(csv.status, 200);
  const csvText = await csv.text();
  assert.match(csvText, /编辑器,包含逗号/);
  assert.match(csvText, /提交时间/);
  // text() 解码时会剥离 BOM，改用原始头部字节验证 UTF-8 BOM。
  const csvBytes = await (await fetch(`${baseUrl}/api/admin/surveys/${survey.id}/export`, { headers })).arrayBuffer();
  assert.deepEqual([...new Uint8Array(csvBytes, 0, 3)], [0xef, 0xbb, 0xbf], 'CSV 应带 UTF-8 BOM');

  const json = await fetch(`${baseUrl}/api/admin/surveys/${survey.id}/export?format=json`, { headers });
  assert.equal(json.status, 200);
  const jsonData = await json.json();
  assert.equal(jsonData.responses.length, 1);
  assert.equal(jsonData.responses[0].answers[survey.questions[0].id], 'A');
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
