'use strict';

const fs = require('node:fs');
const path = require('node:path');

/**
 * @typedef {Object} SurveyConfig
 * @property {number} [port]
 * @property {string} [host]
 * @property {string} [database]
 * @property {string} [siteName]
 * @property {boolean} [logging] 是否将 HTTP 请求日志输出到运行终端，默认 true
 * @property {{beforeSubmit?: Function, afterSubmit?: Function}} [hooks]
 */

/** 从启动目录加载配置，便于通过 npx 在任意目录运行。 */
function loadConfig(configPath) {
  const resolved = path.resolve(process.cwd(), configPath || 'survey.config.js');
  let userConfig = {};

  if (fs.existsSync(resolved)) {
    delete require.cache[resolved];
    userConfig = require(resolved);
  }

  const database = userConfig.database || './data/questra.db';
  return {
    port: 3000,
    host: '0.0.0.0',
    siteName: 'Questra',
    logging: true,
    ...userConfig,
    // 相对数据库路径始终以进程启动目录为基准，而不是 npm 包目录。
    database: path.resolve(process.cwd(), database),
    // userConfig.hooks 可能缺省或为 null，这里统一归一化为对象。
    hooks: userConfig.hooks || {}
  };
}

module.exports = { loadConfig };
