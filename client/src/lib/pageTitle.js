const ADMIN_PAGE_NAMES = new Map([
  ['/admin', '仪表盘'],
  ['/admin/questions', '题库'],
  ['/admin/surveys', '问卷与考试'],
  ['/admin/settings', '设置'],
  ['/admin/login', '管理员登录'],
  ['/admin/setup', '初始化设置'],
  ['/unauthorized', '管理员登录'],
]);

export function pageNameForPath(pathname) {
  if (/^\/admin\/surveys\/[^/]+\/responses\/?$/.test(pathname)) return '回收数据';
  if (/^\/s\/[^/]+\/?$/.test(pathname)) return '问卷';
  return ADMIN_PAGE_NAMES.get(pathname.replace(/\/$/, '') || '/') || 'Questra';
}

export function formatPageTitle(pageName, siteName) {
  return `${pageName || 'Questra'} - ${siteName || 'Questra'}`;
}
