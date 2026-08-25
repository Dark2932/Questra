'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');

/**
 * 管理 Admin Token 的持久化，策略：
 * 1. 优先使用环境变量 QUESTRA_ADMIN_TOKEN（便于反向代理 / systemd 固定）；
 * 2. 否则复用数据库目录下 .admin-token 文件中保存的 Token；
 * 3. 文件缺失时生成随机 Token 并写入（0600 权限），重启后保持不变。
 *
 * 这样 `npm run dev`（node --watch 会自动重启后端）期间不丢登录状态，
 * 只有删除文件或显式设置环境变量才能更换 Token。
 */
function loadOrCreateAdminToken({ database, envToken = process.env.QUESTRA_ADMIN_TOKEN }) {
  if (envToken) return envToken;
  const file = path.join(path.dirname(database), '.admin-token');
  try {
    if (fs.existsSync(file)) {
      const saved = fs.readFileSync(file, 'utf8').trim();
      if (saved) return saved;
    }
    const token = randomUUID();
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, `${token}\n`, { mode: 0o600 });
    return token;
  } catch {
    // 文件系统只读等受限环境下退化为每次随机，不阻断启动。
    return randomUUID();
  }
}

module.exports = { loadOrCreateAdminToken };