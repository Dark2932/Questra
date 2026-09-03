'use strict';

const { spawnSync } = require('node:child_process');

function git(args, options = {}) {
  const result = spawnSync('git', args, {
    cwd: process.cwd(),
    encoding: 'utf8',
    ...options
  });
  if (result.error) throw result.error;
  return result;
}

const trackedResult = git(['ls-files', '-z']);
if (trackedResult.status !== 0) {
  throw new Error(trackedResult.stderr.trim() || '无法读取 Git 追踪文件');
}

const tracked = trackedResult.stdout.split('\0').filter(Boolean);
const trackedSet = new Set(tracked);
const forbidden = tracked.filter((file) => {
  const normalized = file.replaceAll('\\', '/');
  const basename = normalized.split('/').at(-1);
  const isEnvExample = /^\.env(?:\..+)?\.example$/.test(basename) || basename === '.env.example';
  return normalized === 'survey.config.js'
    || /(^|\/)(?:package-lock\.json|npm-shrinkwrap\.json|yarn\.lock)$/.test(normalized)
    || (!isEnvExample && /^\.env(?:\.|$)/.test(basename))
    || /(^|\/)(data|backup|backups|coverage|node_modules|dist)(\/|$)/.test(normalized)
    || /\.(?:db|sqlite|sqlite3)(?:-.+)?$/i.test(basename)
    || /\.(?:pem|key|p12|pfx|log)$/i.test(basename)
    || /\.(?:tgz|tsbuildinfo|eslintcache)$/i.test(basename)
    || basename === '.admin-token';
});

const required = [
  'package.json',
  'pnpm-lock.yaml',
  'pnpm-workspace.yaml',
  'client/package.json',
  'survey.config.example.js',
  'migrations/001_initial.sql'
];
const missing = required.filter((file) => !trackedSet.has(file));

const ignorePolicy = [
  ['survey.config.js', true],
  ['.env.production', true],
  ['.env.example', false],
  ['data/questra.db', true],
  ['data/questra.db-wal', true],
  ['client/dist/index.html', true],
  ['client/coverage/index.html', true],
  ['package-lock.json', true],
  ['client/package-lock.json', true],
  ['pnpm-lock.yaml', false],
  ['backup/questra.db', true],
  ['package.tgz', true],
  ['.eslintcache', true],
  ['src/data/fixtures.js', false],
  ['survey.config.example.js', false],
  ['src/app.js', false]
];
const policyErrors = ignorePolicy.flatMap(([file, shouldIgnore]) => {
  const result = git(['check-ignore', '--no-index', '--quiet', '--', file]);
  const ignored = result.status === 0;
  return ignored === shouldIgnore ? [] : [`${file} 应${shouldIgnore ? '' : '不'}被 .gitignore 屏蔽`];
});

const errors = [
  ...forbidden.map((file) => `禁止追踪本地或生成文件: ${file}`),
  ...missing.map((file) => `必要文件未被 Git 追踪: ${file}`),
  ...policyErrors
];

if (errors.length) {
  console.error(errors.map((message) => `- ${message}`).join('\n'));
  process.exitCode = 1;
} else {
  console.log(`仓库策略检查通过（${tracked.length} 个追踪文件）。`);
}
