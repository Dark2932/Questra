import { useNavigate, Link, useLocation, useOutlet } from 'react-router-dom';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Layout, Space, Typography, Segmented, Button } from 'antd';
import { motion } from 'framer-motion';
import {
  DashboardOutlined,
  FormOutlined,
  UnorderedListOutlined,
  SunOutlined,
  MoonOutlined,
  SettingOutlined,
  LogoutOutlined,
} from '@ant-design/icons';
import { api } from '../../api';

const { Header, Content } = Layout;

export default function AdminLayout({ authenticated, site, user, onLogout, theme, resolvedTheme, onThemeChange }) {
  const navigate = useNavigate();
  const location = useLocation();
  const outlet = useOutlet();
  const verified = useRef(false);
  const previousPath = useRef(location.pathname);
  const revealTimer = useRef(null);
  const pendingOutlet = useRef(outlet);
  const [displayedOutlet, setDisplayedOutlet] = useState(outlet);
  const [transitionPhase, setTransitionPhase] = useState(null);
  pendingOutlet.current = outlet;

  useLayoutEffect(() => {
    if (previousPath.current === location.pathname) return undefined;
    previousPath.current = location.pathname;
    setTransitionPhase('cover');
    revealTimer.current = window.setTimeout(() => {
      setDisplayedOutlet(pendingOutlet.current);
      setTransitionPhase('reveal');
    }, 260);
    return () => window.clearTimeout(revealTimer.current);
  }, [location.pathname]);

  useEffect(() => () => window.clearTimeout(revealTimer.current), []);

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
    <Layout style={{ height: '100vh', overflow: 'hidden' }}>
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
        <Space size={16} align="center">
          <Link to="/admin" style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'inherit', textDecoration: 'none' }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                background: resolvedTheme === 'dark'
                  ? 'linear-gradient(135deg, #30B0A0, #1a8a7a)'
                  : 'linear-gradient(135deg, #0D9488, #0f766e)',
                color: '#fff',
                display: 'grid',
                placeItems: 'center',
                fontWeight: 800,
                fontSize: 13,
                flexShrink: 0,
              }}
            >
              {site?.siteIcon
                ? <img src={site.siteIcon} alt="" style={{ width: 28, height: 28, objectFit: 'cover', borderRadius: 8 }} />
                : <span style={{ display: 'block', lineHeight: 1, transform: 'translateY(-1px)' }}>Q</span>}
            </div>
            <Typography.Text strong style={{ fontSize: 16, whiteSpace: 'nowrap' }}>
              {site?.siteName || 'Questra'}
            </Typography.Text>
          </Link>
          <nav className="admin-nav" aria-label="管理导航">
            <Link className={location.pathname === '/admin' ? 'active' : ''} to="/admin"><DashboardOutlined />仪表盘</Link>
            <Link className={location.pathname.startsWith('/admin/questions') ? 'active' : ''} to="/admin/questions"><FormOutlined />题库</Link>
            <Link className={location.pathname.startsWith('/admin/surveys') ? 'active' : ''} to="/admin/surveys"><UnorderedListOutlined />问卷 / 考试</Link>
            <Link className={location.pathname.startsWith('/admin/settings') ? 'active' : ''} to="/admin/settings"><SettingOutlined />设置</Link>
          </nav>
        </Space>

        <Space size={8}>
          <Typography.Text type="secondary" className="admin-user-name">{user?.nickname || '管理员'}</Typography.Text>
          <Button type="text" size="small" icon={<LogoutOutlined />} onClick={onLogout}>退出</Button>
          <Segmented
            size="small"
            value={theme}
            onChange={onThemeChange}
            options={[
              { value: 'light', icon: <SunOutlined /> },
              { value: 'dark', icon: <MoonOutlined /> },
              { value: 'system', icon: <SettingOutlined /> },
            ]}
          />
        </Space>
      </Header>

      <Content style={{ padding: 24, maxWidth: 1200, width: '100%', marginInline: 'auto', overflowY: 'auto', minHeight: 0 }}>
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.28, ease: 'easeOut' }}
        >
          {displayedOutlet}
        </motion.div>
      </Content>
      {transitionPhase && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: transitionPhase === 'cover' ? 1 : 0 }}
          transition={{ duration: transitionPhase === 'cover' ? 0.26 : 0.34, ease: 'easeInOut' }}
          onAnimationComplete={() => {
            if (transitionPhase === 'reveal') setTransitionPhase(null);
          }}
          aria-hidden="true"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            background: '#000',
            pointerEvents: 'all',
          }}
        />
      )}
    </Layout>
  );
}

