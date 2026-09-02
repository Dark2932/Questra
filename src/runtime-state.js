'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

function runtimeDirectory() {
  return path.join(os.homedir(), '.questra');
}

function runtimeFile() {
  return process.env.QUESTRA_RUNTIME_FILE
    ? path.resolve(process.env.QUESTRA_RUNTIME_FILE)
    : path.join(runtimeDirectory(), 'runtime.json');
}

function runtimeLogFile() {
  return process.env.QUESTRA_LOG_FILE
    ? path.resolve(process.env.QUESTRA_LOG_FILE)
    : path.join(runtimeDirectory(), 'questra.log');
}

function readRuntimeState() {
  try {
    return JSON.parse(fs.readFileSync(runtimeFile(), 'utf8'));
  } catch {
    return null;
  }
}

function writeRuntimeState(state) {
  const file = runtimeFile();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temporary = file + '.' + process.pid + '.tmp';
  fs.writeFileSync(temporary, JSON.stringify(state, null, 2), 'utf8');
  fs.renameSync(temporary, file);
}

function clearRuntimeState(pid) {
  const current = readRuntimeState();
  if (current && (!pid || Number(current.pid) === Number(pid))) {
    try {
      fs.unlinkSync(runtimeFile());
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }
}

function isProcessRunning(pid) {
  if (!Number.isInteger(Number(pid)) || Number(pid) <= 0) return false;
  try {
    process.kill(Number(pid), 0);
    return true;
  } catch (error) {
    return error.code === 'EPERM';
  }
}

module.exports = {
  runtimeDirectory,
  runtimeFile,
  runtimeLogFile,
  readRuntimeState,
  writeRuntimeState,
  clearRuntimeState,
  isProcessRunning
};
