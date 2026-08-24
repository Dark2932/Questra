#!/usr/bin/env node

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { Command } = require('commander');
const { randomUUID } = require('node:crypto');
const { loadConfig } = require('../src/config');
const { openDatabase, migrate } = require('../src/db');
const { createApp } = require('../src/app');

const program = new Command();

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
  .action((options) => {
    const config = loadConfig(options.config);
    const port = Number(options.port || process.env.PORT || config.port || 3000);
    const host = options.host || process.env.HOST || config.host || '0.0.0.0';
    const adminToken = process.env.QUESTRA_ADMIN_TOKEN || randomUUID();
    const db = openDatabase(config.database);

    migrate(db);
    const app = createApp({ db, config, adminToken });
    const server = app.listen(port, host, () => {
      console.log('');
      console.log('Questra 已启动');
      console.log(`访问地址: http://${host === '0.0.0.0' ? 'localhost' : host}:${port}`);
      console.log(`管理地址: http://localhost:${port}/admin?token=${adminToken}`);
      console.log(`Admin Token: ${adminToken}`);
      console.log('请妥善保存 Token；服务重启后会重新生成。');
      console.log('');
    });

    // 个人服务器常用 systemd/Docker 停止信号，关闭连接后再退出。
    const shutdown = () => {
      server.close(() => {
        db.close();
        process.exit(0);
      });
    };
    process.once('SIGINT', shutdown);
    process.once('SIGTERM', shutdown);
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
  .command('backup')
  .description('将数据库在线备份到文件（WAL 安全，无需停止服务）')
  .option('-c, --config <path>', '配置文件路径')
  .option('-o, --output <path>', '备份文件输出路径')
  .action(async (options) => {
    const config = loadConfig(options.config);
    const db = openDatabase(config.database);
    const defaultName = `questra-backup-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}.db`;
    const output = path.resolve(process.cwd(), options.output || path.join('data', defaultName));
    console.log(`备份数据库: ${config.database}`);
    console.log(`输出文件: ${output}`);
    fs.mkdirSync(path.dirname(output), { recursive: true });
    await db.backup(output);
    db.close();
    console.log('备份完成。');
  });

program.parseAsync(process.argv).catch((error) => {
  console.error(`启动失败: ${error.message}`);
  process.exitCode = 1;
});
