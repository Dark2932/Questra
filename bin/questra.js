#!/usr/bin/env node

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { Command } = require('commander');
const { loadConfig } = require('../src/config');
const { loadOrCreateAdminToken } = require('../src/admin-token');
const { openDatabase, migrate } = require('../src/db');
const { createApp } = require('../src/app');
const { accessUrl } = require('../src/cli-output');
const { spawn } = require('node:child_process');
const {
  readRuntimeState,
  writeRuntimeState,
  clearRuntimeState,
  isProcessRunning,
  runtimeLogFile
} = require('../src/runtime-state');

const program = new Command();

function getRunningState() {
  const state = readRuntimeState();
  if (!state) return null;
  if (!isProcessRunning(state.pid)) {
    clearRuntimeState(state.pid);
    return null;
  }
  return state;
}

function terminateProcess(pid) {
  return new Promise((resolve, reject) => {
    try {
      process.kill(Number(pid), 'SIGTERM');
      resolve();
    } catch (error) {
      if (error.code === 'ESRCH') return resolve();
      if (process.platform === 'win32') {
        const killer = spawn('taskkill', ['/PID', String(pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true });
        killer.once('error', reject);
        killer.once('exit', (code) => code === 0 ? resolve() : reject(new Error('无法停止 Questra 进程')));
      } else {
        reject(error);
      }
    }
  });
}

async function waitForProcessExit(pid, timeoutMs = 5000) {
  const deadline = Date.now() + timeoutMs;
  while (isProcessRunning(pid) && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  return !isProcessRunning(pid);
}

program
  .name('questra')
  .description('Questra 轻量级自托管问卷框架')
  .version(require('../package.json').version);

program
  .command('start')
  .description('启动 Questra Web 服务')
  .option('-p, --port <port>', '监听端口')
  .option('-h, --host <host>', '监听地址')
  .option('-c, --config <path>', '配置文件路径')
  .option('--foreground', '在当前终端前台运行（开发或进程管理器使用）')
  .action(async (options) => {
    const existing = getRunningState();
    if (existing) {
      throw new Error('Questra 已在运行中（PID ' + existing.pid + '，端口 ' + existing.port + '）');
    }
    if (!options.foreground && process.env.QUESTRA_DAEMON !== '1') {
      const config = loadConfig(options.config);
      const port = Number(options.port || process.env.PORT || config.port || 3000);
      const host = options.host || process.env.HOST || config.host || '0.0.0.0';
      const args = [path.resolve(__filename), 'start'];
      if (options.port) args.push('--port', String(options.port));
      if (options.host) args.push('--host', String(options.host));
      if (options.config) args.push('--config', path.resolve(process.cwd(), options.config));
      const logFile = runtimeLogFile();
      fs.mkdirSync(path.dirname(logFile), { recursive: true });
      const logHandle = fs.openSync(logFile, 'a');
      const child = spawn(process.execPath, args, {
        cwd: process.cwd(),
        env: { ...process.env, QUESTRA_DAEMON: '1' },
        detached: true,
        stdio: ['ignore', logHandle, logHandle],
        windowsHide: true
      });
      child.unref();
      fs.closeSync(logHandle);
      console.log('Questra 已在后台启动。');
      console.log('访问地址: ' + accessUrl(host, port));
      console.log('日志文件: ' + logFile);
      return;
    }
    const config = loadConfig(options.config);
    const port = Number(options.port || process.env.PORT || config.port || 3000);
    const host = options.host || process.env.HOST || config.host || '0.0.0.0';
    const adminToken = loadOrCreateAdminToken({ database: config.database });
    const configPath = path.resolve(process.cwd(), options.config || 'survey.config.js');
    let db;
    let server;
    let shuttingDown = false;

    const printBanner = () => {
      console.log('');
      console.log('Questra 已启动');
      console.log('访问地址: ' + accessUrl(host, port));
      console.log(`管理地址: http://localhost:${port}/admin?token=${adminToken}`);
      console.log(`Admin Token: ${adminToken}`);
      console.log(`数据目录: ${path.dirname(config.database)}`);
      console.log('Token 已持久化到数据目录 .admin-token 文件，重启后保持不变。');
      console.log(options.foreground
        ? '服务在前台运行，按 Ctrl+C 停止。'
        : '服务在后台运行，请使用外部 questra 命令管理。');
      console.log('');
    };

    const startServer = () => new Promise((resolve, reject) => {
      db = openDatabase(config.database);
      migrate(db);
      const app = createApp({ db, config, adminToken });
      server = app.listen(port, host);
      server.once('listening', () => {
        writeRuntimeState({
          pid: process.pid,
          cwd: process.cwd(),
          configPath,
          database: config.database,
          host,
          port,
          startedAt: new Date().toISOString()
        });
        printBanner();
        resolve();
      });
      server.once('error', (error) => reject(error));
    });

    const closeServer = () => new Promise((resolve, reject) => {
      const currentServer = server;
      const currentDb = db;
      server = null;
      db = null;
      const finish = () => {
        try {
          if (currentDb?.open) currentDb.close();
          clearRuntimeState(process.pid);
          resolve();
        } catch (error) {
          reject(error);
        }
      };
      if (!currentServer) return finish();
      currentServer.close((error) => {
        if (error && error.code !== 'ERR_SERVER_NOT_RUNNING') return reject(error);
        finish();
      });
    });

    const shutdown = async (reason = 'stop') => {
      if (shuttingDown) return;
      shuttingDown = true;
      if (reason === 'stop') console.log('\n正在停止 Questra...');
      try {
        await closeServer();
        console.log('Questra 已停止。');
        process.exitCode = 0;
      } catch (error) {
        console.error(`停止失败: ${error.message}`);
        process.exitCode = 1;
      }
    };

    process.once('SIGINT', () => shutdown());
    process.once('SIGTERM', () => shutdown());
    await startServer();
  });

program
  .command('migrate')
  .description('创建或升级 SQLite 数据库表结构')
  .option('-c, --config <path>', '配置文件路径')
  .action((options) => {
    const config = loadConfig(options.config);
    const db = openDatabase(config.database);
    const applied = migrate(db);
    db.close();
    console.log(applied.length ? `已执行迁移: ${applied.join(', ')}` : '数据库已是最新版本。');
  });

program
  .command('status')
  .description('检查 Questra 运行状态')
  .action(() => {
    const state = getRunningState();
    if (!state) {
      console.log('Questra 未运行。');
      return;
    }
    console.log('Questra 正在运行。');
    console.log('PID: ' + state.pid);
    console.log('地址: ' + accessUrl(state.host, state.port));
    if (state.database) console.log('数据目录: ' + path.dirname(state.database));
    console.log('工作目录: ' + state.cwd);
    console.log('启动时间: ' + state.startedAt);
  });

program
  .command('stop')
  .description('停止正在运行的 Questra')
  .action(async () => {
    const state = getRunningState();
    if (!state) {
      console.log('Questra 未运行。');
      return;
    }
    await terminateProcess(state.pid);
    const stopped = await waitForProcessExit(state.pid);
    if (stopped) {
      clearRuntimeState(state.pid);
      console.log('Questra 已停止。');
    } else {
      console.error('Questra 未能在规定时间内停止，请检查 PID ' + state.pid);
      process.exitCode = 1;
    }
  });

program
  .command('restart')
  .description('重启正在运行的 Questra')
  .action(async () => {
    const state = getRunningState();
    if (!state) {
      console.log('Questra 未运行，请使用 questra start 启动。');
      process.exitCode = 1;
      return;
    }
    await terminateProcess(state.pid);
    if (!(await waitForProcessExit(state.pid))) {
      throw new Error('旧的 Questra 进程未能停止');
    }
    clearRuntimeState(state.pid);
    const args = [path.resolve(__filename), 'start', '--config', state.configPath, '--port', String(state.port), '--host', state.host];
    const child = spawn(process.execPath, args, { cwd: state.cwd, stdio: 'inherit', windowsHide: false });
    child.once('error', (error) => {
      console.error('重启失败: ' + error.message);
      process.exitCode = 1;
    });
  });

program
  .command('help')
  .description('显示命令列表')
  .action(() => program.outputHelp());

program
  .command('backup')
  .description('将数据库在线备份到文件（WAL 安全，无需停止服务）')
  .option('-c, --config <path>', '配置文件路径')
  .option('-o, --output <path>', '备份文件输出路径')
  .action(async (options) => {
    const config = loadConfig(options.config);
    const db = openDatabase(config.database);
    const defaultName = `questra-backup-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}.db`;
    const output = path.resolve(path.dirname(config.database), options.output || defaultName);
    console.log(`备份数据库: ${config.database}`);
    console.log(`输出文件: ${output}`);
    fs.mkdirSync(path.dirname(output), { recursive: true });
    await db.backup(output);
    db.close();
    console.log('备份完成。');
  });

program.addHelpText('after', () => {
  const sections = program.commands
    .filter((command) => command.options.length > 0)
    .map((command) => {
      const help = command.createHelp();
      const options = help.visibleOptions(command);
      const width = Math.max(...options.map((option) => help.optionTerm(option).length));
      const lines = options.map((option) => {
        const term = help.optionTerm(option).padEnd(width);
        return `    ${term}  ${help.optionDescription(option)}`;
      });
      return `  ${command.name()}\n${lines.join('\n')}`;
    });

  return `\n命令选项：\n${sections.join('\n\n')}\n`;
});

if (process.argv.length <= 2) {
  program.outputHelp();
} else {
  program.parseAsync(process.argv).catch((error) => {
    console.error(`启动失败: ${error.message}`);
    process.exitCode = 1;
  });
}
