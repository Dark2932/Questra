'use strict';

const { HttpError } = require('./lib/http');

const DEFAULT_INITIAL_COLOR = '#0D9488';
const DEFAULT_THEME_COLOR = '#0D9488';
const DEFAULT_SITE_ICON_URL = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><text x="32" y="48" text-anchor="middle" font-family="Apple Color Emoji,Segoe UI Emoji,Noto Color Emoji,sans-serif" font-size="48">📜</text></svg>')}`;
const SETTING_KEYS = {
  siteName: 'site_name',
  siteIcon: 'site_icon',
  siteIconAsInitial: 'site_icon_as_initial',
  siteInitial: 'site_initial',
  siteInitialColor: 'site_initial_color',
  themeColor: 'theme_color'
};

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
  const maxLength = siteIcon.startsWith('data:image/') ? 1_400_000 : 500;
  if (siteIcon.length > maxLength) throw new HttpError(400, '站点图标过大或地址超过长度限制');
  if (siteIcon && !/^(https?:\/\/|data:image\/|\/)/i.test(siteIcon)) {
    throw new HttpError(400, '站点图标必须是 http(s)、data:image 或站内路径');
  }
  return siteIcon;
}

function normalizeSiteIconAsInitial(value) {
  return value === true || value === 1 || value === '1' || String(value).toLowerCase() === 'true';
}

function siteNameCharacters(siteName) {
  return Array.from(siteName || 'Questra');
}

function normalizeSiteInitial(value, siteName) {
  const initial = String(value || '').trim();
  return initial || siteNameCharacters(siteName)[0];
}

function normalizeColor(value, fallback, label) {
  const color = String(value || '').trim();
  if (!color) return fallback;
  let valid = /^#[0-9a-f]{3}(?:[0-9a-f])?$|^#[0-9a-f]{6}(?:[0-9a-f]{2})?$/i.test(color);
  const rgb = color.match(/^rgba?\(\s*([^,]+)\s*,\s*([^,]+)\s*,\s*([^,\s]+)(?:\s*,\s*([^,\s]+))?\s*\)$/i);
  if (rgb) {
    const channelsValid = rgb.slice(1, 4).every((channel) => {
      if (/%$/.test(channel)) return Number.parseFloat(channel) >= 0 && Number.parseFloat(channel) <= 100;
      return Number.isInteger(Number(channel)) && Number(channel) >= 0 && Number(channel) <= 255;
    });
    const alphaValid = !rgb[4] || (/%$/.test(rgb[4])
      ? Number.parseFloat(rgb[4]) >= 0 && Number.parseFloat(rgb[4]) <= 100
      : Number(rgb[4]) >= 0 && Number(rgb[4]) <= 1);
    valid = channelsValid && alphaValid;
  }
  if (!valid) throw new HttpError(400, `${label}格式无效，请使用 HEX 或 RGB/RGBA`);
  return color;
}

function getSiteSettings(db, fallbackName = 'Questra') {
  const siteName = getSetting(db, SETTING_KEYS.siteName, fallbackName || 'Questra') || 'Questra';
  return {
    siteName,
    siteIcon: getSetting(db, SETTING_KEYS.siteIcon, ''),
    siteIconAsInitial: normalizeSiteIconAsInitial(getSetting(db, SETTING_KEYS.siteIconAsInitial, '0')),
    siteInitial: normalizeSiteInitial(getSetting(db, SETTING_KEYS.siteInitial, ''), siteName),
    siteInitialColor: normalizeColor(getSetting(db, SETTING_KEYS.siteInitialColor, DEFAULT_INITIAL_COLOR), DEFAULT_INITIAL_COLOR, '标识背景色'),
    themeColor: normalizeColor(getSetting(db, SETTING_KEYS.themeColor, DEFAULT_THEME_COLOR), DEFAULT_THEME_COLOR, '主题色')
  };
}

function updateSiteSettings(db, input = {}) {
  const current = getSiteSettings(db);
  const value = (key) => Object.prototype.hasOwnProperty.call(input, key) ? input[key] : current[key];
  const siteName = normalizeSiteName(value('siteName'));
  const siteIcon = normalizeSiteIcon(value('siteIcon'));
  const siteIconAsInitial = normalizeSiteIconAsInitial(value('siteIconAsInitial'));
  const siteInitial = normalizeSiteInitial(value('siteInitial'), siteName);
  const siteInitialColor = normalizeColor(value('siteInitialColor'), DEFAULT_INITIAL_COLOR, '标识背景色');
  const themeColor = normalizeColor(value('themeColor'), DEFAULT_THEME_COLOR, '主题色');
  setSetting(db, SETTING_KEYS.siteName, siteName);
  setSetting(db, SETTING_KEYS.siteIcon, siteIcon);
  setSetting(db, SETTING_KEYS.siteIconAsInitial, siteIconAsInitial ? '1' : '0');
  setSetting(db, SETTING_KEYS.siteInitial, siteInitial);
  setSetting(db, SETTING_KEYS.siteInitialColor, siteInitialColor);
  setSetting(db, SETTING_KEYS.themeColor, themeColor);
  return { siteName, siteIcon: siteIcon || '', siteIconAsInitial, siteInitial, siteInitialColor, themeColor };
}

module.exports = {
  DEFAULT_INITIAL_COLOR,
  DEFAULT_THEME_COLOR,
  DEFAULT_SITE_ICON_URL,
  getSetting,
  setSetting,
  getSiteSettings,
  updateSiteSettings,
  normalizeSiteName,
  normalizeSiteIcon,
  normalizeSiteInitial,
  normalizeColor
};
