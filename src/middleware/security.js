'use strict';

/**
 * 轻量安全响应头，保持零依赖。
 * 生产环境默认启用；开发模式下保留 HMR 与内联脚本能力。
 */
function securityHeaders(req, res, next) {
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
    // SPA 由 Vite 打包为独立 JS/CSS，CSP 可收紧；style-src 需要 unsafe-inline 以兼容 antd style-in-js。
    res.setHeader('Content-Security-Policy', [
      "default-src 'self'",
      "script-src 'self'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data:",
      "font-src 'self' data:",
      "connect-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "frame-ancestors 'none'"
    ].join('; '));
  }
  next();
}

module.exports = { securityHeaders };