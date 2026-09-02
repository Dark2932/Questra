'use strict';

const fs = require('node:fs');
const path = require('node:path');

function detectInstallationType(installationDirectory = path.resolve(__dirname, '..')) {
  const root = path.resolve(installationDirectory);
  const sourceMarkers = ['.git', 'pnpm-lock.yaml', 'client/src', 'scripts'];
  return sourceMarkers.some((marker) => fs.existsSync(path.join(root, marker))) ? 'source' : 'global';
}

function isPathInside(parent, candidate) {
  const relative = path.relative(path.resolve(parent), path.resolve(candidate));
  return relative === '' || (!relative.startsWith('..' + path.sep) && relative !== '..' && !path.isAbsolute(relative));
}

module.exports = { detectInstallationType, isPathInside };
