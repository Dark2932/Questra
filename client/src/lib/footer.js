export const DEFAULT_FOOTER_COPYRIGHT = 'Copyright © {year} {siteName}. All rights reserved.';
export const DEFAULT_FOOTER_PROGRAM = 'powered_by';

export const PROGRAM_FOOTER_PRESETS = [
  { value: 'powered_by', label: 'Powered by Questra', prefix: 'Powered by ' },
  { value: 'built_with', label: 'Built with Questra', prefix: 'Built with ' },
  { value: 'open_source', label: '基于 Questra 开源构建', prefix: '基于 ', suffix: ' 开源构建' },
];

// 规范写法为 {year} 与 {siteName}；双花括号只用于兼容历史保存的模板。
const PLACEHOLDER_PATTERN = /(\{\{?\s*(?:year|siteName)\s*\}?\})/gi;

export function footerCopyrightParts(template, year = new Date().getFullYear()) {
  return String(template || '').trim().split(PLACEHOLDER_PATTERN).filter(Boolean).map((part) => {
    const name = part.replace(/[{}]/g, '').trim().toLowerCase();
    if (name === 'year') return { type: 'text', value: String(year) };
    if (name === 'sitename') return { type: 'site' };
    return { type: 'text', value: part };
  });
}

export function programFooterPreset(value) {
  return PROGRAM_FOOTER_PRESETS.find((item) => item.value === value) || PROGRAM_FOOTER_PRESETS[0];
}
