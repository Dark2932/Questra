'use strict';

const { execFile } = require('node:child_process');
const path = require('node:path');
const packageJson = require('../package.json');
const { HttpError } = require('./lib/http');

const LATEST_RELEASE_URL = 'https://api.github.com/repos/Dark2932/Questra/releases/latest';
const RELEASE_PAGE_URL = 'https://github.com/Dark2932/Questra/releases';
const VERSION_PATTERN = /^v?(\d+)\.(\d+)\.(\d+)$/;

function exposedError(status, message) {
  const error = new HttpError(status, message);
  error.expose = true;
  return error;
}

function parseVersion(value) {
  const match = String(value || '').trim().match(VERSION_PATTERN);
  if (!match) throw exposedError(502, 'GitHub Release 的版本标签无效，应为 v1.2.3 或 1.2.3');
  return {
    version: `${match[1]}.${match[2]}.${match[3]}`,
    parts: match.slice(1).map(Number)
  };
}

function compareVersions(left, right) {
  const leftParts = parseVersion(left).parts;
  const rightParts = parseVersion(right).parts;
  for (let index = 0; index < leftParts.length; index += 1) {
    if (leftParts[index] !== rightParts[index]) return leftParts[index] - rightParts[index];
  }
  return 0;
}

function createNpmInstaller({
  execFileImpl = execFile,
  platform = process.platform,
  windowsDirectory = process.env.SystemRoot || 'C:\\Windows'
} = {}) {
  return function installVersion(version) {
    const normalized = parseVersion(version).version;
    const npmArgs = ['install', '--global', `questra@${normalized}`, '--no-audit', '--no-fund'];
    const command = platform === 'win32' ? path.join(windowsDirectory, 'System32', 'cmd.exe') : 'npm';
    const args = platform === 'win32' ? ['/d', '/s', '/c', 'npm.cmd', ...npmArgs] : npmArgs;

    return new Promise((resolve, reject) => {
      execFileImpl(command, args, {
        encoding: 'utf8',
        windowsHide: true,
        shell: false,
        timeout: 10 * 60 * 1000,
        maxBuffer: 1024 * 1024
      }, (error, stdout = '', stderr = '') => {
        const output = [stdout, stderr].filter(Boolean).join('\n').trim().slice(-8000);
        if (error) {
          const detail = output ? `：${output}` : `：${error.message}`;
          reject(exposedError(500, `npm 安装失败${detail}`));
          return;
        }
        resolve(output);
      });
    });
  };
}

function createUpdateService({
  fetchImpl = globalThis.fetch,
  installPackage = createNpmInstaller(),
  currentVersion = packageJson.version
} = {}) {
  const normalizedCurrentVersion = parseVersion(currentVersion).version;
  let installing = false;

  async function checkForUpdate() {
    let response;
    try {
      response = await fetchImpl(LATEST_RELEASE_URL, {
        headers: {
          Accept: 'application/vnd.github+json',
          'User-Agent': `Questra/${normalizedCurrentVersion}`,
          'X-GitHub-Api-Version': '2022-11-28'
        },
        signal: globalThis.AbortSignal.timeout(10_000)
      });
    } catch (error) {
      throw exposedError(502, `无法连接 GitHub Releases：${error.message}`);
    }

    if (!response.ok) {
      const rateLimit = response.status === 403 ? '，可能已达到 GitHub API 访问频率限制' : '';
      throw exposedError(502, `GitHub Releases 请求失败 (${response.status})${rateLimit}`);
    }

    let release;
    try {
      release = await response.json();
    } catch {
      throw exposedError(502, 'GitHub Releases 返回了无法解析的数据');
    }

    if (!release || release.draft || release.prerelease) {
      throw exposedError(502, 'GitHub Releases 未返回可安装的正式版本');
    }

    const latestVersion = parseVersion(release.tag_name).version;
    const comparison = compareVersions(latestVersion, normalizedCurrentVersion);

    return {
      currentVersion: normalizedCurrentVersion,
      latestVersion,
      updateAvailable: comparison > 0,
      previewVersion: comparison < 0,
      releaseName: String(release.name || release.tag_name || `v${latestVersion}`),
      releaseUrl: RELEASE_PAGE_URL,
      publishedAt: release.published_at || null,
      releaseNotes: String(release.body || '').slice(0, 20_000)
    };
  }

  async function installLatest() {
    if (installing) throw exposedError(409, '已有更新安装任务正在进行');
    installing = true;
    try {
      const release = await checkForUpdate();
      if (!release.updateAvailable) throw exposedError(409, '当前已经是最新版本，无需安装');
      const output = await installPackage(release.latestVersion);
      return {
        ...release,
        installedVersion: release.latestVersion,
        restartRequired: true,
        output
      };
    } finally {
      installing = false;
    }
  }

  return { checkForUpdate, installLatest };
}

module.exports = {
  LATEST_RELEASE_URL,
  compareVersions,
  createNpmInstaller,
  createUpdateService,
  parseVersion
};
