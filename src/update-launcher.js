'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { HttpError } = require('./lib/http');
const { isPathInside } = require('./installation');
const { runtimeDirectory, runtimeLogFile } = require('./runtime-state');

const VERSION_PATTERN = /^\d+\.\d+\.\d+$/;

function createUpdateLauncher({
  database,
  installationDirectory,
  cliPath,
  cwd,
  configPath,
  port,
  host,
  foreground = false,
  parentPid = process.pid,
  nodePath = process.execPath,
  spawnImpl = spawn,
  updateDirectory = path.join(runtimeDirectory(), 'update')
}) {
  return async function queueUpdate(version) {
    const normalizedVersion = String(version || '').trim();
    if (!VERSION_PATTERN.test(normalizedVersion)) {
      throw new HttpError(400, '更新版本号无效');
    }
    if (foreground) {
      const error = new HttpError(409, '前台或进程托管模式无法安全在线更新。请先停止进程管理器，再使用 npm 手动安装新版本');
      error.expose = true;
      throw error;
    }
    if (isPathInside(installationDirectory, database)) {
      const error = new HttpError(409, '数据库位于 Questra 安装目录内，无法安全在线更新。请先通过 QUESTRA_DATA_DIR 或 database 配置将数据迁移到安装目录之外');
      error.expose = true;
      throw error;
    }

    fs.mkdirSync(updateDirectory, { recursive: true });
    const runnerPath = path.join(updateDirectory, 'update-runner.js');
    const jobPath = path.join(updateDirectory, 'pending-update.json');
    const temporaryJobPath = `${jobPath}.${parentPid}.tmp`;
    fs.copyFileSync(path.join(__dirname, 'update-runner.js'), runnerPath);
    fs.writeFileSync(temporaryJobPath, JSON.stringify({
      version: normalizedVersion,
      parentPid,
      nodePath,
      cliPath: path.resolve(cliPath),
      cwd: path.resolve(cwd),
      configPath: path.resolve(configPath),
      port: Number(port),
      host: String(host),
      serviceLogPath: runtimeLogFile()
    }, null, 2), 'utf8');
    fs.renameSync(temporaryJobPath, jobPath);

    const child = spawnImpl(nodePath, [runnerPath, jobPath], {
      detached: true,
      stdio: 'ignore',
      windowsHide: true
    });
    await new Promise((resolve, reject) => {
      if (typeof child.once !== 'function') return resolve();
      child.once('error', reject);
      child.once('spawn', resolve);
    });
    child.unref?.();

    return {
      updateQueued: true,
      restartRequired: true,
      output: '更新任务已排队，Questra 将关闭服务、完成安装并自动重启。'
    };
  };
}

module.exports = { createUpdateLauncher };
