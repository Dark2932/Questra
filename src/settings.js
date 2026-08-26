'use strict';

const { HttpError } = require('./lib/http');

const SETTING_KEYS = { siteName: 'site_name', siteIcon: 'site_icon' };

function getSetting(db, key, fallback = '') {
  const row = db.prepare('SELECT value FROM app_settings WHERE key = ?').get(key);
  return row ? row.value : fallback;
}

function setSetting(db, key, value) {
  db.prepare(`
    INSERT INTO app_settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')
  `).run(key, value);
}

function normalizeSiteName(value) {
  const siteName = String(value || '').trim();
  if (siteName.length > 80) throw new HttpError(400, '站点名称不能超过 80 个字符');
  return siteName || 'Questra';
}

function normalizeSiteIcon(value) {
  const siteIcon = String(value || '').trim();
  const maxLength = siteIcon.startsWith('data:image/') ? 180_000 : 500;
  if (siteIcon.length > maxLength) throw new HttpError(400, '站点图标过大或地址超过长度限制');
  if (siteIcon && !/^(https?:\/\/|data:image\/|\/)/i.test(siteIcon)) {
    throw new HttpError(400, '站点图标必须是 http(s)、data:image 或站内路径');
  }
  return siteIcon;
}

function getSiteSettings(db, fallbackName = 'Questra') {
  return {
    siteName: getSetting(db, SETTING_KEYS.siteName, fallbackName || 'Questra') || 'Questra',
    siteIcon: getSetting(db, SETTING_KEYS.siteIcon, '')
  };
}

function updateSiteSettings(db, input = {}) {
  const siteName = normalizeSiteName(input.siteName);
  const siteIcon = normalizeSiteIcon(input.siteIcon);
  setSetting(db, SETTING_KEYS.siteName, siteName);
  setSetting(db, SETTING_KEYS.siteIcon, siteIcon);
  return { siteName, siteIcon: siteIcon || '' };
}

module.exports = { getSetting, setSetting, getSiteSettings, updateSiteSettings, normalizeSiteName, normalizeSiteIcon };
