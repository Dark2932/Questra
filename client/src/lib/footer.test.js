import { describe, expect, it } from 'vitest';
import {
  DEFAULT_FOOTER_COPYRIGHT,
  footerCopyrightParts,
  programFooterPreset,
} from './footer';

describe('页脚版权配置', () => {
  it('解析 {year} 与 {siteName} 占位符', () => {
    expect(footerCopyrightParts(DEFAULT_FOOTER_COPYRIGHT, 2026)).toEqual([
      { type: 'text', value: 'Copyright © ' },
      { type: 'text', value: '2026' },
      { type: 'text', value: ' ' },
      { type: 'site' },
      { type: 'text', value: '. All rights reserved.' },
    ]);
    expect(footerCopyrightParts('© {year} {siteName}', 2030)).toEqual([
      { type: 'text', value: '© ' },
      { type: 'text', value: '2030' },
      { type: 'text', value: ' ' },
      { type: 'site' },
    ]);
  });

  it('兼容历史双花括号模板，其余文字原样显示', () => {
    expect(footerCopyrightParts('© {{year}} {{siteName}}', 2030)).toEqual([
      { type: 'text', value: '© ' },
      { type: 'text', value: '2030' },
      { type: 'text', value: ' ' },
      { type: 'site' },
    ]);
    expect(footerCopyrightParts('© <年份> {unknown}', 2030)).toEqual([
      { type: 'text', value: '© <年份> {unknown}' },
    ]);
  });

  it('留空时不产生版权文字片段', () => {
    expect(footerCopyrightParts('')).toEqual([]);
    expect(footerCopyrightParts('   ')).toEqual([]);
  });

  it('未知程序版权值回退到默认预设', () => {
    expect(programFooterPreset('built_with').label).toBe('Built with Questra');
    expect(programFooterPreset('unknown').value).toBe('powered_by');
  });
});
