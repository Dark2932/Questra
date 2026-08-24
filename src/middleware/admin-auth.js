'use strict';

function parseCookies(header = '') {
  return Object.fromEntries(header.split(';').filter(Boolean).map((part) => {
    const [key, ...value] = part.trim().split('=');
    return [key, decodeURIComponent(value.join('='))];
  }));
}

/**
 * 支持 Authorization、x-admin-token、查询参数和 HttpOnly Cookie。
 * 首次使用 ?token= 访问后写入 Cookie，并重定向移除 URL 中的敏感信息。
 */
function createAdminAuth(adminToken) {
  return function adminAuth(req, res, next) {
    const bearer = req.get('authorization')?.replace(/^Bearer\s+/i, '');
    const cookies = parseCookies(req.get('cookie'));
    const supplied = bearer || req.get('x-admin-token') || req.query.token || cookies.questra_admin_token;

    if (supplied !== adminToken) {
      if (req.originalUrl.startsWith('/api/')) {
        return res.status(401).json({ error: 'Admin Token 无效或缺失' });
      }
      return res.status(401).render('admin/unauthorized', { siteName: res.locals.siteName });
    }

    if (req.query.token === adminToken && !cookies.questra_admin_token) {
      const secure = req.secure ? '; Secure' : '';
      res.setHeader('Set-Cookie', `questra_admin_token=${encodeURIComponent(adminToken)}; Path=/; HttpOnly; SameSite=Lax${secure}`);
    }
    next();
  };
}

module.exports = { createAdminAuth };
