import { describe, expect, it } from 'vitest';
import { formatPageTitle, pageNameForPath } from './pageTitle';

describe('page titles', () => {
  it('maps admin routes to their visible page names', () => {
    expect(pageNameForPath('/admin')).toBe('仪表盘');
    expect(pageNameForPath('/admin/questions')).toBe('题库');
    expect(pageNameForPath('/admin/surveys/123/responses')).toBe('回收数据');
    expect(pageNameForPath('/admin/plugins')).toBe('插件');
    expect(pageNameForPath('/admin/login')).toBe('管理员登录');
    expect(pageNameForPath('/unauthorized')).toBe('管理员登录');
  });

  it('formats the page and site names with a hyphen', () => {
    expect(formatPageTitle('仪表盘', '小明的问卷网站')).toBe('仪表盘 - 小明的问卷网站');
    expect(formatPageTitle('满意度调查', '小明的问卷网站')).toBe('满意度调查 - 小明的问卷网站');
  });
});
