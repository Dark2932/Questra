'use strict';

const { getPackageManager, runPackageManager } = require('./package-manager');

const scripts = process.argv.slice(2);
const manager = getPackageManager();

if (!scripts.length) throw new Error('缺少要执行的 package script');
for (const script of scripts) runPackageManager(['run', script], { manager });
