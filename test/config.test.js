'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { loadConfig, installationDirectory } = require('../src/config');

function withoutDataDirectory(action) {
  const previous = process.env.QUESTRA_DATA_DIR;
  delete process.env.QUESTRA_DATA_DIR;
  try {
    return action();
  } finally {
    if (previous === undefined) delete process.env.QUESTRA_DATA_DIR;
    else process.env.QUESTRA_DATA_DIR = previous;
  }
}

test('默认数据库路径绑定安装目录而不是执行目录', () => {
  const originalCwd = process.cwd();
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'questra-config-'));
  try {
    process.chdir(tempDir);
    const config = withoutDataDirectory(() => loadConfig());
    assert.equal(config.database, path.join(installationDirectory, 'data', 'questra.db'));
  } finally {
    process.chdir(originalCwd);
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('QUESTRA_DATA_DIR 可以把数据库放到安装目录之外', () => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'questra-data-'));
  const previous = process.env.QUESTRA_DATA_DIR;
  try {
    process.env.QUESTRA_DATA_DIR = dataDir;
    assert.equal(loadConfig().database, path.join(dataDir, 'questra.db'));
  } finally {
    if (previous === undefined) delete process.env.QUESTRA_DATA_DIR;
    else process.env.QUESTRA_DATA_DIR = previous;
    fs.rmSync(dataDir, { recursive: true, force: true });
  }
});

test('QUESTRA_DATA_DIR 相对路径以安装目录为基准', () => {
  const previous = process.env.QUESTRA_DATA_DIR;
  try {
    process.env.QUESTRA_DATA_DIR = 'persistent-data';
    assert.equal(
      loadConfig().database,
      path.join(installationDirectory, 'persistent-data', 'questra.db')
    );
  } finally {
    if (previous === undefined) delete process.env.QUESTRA_DATA_DIR;
    else process.env.QUESTRA_DATA_DIR = previous;
  }
});

test('配置文件中的相对数据库路径以安装目录为基准', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'questra-config-file-'));
  const configFile = path.join(tempDir, 'custom.config.js');
  fs.writeFileSync(configFile, "module.exports = { database: './custom/data.db' };\n", 'utf8');
  try {
    withoutDataDirectory(() => {
      assert.equal(
        loadConfig(configFile).database,
        path.join(installationDirectory, 'custom', 'data.db')
      );
    });
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('QUESTRA_DATA_DIR 优先于配置文件中的 database', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'questra-data-priority-'));
  const configFile = path.join(tempDir, 'custom.config.js');
  const dataDir = path.join(tempDir, 'persistent');
  const previous = process.env.QUESTRA_DATA_DIR;
  fs.writeFileSync(configFile, "module.exports = { database: './ignored.db' };\n", 'utf8');
  try {
    process.env.QUESTRA_DATA_DIR = dataDir;
    assert.equal(loadConfig(configFile).database, path.join(dataDir, 'questra.db'));
  } finally {
    if (previous === undefined) delete process.env.QUESTRA_DATA_DIR;
    else process.env.QUESTRA_DATA_DIR = previous;
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});
