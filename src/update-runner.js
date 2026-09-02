'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn, spawnSync } = require('node:child_process');

const VERSION_PATTERN = /^\d+\.\d+\.\d+$/;

function isProcessRunning(pid) {
  try {
    process.kill(Number(pid), 0);
    return true;
  } catch (error) {
    return error.code === 'EPERM';
  }
}

async function waitForExit(pid, timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;
  while (isProcessRunning(pid) && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  if (isProcessRunning(pid)) throw new Error('等待旧 Questra 进程退出超时');
}

function writeStatus(directory, status) {
  const target = path.join(directory, 'status.json');
  const temporary = `${target}.${process.pid}.tmp`;
  fs.writeFileSync(temporary, JSON.stringify(status, null, 2), 'utf8');
  fs.renameSync(temporary, target);
}

function installPackage(version, logHandle) {
  const npmArgs = ['install', '--global', `questra@${version}`, '--no-audit', '--no-fund'];
  const command = process.platform === 'win32'
    ? path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'cmd.exe')
    : 'npm';
  const args = process.platform === 'win32' ? ['/d', '/s', '/c', 'npm.cmd', ...npmArgs] : npmArgs;
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    windowsHide: true,
    shell: false,
    timeout: 10 * 60 * 1000,
    maxBuffer: 1024 * 1024
  });
  if (result.stdout) fs.writeSync(logHandle, result.stdout);
  if (result.stderr) fs.writeSync(logHandle, result.stderr);
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`npm 安装退出，状态码 ${result.status}`);
}

function startQuestra(job) {
  const args = [job.cliPath, 'start', '--port', String(job.port), '--host', job.host, '--config', job.configPath];
  fs.mkdirSync(path.dirname(job.serviceLogPath), { recursive: true });
  const serviceLogHandle = fs.openSync(job.serviceLogPath, 'a');
  const child = spawn(job.nodePath, args, {
    cwd: job.cwd,
    env: { ...process.env, QUESTRA_DAEMON: '1' },
    detached: true,
    stdio: ['ignore', serviceLogHandle, serviceLogHandle],
    windowsHide: true
  });
  child.unref();
  fs.closeSync(serviceLogHandle);
}

async function run(jobPath) {
  const updateDirectory = path.dirname(path.resolve(jobPath));
  const job = JSON.parse(fs.readFileSync(jobPath, 'utf8'));
  if (!VERSION_PATTERN.test(String(job.version || ''))) throw new Error('更新任务中的版本号无效');
  const logPath = path.join(updateDirectory, 'update.log');
  const logHandle = fs.openSync(logPath, 'a');
  const startedAt = new Date().toISOString();
  let error = null;

  try {
    fs.writeSync(logHandle, `\n[${startedAt}] 开始安装 Questra ${job.version}${os.EOL}`);
    writeStatus(updateDirectory, { state: 'waiting', version: job.version, startedAt, logPath });
    await waitForExit(job.parentPid);
    writeStatus(updateDirectory, { state: 'installing', version: job.version, startedAt, logPath });
    installPackage(job.version, logHandle);
    writeStatus(updateDirectory, { state: 'installed', version: job.version, startedAt, finishedAt: new Date().toISOString(), logPath });
  } catch (caught) {
    error = caught;
    fs.writeSync(logHandle, `[${new Date().toISOString()}] 更新失败: ${caught.stack || caught.message}${os.EOL}`);
    writeStatus(updateDirectory, {
      state: 'failed',
      version: job.version,
      startedAt,
      finishedAt: new Date().toISOString(),
      error: String(caught.message || caught).slice(-4000),
      logPath
    });
  }

  try {
    startQuestra(job);
    fs.writeSync(logHandle, `[${new Date().toISOString()}] 已请求重新启动 Questra${os.EOL}`);
  } catch (restartError) {
    fs.writeSync(logHandle, `[${new Date().toISOString()}] 重新启动失败: ${restartError.stack || restartError.message}${os.EOL}`);
    if (!error) throw restartError;
  } finally {
    fs.closeSync(logHandle);
  }

  if (error) process.exitCode = 1;
}

if (require.main === module) {
  run(process.argv[2]).catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

module.exports = { installPackage, run, startQuestra, waitForExit };
