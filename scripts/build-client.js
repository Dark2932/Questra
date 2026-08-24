'use strict';

/**
 * npm pack / publish 前自动构建前端产物。
 * 如需在干净的发布机上运行，会先为 client 安装依赖再构建。
 */
const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');

const rootDir = path.join(__dirname, '..');
const clientDir = path.join(rootDir, 'client');
const hasModules = fs.existsSync(path.join(clientDir, 'node_modules'));
const hasDist = fs.existsSync(path.join(clientDir, 'dist', 'index.html'));

function run(command) {
  console.log(`[build-client] ${command}`);
  execSync(command, { cwd: rootDir, stdio: 'inherit' });
}

// prepack（npm pack/publish）时允许复用已有产物；显式 build:client 则始终增量构建。
const isPrepack = process.argv.includes('--prepack');
if (isPrepack && hasDist) {
  console.log('[build-client] client/dist 已存在，prepack 跳过构建。');
} else if (!hasModules) {
  run('cd client && npm install --no-audit --no-fund && npm run build');
} else {
  run('cd client && npm run build');
}