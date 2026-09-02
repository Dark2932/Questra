'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const Database = require('better-sqlite3');
const { migrateLegacyDefaultData } = require('../src/data-migration');

test('旧版默认数据库和 Admin Token 迁移到全局持久目录', async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'questra-legacy-data-'));
  const installationDirectory = path.join(root, 'package');
  const legacyDirectory = path.join(installationDirectory, 'data');
  const targetDatabase = path.join(root, 'persistent', 'questra.db');
  fs.mkdirSync(legacyDirectory, { recursive: true });
  const legacy = new Database(path.join(legacyDirectory, 'questra.db'));
  legacy.exec('CREATE TABLE example (value TEXT); INSERT INTO example VALUES (\'kept\')');
  legacy.close();
  fs.writeFileSync(path.join(legacyDirectory, '.admin-token'), 'test-token\n', 'utf8');
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));

  const result = await migrateLegacyDefaultData({
    config: { database: targetDatabase, databaseSource: 'default' },
    installationDirectory
  });

  assert.equal(result.migrated, true);
  const migrated = new Database(targetDatabase, { readonly: true });
  assert.equal(migrated.prepare('SELECT value FROM example').get().value, 'kept');
  migrated.close();
  assert.equal(fs.readFileSync(path.join(path.dirname(targetDatabase), '.admin-token'), 'utf8'), 'test-token\n');
});

test('迁移不会覆盖已有数据库或处理显式路径', async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'questra-legacy-skip-'));
  const installationDirectory = path.join(root, 'package');
  const legacyDatabase = path.join(installationDirectory, 'data', 'questra.db');
  const targetDatabase = path.join(root, 'persistent', 'questra.db');
  fs.mkdirSync(path.dirname(legacyDatabase), { recursive: true });
  fs.mkdirSync(path.dirname(targetDatabase), { recursive: true });
  fs.writeFileSync(legacyDatabase, 'legacy');
  fs.writeFileSync(targetDatabase, 'existing');
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));

  assert.deepEqual(await migrateLegacyDefaultData({
    config: { database: targetDatabase, databaseSource: 'default' }, installationDirectory
  }), { migrated: false });
  assert.deepEqual(await migrateLegacyDefaultData({
    config: { database: path.join(root, 'explicit.db'), databaseSource: 'config' }, installationDirectory
  }), { migrated: false });
  assert.equal(fs.readFileSync(targetDatabase, 'utf8'), 'existing');
});
