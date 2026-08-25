'use strict';

const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');
const { execFileSync } = require('node:child_process');

test('顶层 CLI 帮助展开所有子命令选项', () => {
  const cli = path.join(__dirname, '..', 'bin', 'questra.js');
  const output = execFileSync(process.execPath, [cli, '--help'], { encoding: 'utf8' });

  assert.match(output, /命令选项：/);
  assert.match(output, /start\s+[\s\S]*--port <port>/);
  assert.match(output, /start\s+[\s\S]*--foreground/);
  assert.match(output, /migrate\s+[\s\S]*--config <path>/);
  assert.match(output, /backup\s+[\s\S]*--output <path>/);
});
