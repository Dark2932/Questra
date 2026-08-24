import { Outlet, useNavigate, Link } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import { Layout, Menu, Space, Typography, Segmented } from 'antd';
import {
  DashboardOutlined,
  FormOutlined,
  UnorderedListOutlined,
  SunOutlined,
  MoonOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { api } from '../../api';

const { Header, Content } = Layout;

export default function AdminLayout({ token, onLogout, theme, resolvedTheme, onThemeChange }) {
  const navigate = useNavigate();
  const verified = useRef(false);

  useEffect(() => {
    if (!token) {
      navigate('/unauthorized', { replace: true });
      return;
    }
    if (verified.current) return;
    verified.current = true;

    api.getDashboard().catch((err) => {
      if (String(err.message).includes('401') || String(err.message).includes('Token')) {
        onLogout();
        navigate('/unauthorized', { replace: true });
      }
    });
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!token) return null;

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
              Q
            </div>
            <Typography.Text strong style={{ fontSize: 16, whiteSpace: 'nowrap' }}>
              Questra
            </Typography.Text>
          </Link>
          <Menu
            mode="horizontal"
            selectedKeys={[location.pathname]}
            items={[
              { key: '/admin', icon: <DashboardOutlined />, label: <Link to="/admin">仪表盘</Link> },
              { key: '/admin/questions', icon: <FormOutlined />, label: <Link to="/admin/questions">问题池</Link> },
              { key: '/admin/surveys', icon: <UnorderedListOutlined />, label: <Link to="/admin/surveys">问卷 / 考试</Link> },
            ]}
            style={{ minWidth: 0, border: 'none', background: 'transparent', color: 'var(--ant-color-text)' }}
          />
        </Space>

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
      </Header>

      <Content style={{ padding: 24, maxWidth: 1200, width: '100%', marginInline: 'auto' }}>
        <Outlet />
      </Content>
    </Layout>
  );
}

