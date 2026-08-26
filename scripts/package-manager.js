'use strict';

const fs = require('node:fs');
const { spawnSync } = require('node:child_process');

function getPackageManager() {
  const userAgent = process.env.npm_config_user_agent || '';
  const name = userAgent.startsWith('pnpm/') ? 'pnpm' : 'npm';
  const cliPath = process.env.npm_execpath;

  if (cliPath && fs.existsSync(cliPath)) {
    return { name, command: process.execPath, prefixArgs: [cliPath], shell: false };
  }

  return {
    name,
    command: process.platform === 'win32' ? `${name}.cmd` : name,
    prefixArgs: [],
    shell: process.platform === 'win32'
  };
}

function runPackageManager(args, options = {}) {
  const manager = options.manager || getPackageManager();
  console.log(`[package-manager] ${manager.name} ${args.join(' ')}`);
  const result = spawnSync(manager.command, [...manager.prefixArgs, ...args], {
    cwd: options.cwd || process.cwd(),
    stdio: 'inherit',
    shell: manager.shell
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}

module.exports = { getPackageManager, runPackageManager };
