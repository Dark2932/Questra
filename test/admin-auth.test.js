'use strict';

const assert = require('node:assert/strict');
const { Buffer } = require('node:buffer');
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
  const updateCalls = [];
  const updateInfo = {
    currentVersion: '0.3.3', latestVersion: '0.4.0', updateAvailable: true, previewVersion: false,
    releaseName: 'Questra 0.4.0', releaseUrl: 'https://github.com/Dark2932/Questra/releases/tag/v0.4.0',
    publishedAt: null, releaseNotes: '测试版本'
  };
  const updateService = {
    getUpdateStatus: () => ({ currentVersion: '0.3.3', installationType: 'global', sourceBuild: false, updateSupported: true, checked: false }),
    checkForUpdate: async () => { updateCalls.push('check'); return updateInfo; },
    installLatest: async () => { updateCalls.push('install'); return { ...updateInfo, installedVersion: '0.4.0', restartRequired: true, output: 'ok' }; }
  };
  const app = createApp({ db, adminToken: 'legacy-token', config: { siteName: 'Questra', hooks: {} }, updateService });
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  const json = (response) => response.json();
  const cookieFrom = (response) => response.headers.get('set-cookie')?.split(';')[0] || '';
  t.after(() => { server.close(); db.close(); fs.rmSync(tempDir, { recursive: true, force: true }); });

  const initial = await fetch(`${baseUrl}/api/setup/status`);
  assert.deepEqual(await json(initial), { initialized: false, siteName: 'Questra', siteIcon: '', siteIconAsInitial: false, siteInitial: 'Q', siteInitialColor: '#0D9488', themeColor: '#0D9488' });

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

  const unauthorizedUpdate = await fetch(`${baseUrl}/api/admin/update`);
  assert.equal(unauthorizedUpdate.status, 401);
  const update = await fetch(`${baseUrl}/api/admin/update`, { headers: { cookie: setupCookie } });
  assert.deepEqual(await json(update), updateInfo);
  const updateStatus = await fetch(`${baseUrl}/api/admin/update/status`, { headers: { cookie: setupCookie } });
  assert.equal((await json(updateStatus)).installationType, 'global');
  const install = await fetch(`${baseUrl}/api/admin/update/install`, { method: 'POST', headers: { cookie: setupCookie } });
  assert.equal((await json(install)).restartRequired, true);
  assert.deepEqual(updateCalls, ['check', 'install']);

  const nickname = await fetch(`${baseUrl}/api/admin/settings/account`, {
    method: 'PUT', headers: { cookie: setupCookie, 'content-type': 'application/json' },
    body: JSON.stringify({ username: 'admin', nickname: '新昵称' })
  });
  assert.equal((await json(nickname)).requiresLogin, false);
  const renamedMe = await fetch(`${baseUrl}/api/auth/me`, { headers: { cookie: setupCookie } });
  assert.equal((await json(renamedMe)).user.nickname, '新昵称');

  const invalidPassword = await fetch(`${baseUrl}/api/admin/settings/account`, {
    method: 'PUT', headers: { cookie: setupCookie, 'content-type': 'application/json' },
    body: JSON.stringify({ username: 'admin', nickname: '新昵称', currentPassword: 'wrong-password', newPassword: 'new-password-123' })
  });
  assert.equal(invalidPassword.status, 401);

  const updateSite = await fetch(`${baseUrl}/api/admin/settings/site`, {
    method: 'PUT', headers: { cookie: setupCookie, 'content-type': 'application/json' },
    body: JSON.stringify({ siteName: '我的站点', siteIcon: '/static/icon.png', siteIconAsInitial: true, siteInitial: '站点标识', siteInitialColor: 'rgb(255, 0, 128)', themeColor: '#336699' })
  });
  const updatedSite = await json(updateSite);
  assert.equal(updatedSite.site.siteName, '我的站点');
  assert.equal(updatedSite.site.siteIconAsInitial, true);
  assert.equal(updatedSite.site.siteInitial, '站点标识');
  const config = await fetch(`${baseUrl}/api/config`);
  assert.deepEqual(await json(config), { siteName: '我的站点', siteIcon: '/static/icon.png', siteIconAsInitial: true, siteInitial: '站点标识', siteInitialColor: 'rgb(255, 0, 128)', themeColor: '#336699' });

  const uploadedIcon = `data:image/png;base64,${Buffer.alloc(300 * 1024).toString('base64')}`;
  const uploadSiteIcon = await fetch(`${baseUrl}/api/admin/settings/site`, {
    method: 'PUT', headers: { cookie: setupCookie, 'content-type': 'application/json' },
    body: JSON.stringify({ siteIcon: uploadedIcon })
  });
  assert.equal(uploadSiteIcon.status, 200);
  assert.equal((await json(uploadSiteIcon)).site.siteIcon, uploadedIcon);

  const restoreSite = await fetch(`${baseUrl}/api/admin/settings/site`, {
    method: 'PUT', headers: { cookie: setupCookie, 'content-type': 'application/json' },
    body: JSON.stringify({ siteName: 'Questra', siteIcon: '', siteIconAsInitial: false, siteInitial: 'Q', siteInitialColor: '#0D9488' })
  });
  const restoredSite = (await json(restoreSite)).site;
  assert.deepEqual(restoredSite, { siteName: 'Questra', siteIcon: '', siteIconAsInitial: false, siteInitial: 'Q', siteInitialColor: '#0D9488', themeColor: '#336699' });

  const restorePersonalization = await fetch(`${baseUrl}/api/admin/settings/site`, {
    method: 'PUT', headers: { cookie: setupCookie, 'content-type': 'application/json' },
    body: JSON.stringify({ themeColor: '#0D9488' })
  });
  assert.deepEqual((await json(restorePersonalization)).site, { siteName: 'Questra', siteIcon: '', siteIconAsInitial: false, siteInitial: 'Q', siteInitialColor: '#0D9488', themeColor: '#0D9488' });

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
  assert.deepEqual(migrate(db), ['004_admin_accounts_settings.sql', '005_survey_question_revisions.sql', '006_user_auth_and_access.sql']);
  assert.ok(db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'admin_accounts'").get());
  assert.ok(db.prepare("SELECT name FROM pragma_table_info('survey_questions') WHERE name = 'is_active'").get());
});
