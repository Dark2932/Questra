import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useCallback, useMemo } from 'react';
import { ConfigProvider, App as AntApp, theme as antTheme } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { useTheme } from './hooks/useTheme';
import AdminLayout from './components/layout/AdminLayout';
import Dashboard from './pages/admin/Dashboard';
import Questions from './pages/admin/Questions';
import Surveys from './pages/admin/Surveys';
import Responses from './pages/admin/Responses';
import Survey from './pages/Survey';
import Unauthorized from './pages/Unauthorized';

function useAdminToken() {
  const [token, setToken] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get('token');
    if (urlToken) {
      sessionStorage.setItem('questra_admin_token', urlToken);
      window.history.replaceState({}, '', window.location.pathname + window.location.hash);
      return urlToken;
    }
    return sessionStorage.getItem('questra_admin_token') || '';
  });
  return [token, setToken];
}

export default function App() {
  const [token, setToken] = useAdminToken();
  const { theme, resolvedTheme, setTheme } = useTheme();

  const handleLogout = useCallback(() => {
    sessionStorage.removeItem('questra_admin_token');
    setToken('');
  }, [setToken]);

  const algorithm = resolvedTheme === 'dark' ? antTheme.darkAlgorithm : antTheme.defaultAlgorithm;
  const themeConfig = useMemo(() => ({
    algorithm,
    token: {
      colorPrimary: '#1f6f4a',
      colorSuccess: '#2f9e5f',
      colorInfo: '#4b6a82',
      colorWarning: '#b8860b',
      colorError: '#c0392b',
      colorTextBase: resolvedTheme === 'dark' ? '#e8e8e8' : '#1f2937',
      colorBgBase: resolvedTheme === 'dark' ? '#10131a' : '#ffffff',
      borderRadius: 8,
      fontFamily: 'Inter, "Segoe UI", "Microsoft YaHei", sans-serif',
      colorBgLayout: resolvedTheme === 'dark' ? '#0e1218' : '#f7f8fa',
      colorBgContainer: resolvedTheme === 'dark' ? '#151a23' : '#ffffff',
      colorBorderSecondary: resolvedTheme === 'dark' ? '#1f2733' : '#f0f0f0',
      controlHeight: 38,
      colorLink: '#1f6f4a',
    },
  }), [resolvedTheme, algorithm]);

  return (
    <ConfigProvider theme={themeConfig} locale={zhCN}>
      <AntApp>
        <BrowserRouter>
          <Routes>
            <Route path="/admin" element={<AdminLayout token={token} onLogout={handleLogout} theme={theme} onThemeChange={setTheme} />}>
              <Route index element={<Dashboard />} />
              <Route path="questions" element={<Questions />} />
              <Route path="surveys" element={<Surveys />} />
              <Route path="surveys/:id/responses" element={<Responses />} />
            </Route>
            <Route path="/s/:id" element={<Survey />} />
            <Route path="/unauthorized" element={<Unauthorized />} />
            <Route path="*" element={<Navigate to="/admin" replace />} />
          </Routes>
        </BrowserRouter>
      </AntApp>
    </ConfigProvider>
  );
}

