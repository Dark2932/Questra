const ADMIN_PAGE_NAMES = new Map([
  ['/admin', '仪表盘'],
  ['/admin/questions', '题库'],
  ['/admin/surveys', '问卷与考试'],
  ['/admin/settings', '设置'],
  ['/admin/users', '用户管理'],
  ['/admin/plugins', '插件'],
  ['/admin/login', '管理员登录'],
  ['/admin/setup', '初始化设置'],
  ['/unauthorized', '管理员登录'],
  ['/user/login', '用户登录'],
  ['/user/register', '注册账户'],
  ['/user/verify', '邮箱验证'],
  ['/user/forgot-password', '重置密码'],
  ['/user/reset-password', '设置新密码'],
  ['/user/profile', '账户资料'],
]);

export function pageNameForPath(pathname) {
  if (/^\/admin\/surveys\/[^/]+\/responses\/?$/.test(pathname)) return '回收数据';
  if (/^\/s\/[^/]+\/?$/.test(pathname)) return '问卷';
  return ADMIN_PAGE_NAMES.get(pathname.replace(/\/$/, '') || '/') || 'Questra';
}

export function formatPageTitle(pageName, siteName) {
  return `${pageName || 'Questra'} - ${siteName || 'Questra'}`;
}
