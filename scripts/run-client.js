'use strict';

const path = require('node:path');
const { getPackageManager, runPackageManager } = require('./package-manager');

const rootDir = path.join(__dirname, '..');
const clientDir = path.join(rootDir, 'client');
const task = process.argv[2];
const manager = getPackageManager();

if (!task) throw new Error('缺少前端任务名称');

if (task === 'install') {
  const args = manager.name === 'pnpm'
    ? ['install', '--filter', 'questra-client...']
    : ['install', '--no-audit', '--no-fund'];
  runPackageManager(args, { manager, cwd: manager.name === 'pnpm' ? rootDir : clientDir });
} else {
  runPackageManager(['run', task], { manager, cwd: clientDir });
}
