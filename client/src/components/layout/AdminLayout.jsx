import { Outlet, useNavigate, Link } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import { Layout, Menu, Space, Typography, Segmented, Button } from 'antd';
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

export default function AdminLayout({ token, onLogout, theme, onThemeChange }) {
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
          height: 56,
          lineHeight: '56px',
          background: 'var(--ant-color-bg-container)',
          borderBottom: '1px solid var(--ant-color-border-secondary)',
        }}
      >
        <Space size={16} align="center">
          <Link to="/admin" style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'inherit', textDecoration: 'none' }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                background: 'linear-gradient(135deg, #1f6f4a, #3b8b6a)',
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

