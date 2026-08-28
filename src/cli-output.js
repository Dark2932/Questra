'use strict';

function accessUrl(host = '0.0.0.0', port = 3000) {
  const displayHost = host === '0.0.0.0' || host === '::' ? 'localhost' : String(host);
  const normalizedHost = displayHost.includes(':') && !displayHost.startsWith('[')
    ? `[${displayHost}]`
    : displayHost;
  return `http://${normalizedHost}:${port}`;
}

module.exports = { accessUrl };
