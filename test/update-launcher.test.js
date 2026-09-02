'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { createUpdateLauncher } = require('../src/update-launcher');

test('更新启动器只写入固定任务并启动仓库提供的独立脚本', async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'questra-update-launcher-'));
  const installationDirectory = path.join(root, 'package');
  const updateDirectory = path.join(root, 'update');
  let invocation;
  let unrefCalled = false;
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const launcher = createUpdateLauncher({
    database: path.join(root, 'data', 'questra.db'),
    installationDirectory,
    cliPath: path.join(installationDirectory, 'bin', 'questra.js'),
    cwd: root,
    configPath: path.join(root, 'survey.config.js'),
    port: 3000,
    host: '127.0.0.1',
    parentPid: 1234,
    nodePath: 'node.exe',
    updateDirectory,
    spawnImpl: (command, args, options) => {
      invocation = { command, args, options };
      return { unref: () => { unrefCalled = true; } };
    }
  });

  const result = await launcher('0.4.0');
  const job = JSON.parse(fs.readFileSync(path.join(updateDirectory, 'pending-update.json'), 'utf8'));
  assert.equal(result.updateQueued, true);
  assert.equal(job.version, '0.4.0');
  assert.equal(job.port, 3000);
  assert.equal(typeof job.serviceLogPath, 'string');
  assert.equal(invocation.command, 'node.exe');
  assert.deepEqual(invocation.args, [path.join(updateDirectory, 'update-runner.js'), path.join(updateDirectory, 'pending-update.json')]);
  assert.equal(invocation.options.detached, true);
  assert.equal(unrefCalled, true);
});

test('数据库仍在安装目录时拒绝在线更新', async () => {
  const root = path.join(os.tmpdir(), 'questra-package');
  const launcher = createUpdateLauncher({
    database: path.join(root, 'data', 'questra.db'),
    installationDirectory: root,
    cliPath: path.join(root, 'bin', 'questra.js'),
    cwd: root,
    configPath: path.join(root, 'survey.config.js'),
    port: 3000,
    host: '127.0.0.1'
  });
  await assert.rejects(launcher('0.4.0'), (error) => error.status === 409 && /安装目录/.test(error.message));
});

test('前台和进程托管模式拒绝在线更新', async () => {
  const root = path.join(os.tmpdir(), 'questra-foreground');
  const launcher = createUpdateLauncher({
    database: path.join(os.tmpdir(), 'questra-data', 'questra.db'),
    installationDirectory: root,
    cliPath: path.join(root, 'bin', 'questra.js'),
    cwd: root,
    configPath: path.join(root, 'survey.config.js'),
    port: 3000,
    host: '127.0.0.1',
    foreground: true
  });
  await assert.rejects(launcher('0.4.0'), (error) => error.status === 409 && /进程托管/.test(error.message));
});
