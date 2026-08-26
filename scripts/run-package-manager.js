'use strict';

const { runPackageManager } = require('./package-manager');

const args = process.argv.slice(2);
if (!args.length) throw new Error('缺少包管理器参数');
runPackageManager(args);
