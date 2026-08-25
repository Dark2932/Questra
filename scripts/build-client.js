'use strict';

/**
 * 构建前端产物。npm pack / publish 时先按锁文件重装前端依赖，
 * 确保发布包不会复用陈旧的 client/dist。
 */
const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');

const rootDir = path.join(__dirname, '..');
const clientDir = path.join(rootDir, 'client');
const hasModules = fs.existsSync(path.join(clientDir, 'node_modules'));

function run(command) {
  console.log(`[build-client] ${command}`);
  execSync(command, { cwd: rootDir, stdio: 'inherit' });
}

// 发布必须从 lockfile 还原依赖；日常构建仅在依赖缺失时安装。
const isPrepack = process.argv.includes('--prepack');
if (isPrepack || !hasModules) run('npm ci --prefix client --no-audit --no-fund');
run('npm run build --prefix client');
