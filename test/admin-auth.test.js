'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { openDatabase, migrate } = require('../src/db');
const { createApp } = require('../src/app');

test('首次初始化、账号登录和设置只允许一组管理员账户', async (t) => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'questra-admin-'));
  const db = openDatabase(path.join(tempDir, 'test.db'));
  migrate(db);
  const app = createApp({ db, adminToken: 'legacy-token', config: { siteName: 'Questra', hooks: {} } });
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  const json = (response) => response.json();
  const cookieFrom = (response) => response.headers.get('set-cookie')?.split(';')[0] || '';
  t.after(() => { server.close(); db.close(); fs.rmSync(tempDir, { recursive: true, force: true }); });

  const initial = await fetch(`${baseUrl}/api/setup/status`);
  assert.deepEqual(await json(initial), { initialized: false, siteName: 'Questra', siteIcon: '' });

  const setup = await fetch(`${baseUrl}/api/setup`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ nickname: '站点管理员', username: 'admin', password: 'password-123', siteName: '', siteIcon: '' })
  });
  assert.equal(setup.status, 201);
  const setupCookie = cookieFrom(setup);
  assert.ok(setupCookie.startsWith('questra_session='));

  const duplicate = await fetch(`${baseUrl}/api/setup`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ nickname: '另一个管理员', username: 'admin2', password: 'password-123' })
  });
  assert.equal(duplicate.status, 409);

  const me = await fetch(`${baseUrl}/api/auth/me`, { headers: { cookie: setupCookie } });
  assert.equal((await json(me)).user.username, 'admin');

  const settings = await fetch(`${baseUrl}/api/admin/settings`, { headers: { cookie: setupCookie } });
  assert.equal((await json(settings)).site.siteName, 'Questra');

  const nickname = await fetch(`${baseUrl}/api/admin/settings/account`, {
    method: 'PUT', headers: { cookie: setupCookie, 'content-type': 'application/json' },
    body: JSON.stringify({ username: 'admin', nickname: '新昵称' })
  });
  assert.equal((await json(nickname)).requiresLogin, false);

  const invalidPassword = await fetch(`${baseUrl}/api/admin/settings/account`, {
    method: 'PUT', headers: { cookie: setupCookie, 'content-type': 'application/json' },
    body: JSON.stringify({ username: 'admin', nickname: '新昵称', currentPassword: 'wrong-password', newPassword: 'new-password-123' })
  });
  assert.equal(invalidPassword.status, 401);

  const updateSite = await fetch(`${baseUrl}/api/admin/settings/site`, {
    method: 'PUT', headers: { cookie: setupCookie, 'content-type': 'application/json' },
    body: JSON.stringify({ siteName: '我的站点', siteIcon: '/static/icon.png' })
  });
  assert.equal((await json(updateSite)).site.siteName, '我的站点');
  const config = await fetch(`${baseUrl}/api/config`);
  assert.deepEqual(await json(config), { siteName: '我的站点', siteIcon: '/static/icon.png' });

  const login = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'password-123' })
  });
  assert.equal(login.status, 200);
  assert.ok(cookieFrom(login).startsWith('questra_session='));

  const legacy = await fetch(`${baseUrl}/api/admin/dashboard`, { headers: { authorization: 'Bearer legacy-token' } });
  assert.equal(legacy.status, 200);
});

test('旧数据库可以通过新增迁移升级到管理员账户结构', (t) => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'questra-upgrade-'));
  const db = openDatabase(path.join(tempDir, 'old.db'));
  t.after(() => { db.close(); fs.rmSync(tempDir, { recursive: true, force: true }); });
  db.exec("CREATE TABLE schema_migrations (name TEXT PRIMARY KEY, applied_at TEXT NOT NULL DEFAULT (datetime('now')))");
  for (const name of ['001_initial.sql', '002_exam_scoring.sql', '003_groups_random_edit.sql']) {
    db.exec(fs.readFileSync(path.join(__dirname, '..', 'migrations', name), 'utf8'));
    db.prepare('INSERT INTO schema_migrations (name) VALUES (?)').run(name);
  }
  assert.deepEqual(migrate(db), ['004_admin_accounts_settings.sql']);
  assert.ok(db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'admin_accounts'").get());
});
