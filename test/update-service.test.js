'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const {
  LATEST_RELEASE_URL,
  compareVersions,
  createNpmInstaller,
  createUpdateService,
  parseVersion
} = require('../src/update-service');

function release(overrides = {}) {
  return {
    tag_name: 'v0.4.0',
    name: 'Questra 0.4.0',
    html_url: 'https://github.com/Dark2932/Questra/releases/tag/v0.4.0',
    published_at: '2026-08-31T00:00:00Z',
    body: '更新说明',
    draft: false,
    prerelease: false,
    ...overrides
  };
}

function response(body, overrides = {}) {
  return {
    ok: true,
    status: 200,
    json: async () => body,
    ...overrides
  };
}

test('版本解析和比较只接受稳定的三段版本号', () => {
  assert.equal(parseVersion('v1.2.3').version, '1.2.3');
  assert.equal(compareVersions('1.10.0', '1.9.9') > 0, true);
  assert.equal(compareVersions('0.3.3', 'v0.3.3'), 0);
  assert.throws(() => parseVersion('v1.2.3-beta.1'), /版本标签无效/);
});

test('检测更新解析 GitHub 最新正式 Release', async () => {
  let request;
  const service = createUpdateService({
    currentVersion: '0.3.3',
    fetchImpl: async (url, options) => {
      request = { url, options };
      return response(release());
    }
  });

  const result = await service.checkForUpdate();
  assert.equal(request.url, LATEST_RELEASE_URL);
  assert.equal(request.options.headers['User-Agent'], 'Questra/0.3.3');
  assert.equal(result.currentVersion, '0.3.3');
  assert.equal(result.latestVersion, '0.4.0');
  assert.equal(result.updateAvailable, true);
  assert.equal(result.previewVersion, false);
  assert.equal(result.releaseUrl, 'https://github.com/Dark2932/Questra/releases');
  assert.equal(result.releaseNotes, '更新说明');
});

test('当前版本高于 Release 时标记为开发预览版且不提供安装', async () => {
  const service = createUpdateService({
    currentVersion: '0.4.1',
    fetchImpl: async () => response(release()),
    installPackage: async () => assert.fail('不应执行 npm 安装')
  });

  const result = await service.checkForUpdate();
  assert.equal(result.updateAvailable, false);
  assert.equal(result.previewVersion, true);
  assert.equal(result.releaseUrl, 'https://github.com/Dark2932/Questra/releases');
  await assert.rejects(service.installLatest(), (error) => error.status === 409 && /最新版本/.test(error.message));
});

test('检测更新会明确报告 GitHub 请求和数据错误', async (t) => {
  await t.test('非成功状态', async () => {
    const service = createUpdateService({ fetchImpl: async () => response({}, { ok: false, status: 403 }) });
    await assert.rejects(service.checkForUpdate(), /访问频率限制/);
  });
  await t.test('无效 JSON', async () => {
    const service = createUpdateService({ fetchImpl: async () => response(null, { json: async () => { throw new Error('invalid'); } }) });
    await assert.rejects(service.checkForUpdate(), /无法解析/);
  });
  await t.test('无效标签', async () => {
    const service = createUpdateService({ fetchImpl: async () => response(release({ tag_name: 'latest' })) });
    await assert.rejects(service.checkForUpdate(), /版本标签无效/);
  });
});

test('npm 安装器使用固定包名、校验版本和无 shell 参数', async () => {
  let invocation;
  const installer = createNpmInstaller({
    platform: 'win32',
    windowsDirectory: 'C:\\Windows',
    execFileImpl: (command, args, options, callback) => {
      invocation = { command, args, options };
      callback(null, 'added 1 package', '');
    }
  });

  assert.equal(await installer('v0.4.0'), 'added 1 package');
  assert.equal(invocation.command, 'C:\\Windows\\System32\\cmd.exe');
  assert.deepEqual(invocation.args, ['/d', '/s', '/c', 'npm.cmd', 'install', '--global', 'questra@0.4.0', '--no-audit', '--no-fund']);
  assert.equal(invocation.options.shell, false);
  assert.throws(() => installer('0.4.0 && whoami'), /版本标签无效/);
});

test('安装最新版会重新检测 Release 并返回重启提示', async () => {
  const installed = [];
  const service = createUpdateService({
    currentVersion: '0.3.3',
    fetchImpl: async () => response(release()),
    installPackage: async (version) => {
      installed.push(version);
      return '安装成功';
    }
  });

  const result = await service.installLatest();
  assert.deepEqual(installed, ['0.4.0']);
  assert.equal(result.installedVersion, '0.4.0');
  assert.equal(result.restartRequired, true);
  assert.equal(result.output, '安装成功');
});

test('npm 安装失败时保留可诊断输出', async () => {
  const installer = createNpmInstaller({
    execFileImpl: (command, args, options, callback) => {
      const error = new Error('exit 1');
      callback(error, '', 'EACCES: permission denied');
    }
  });

  await assert.rejects(installer('0.4.0'), /EACCES: permission denied/);
});
