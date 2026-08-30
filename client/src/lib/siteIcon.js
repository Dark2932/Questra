export const DEFAULT_SITE_ICON = '📜';

export function emojiSiteIconUrl(value = DEFAULT_SITE_ICON) {
  const emoji = String(value || DEFAULT_SITE_ICON).trim() || DEFAULT_SITE_ICON;
  const escaped = emoji.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;'
  }[character]));
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><text x="32" y="48" text-anchor="middle" font-family="Apple Color Emoji,Segoe UI Emoji,Noto Color Emoji,sans-serif" font-size="48">${escaped}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export const DEFAULT_SITE_ICON_URL = emojiSiteIconUrl();
