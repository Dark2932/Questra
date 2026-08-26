'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const testDir = path.join(__dirname, '..', 'test');
const files = fs.readdirSync(testDir)
  .filter((file) => file.endsWith('.test.js'))
  .sort()
  .map((file) => path.join(testDir, file));

if (!files.length) throw new Error('未找到 test/*.test.js');

const result = spawnSync(process.execPath, ['--test', ...files], {
  cwd: path.join(__dirname, '..'),
  stdio: 'inherit'
});

if (result.error) throw result.error;
process.exit(result.status ?? 1);
