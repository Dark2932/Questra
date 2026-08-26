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

/**
 * Questra 安装根目录。源码运行时是仓库根目录，npm 安装后是包目录。
 * 默认数据固定在安装根目录，避免从不同工作目录启动时生成多份数据库。
 */
const installationDirectory = path.resolve(__dirname, '..');

/** 从当前目录加载配置；配置中的相对数据库路径以安装根目录为基准。 */
function loadConfig(configPath) {
  const resolved = path.resolve(process.cwd(), configPath || 'survey.config.js');
  let userConfig = {};

  if (fs.existsSync(resolved)) {
    delete require.cache[resolved];
    userConfig = require(resolved);
  }

  const dataDirectory = process.env.QUESTRA_DATA_DIR
    ? path.resolve(installationDirectory, process.env.QUESTRA_DATA_DIR)
    : null;
  const database = dataDirectory
    ? path.join(dataDirectory, 'questra.db')
    : (userConfig.database || path.join(installationDirectory, 'data', 'questra.db'));
  return {
    port: 3000,
    host: '0.0.0.0',
    siteName: 'Questra',
    logging: true,
    ...userConfig,
    // 相对数据库路径始终以 Questra 安装目录为基准，而不是执行命令的目录。
    database: path.resolve(installationDirectory, database),
    // userConfig.hooks 可能缺省或为 null，这里统一归一化为对象。
    hooks: userConfig.hooks || {}
  };
}

module.exports = { loadConfig, installationDirectory };
