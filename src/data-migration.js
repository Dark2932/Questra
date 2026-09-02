'use strict';

const fs = require('node:fs');
const path = require('node:path');
const Database = require('better-sqlite3');

async function migrateLegacyDefaultData({ config, installationDirectory }) {
  const legacyDirectory = path.join(installationDirectory, 'data');
  const legacyDatabase = path.join(legacyDirectory, 'questra.db');
  const targetDatabase = path.resolve(config.database);

  if (config.databaseSource !== 'default' || targetDatabase === legacyDatabase) return { migrated: false };
  if (fs.existsSync(targetDatabase) || !fs.existsSync(legacyDatabase)) return { migrated: false };

  fs.mkdirSync(path.dirname(targetDatabase), { recursive: true });
  const source = new Database(legacyDatabase, { readonly: true, fileMustExist: true });
  try {
    await source.backup(targetDatabase);
  } catch (error) {
    try {
      fs.rmSync(targetDatabase, { force: true });
    } catch (cleanupError) {
      error.cleanupError = cleanupError;
    }
    throw new Error(`迁移旧数据库失败：${error.message}`, { cause: error });
  } finally {
    source.close();
  }

  const legacyToken = path.join(legacyDirectory, '.admin-token');
  const targetToken = path.join(path.dirname(targetDatabase), '.admin-token');
  if (fs.existsSync(legacyToken) && !fs.existsSync(targetToken)) {
    fs.copyFileSync(legacyToken, targetToken, fs.constants.COPYFILE_EXCL);
  }

  return { migrated: true, legacyDatabase, targetDatabase };
}

module.exports = { migrateLegacyDefaultData };
