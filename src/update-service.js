'use strict';

const { execFile } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const packageJson = require('../package.json');
const { HttpError } = require('./lib/http');

const RELEASES_URL = 'https://api.github.com/repos/Dark2932/Questra/releases';
const LATEST_RELEASE_URL = `${RELEASES_URL}?per_page=100&page=1`;
const RELEASE_PAGE_URL = 'https://github.com/Dark2932/Questra/releases';
const SOURCE_REPOSITORY_URL = 'https://github.com/Dark2932/Questra';
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

/**
 * 发布包不会包含这些源码开发文件；通过源码运行时至少会存在其中一项。
 * 这让更新页无需联网即可先禁用不适用于源码构建的操作。
 */
function detectInstallationType(installationDirectory = path.resolve(__dirname, '..')) {
  const root = path.resolve(installationDirectory);
  const sourceMarkers = ['.git', 'pnpm-lock.yaml', 'client/src', 'scripts'];
  return sourceMarkers.some((marker) => fs.existsSync(path.join(root, marker))) ? 'source' : 'global';
}

function createNpmInstaller({
  execFileImpl = execFile,
  platform = process.platform,
  windowsDirectory = process.env.SystemRoot || 'C:\\Windows'
} = {}) {
  return function installVersion(version) {
    const normalized = parseVersion(version).version;
    const npmArgs = ['install', '--global', `questra@${normalized}`, '--no-audit', '--no-fund'];
    const command = platform === 'win32' ? path.win32.join(windowsDirectory, 'System32', 'cmd.exe') : 'npm';
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
  currentVersion = packageJson.version,
  installationType = detectInstallationType()
} = {}) {
  const normalizedCurrentVersion = parseVersion(currentVersion).version;
  let installing = false;

  function getUpdateStatus() {
    const sourceBuild = installationType === 'source';
    return {
      currentVersion: normalizedCurrentVersion,
      installationType,
      sourceBuild,
      updateSupported: !sourceBuild,
      checked: false,
      compliantVersion: null,
      updateAvailable: false,
      releaseUrl: RELEASE_PAGE_URL,
      sourceRepositoryUrl: SOURCE_REPOSITORY_URL
    };
  }

  async function checkForUpdate() {
    const status = getUpdateStatus();
    if (!status.updateSupported) return { ...status, checked: true };

    const releases = [];
    let response;
    for (let page = 1; page <= 10; page += 1) {
      try {
        response = await fetchImpl(`${RELEASES_URL}?per_page=100&page=${page}`, {
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

      let pageReleases;
      try {
        pageReleases = await response.json();
      } catch {
        throw exposedError(502, 'GitHub Releases 返回了无法解析的数据');
      }
      if (!Array.isArray(pageReleases)) pageReleases = pageReleases ? [pageReleases] : [];
      releases.push(...pageReleases);
      if (pageReleases.length < 100) break;
    }

    const officialReleases = releases.map((release) => {
      if (!release || release.draft || release.prerelease) return null;
      try {
        return { release, ...parseVersion(release.tag_name) };
      } catch {
        return null;
      }
    }).filter(Boolean);
    if (!officialReleases.length) {
      throw exposedError(502, 'GitHub Releases 未返回有效的正式版本标签（版本标签无效）');
    }

    const versions = [...new Map(officialReleases.map((item) => [item.version, item])).values()]
      .sort((left, right) => compareVersions(right.version, left.version));
    const latest = versions[0];
    const currentRelease = versions.find((item) => item.version === normalizedCurrentVersion);
    const comparison = compareVersions(latest.version, normalizedCurrentVersion);
    const compliantVersion = Boolean(currentRelease);
    const updateAvailable = compliantVersion && comparison > 0;

    return {
      currentVersion: normalizedCurrentVersion,
      installationType,
      sourceBuild: false,
      updateSupported: compliantVersion,
      checked: true,
      compliantVersion,
      invalidVersion: !compliantVersion,
      latestVersion: latest.version,
      updateAvailable,
      versionsBehind: compliantVersion ? versions.filter((item) => compareVersions(item.version, normalizedCurrentVersion) > 0).length : null,
      previewVersion: false,
      releaseName: String(latest.release.name || latest.release.tag_name || `v${latest.version}`),
      releaseUrl: RELEASE_PAGE_URL,
      sourceRepositoryUrl: SOURCE_REPOSITORY_URL,
      publishedAt: latest.release.published_at || null,
      releaseNotes: String(latest.release.body || '').slice(0, 20_000)
    };
  }

  async function installLatest() {
    const status = getUpdateStatus();
    if (!status.updateSupported) throw exposedError(409, status.sourceBuild ? '源码构建版不支持在线更新，请前往 Questra 源码仓库获取最新版代码' : '当前版本不属于 GitHub Releases 正式版本，请重新安装最新正式版');
    if (installing) throw exposedError(409, '已有更新安装任务正在进行');
    installing = true;
    try {
      const release = await checkForUpdate();
      if (!release.compliantVersion) throw exposedError(409, '当前版本不属于 GitHub Releases 正式版本，请重新安装最新正式版');
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

  return { checkForUpdate, getUpdateStatus, installLatest };
}

module.exports = {
  LATEST_RELEASE_URL,
  RELEASES_URL,
  compareVersions,
  createNpmInstaller,
  createUpdateService,
  detectInstallationType,
  parseVersion
};
