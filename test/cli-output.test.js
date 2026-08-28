'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { accessUrl } = require('../src/cli-output');

test('访问地址使用可访问的主机名和端口', () => {
  assert.equal(accessUrl('0.0.0.0', 3000), 'http://localhost:3000');
  assert.equal(accessUrl('127.0.0.1', 8080), 'http://127.0.0.1:8080');
  assert.equal(accessUrl('::', 3000), 'http://localhost:3000');
  assert.equal(accessUrl('::1', 3000), 'http://[::1]:3000');
});
