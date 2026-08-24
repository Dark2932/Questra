'use strict';

/**
 * 极简内存固定窗口限流器，适合单进程低配服务器。
 * 记录以 {key}_{windowStart} 为键的请求计数，窗口过期自然清空，无需定时清理。
 */
function createRateLimit({ windowMs = 60_000, max = 60 }) {
  const hits = new Map();

  function cleanup() {
    const now = Date.now();
    for (const [key, { windowStart }] of hits) {
      if (now - windowStart >= windowMs) hits.delete(key);
    }
  }

  return function rateLimit(req, res, next) {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const keyBase = `${ip}`;
    const windowKey = Math.floor(now / windowMs) * windowMs;
    const entryKey = `${keyBase}_${windowKey}`;

    const entry = hits.get(entryKey) || { count: 0, windowStart: windowKey };
    entry.count += 1;
    hits.set(entryKey, entry);

    // 每 10 次请求清理一次过期项，避免 Map 无限增长。
    if (entry.count % 10 === 0) cleanup();

    const remaining = Math.max(0, max - entry.count);
    res.setHeader('X-RateLimit-Limit', String(max));
    res.setHeader('X-RateLimit-Remaining', String(remaining));

    if (entry.count > max) {
      const retryAfter = Math.ceil((entry.windowStart + windowMs - now) / 1000);
      res.setHeader('Retry-After', String(retryAfter));
      return res.status(429).json({ error: '请求过于频繁，请稍后再试' });
    }
    next();
  };
}

module.exports = { createRateLimit };