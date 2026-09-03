import { useNavigate, Link, useLocation, useOutlet } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import { Dropdown, Layout, Space, Typography, Segmented, Button, Tooltip } from 'antd';
import { AnimatePresence, motion } from 'framer-motion';
import {
  DashboardOutlined,
  FormOutlined,
  UnorderedListOutlined,
  SunOutlined,
  MoonOutlined,
  SettingOutlined,
  LogoutOutlined,
  MoreOutlined,
  UserOutlined,
  AppstoreOutlined,
} from '@ant-design/icons';
import { api } from '../../api';
import SiteMark from '../SiteMark';
import SiteFooter from '../SiteFooter';

const { Header, Content, Footer } = Layout;
const ADMIN_NAVIGATION_SECTIONS = ['/admin/questions', '/admin/surveys', '/admin/users', '/admin/plugins', '/admin/settings'];

function adminNavigationSection(pathname) {
  if (pathname === '/admin') return '/admin';
  return ADMIN_NAVIGATION_SECTIONS.find((path) => pathname === path || pathname.startsWith(`${path}/`)) || '/admin';
}

export default function AdminLayout({ authenticated, site, user, onLogout, theme, resolvedTheme, onThemeChange }) {
  const navigate = useNavigate();
  const location = useLocation();
  const outlet = useOutlet();
  const verified = useRef(false);

  useEffect(() => {
    if (!authenticated) {
      navigate('/unauthorized', { replace: true });
      return;
    }
    if (verified.current) return;
    verified.current = true;

    api.getDashboard().catch((err) => {
      if (err.status === 401 || String(err.message).includes('Token')) {
        onLogout();
        navigate('/unauthorized', { replace: true });
      }
    });
  }, [authenticated]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!authenticated) return null;

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingInline: 24,
          height: 52,
          lineHeight: '52px',
          background: resolvedTheme === 'dark'
            ? 'rgba(28, 28, 30, 0.72)'
            : 'rgba(255, 255, 255, 0.72)',
          backdropFilter: 'saturate(180%) blur(20px)',
          WebkitBackdropFilter: 'saturate(180%) blur(20px)',
          borderBottom: `0.5px solid ${resolvedTheme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
        }}
      >
        <Space className="admin-header-main" size={16} align="center">
          <Link to="/admin" style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'inherit', textDecoration: 'none' }}>
            <SiteMark
              siteName={site?.siteName}
              siteInitial={site?.siteInitial}
              siteInitialColor={site?.siteInitialColor || site?.themeColor || (resolvedTheme === 'dark' ? '#30B0A0' : '#0D9488')}
              siteIcon={site?.siteIcon}
              siteIconAsInitial={site?.siteIconAsInitial}
            />
            <Typography.Text strong style={{ fontSize: 16, whiteSpace: 'nowrap' }}>
              {site?.siteName || 'Questra'}
            </Typography.Text>
          </Link>
          <nav className="admin-nav" aria-label="管理导航">
            <Link className={location.pathname === '/admin' ? 'active' : ''} to="/admin"><DashboardOutlined />仪表盘</Link>
            <Link className={location.pathname.startsWith('/admin/questions') ? 'active' : ''} to="/admin/questions"><FormOutlined />题库</Link>
            <Link className={location.pathname.startsWith('/admin/surveys') ? 'active' : ''} to="/admin/surveys"><UnorderedListOutlined />问卷</Link>
            <Link className={location.pathname.startsWith('/admin/users') ? 'active' : ''} to="/admin/users"><UserOutlined />用户</Link>
            <Link className={location.pathname.startsWith('/admin/plugins') ? 'active' : ''} to="/admin/plugins"><AppstoreOutlined />插件</Link>
            <Link className={location.pathname.startsWith('/admin/settings') ? 'active' : ''} to="/admin/settings"><SettingOutlined />设置</Link>
            <Dropdown menu={{ items: [
              { key: '/admin', label: '仪表盘' },
              { key: '/admin/questions', label: '题库' },
              { key: '/admin/surveys', label: '问卷' },
              { key: '/admin/users', label: '用户' },
              { key: '/admin/plugins', label: '插件' },
              { key: '/admin/settings', label: '设置' },
            ], onClick: ({ key }) => navigate(key) }} trigger={['click']}>
              <Button className="admin-nav-more" type="text" size="small" icon={<MoreOutlined />} aria-label="更多导航" />
            </Dropdown>
          </nav>
        </Space>

        <Space className="admin-header-actions" size={8}>
          <Typography.Text type="secondary" className="admin-user-name">{user?.nickname ? `${user.nickname} (管理员)` : '管理员'}</Typography.Text>
          <Button type="text" size="small" icon={<LogoutOutlined />} onClick={onLogout}>退出</Button>
          <Segmented
            size="small"
            value={theme}
            onChange={onThemeChange}
            options={[
              { value: 'light', icon: <Tooltip title="浅色"><SunOutlined /></Tooltip> },
              { value: 'dark', icon: <Tooltip title="深色"><MoonOutlined /></Tooltip> },
              { value: 'system', icon: <Tooltip title="跟随系统"><SettingOutlined /></Tooltip> },
            ]}
          />
        </Space>
      </Header>

      <Content style={{ padding: 24, maxWidth: 1200, width: '100%', marginInline: 'auto' }}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={adminNavigationSection(location.pathname)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.12, ease: 'easeOut' }}>
            {outlet}
          </motion.div>
        </AnimatePresence>
      </Content>
      <Footer className="admin-footer"><SiteFooter site={site} /></Footer>
    </Layout>
  );
}

