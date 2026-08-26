'use strict';

/**
 * 使用当前调用者的包管理器构建前端产物。
 */
const fs = require('node:fs');
const path = require('node:path');
const { getPackageManager, runPackageManager } = require('./package-manager');

const rootDir = path.join(__dirname, '..');
const clientDir = path.join(rootDir, 'client');
const hasModules = fs.existsSync(path.join(clientDir, 'node_modules'));

const manager = getPackageManager();
const isPrepack = process.argv.includes('--prepack');

if (isPrepack && manager.name === 'pnpm') {
  runPackageManager(['install', '--frozen-lockfile', '--filter', 'questra-client...'], { manager, cwd: rootDir });
} else if (!hasModules) {
  const installArgs = manager.name === 'pnpm'
    ? ['install', '--filter', 'questra-client...']
    : ['install', '--no-audit', '--no-fund'];
  runPackageManager(installArgs, { manager, cwd: manager.name === 'pnpm' ? rootDir : clientDir });
}

runPackageManager(['run', 'build'], { manager, cwd: clientDir });
