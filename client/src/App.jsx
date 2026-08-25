import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useCallback, useMemo } from 'react';
import { ConfigProvider, App as AntApp, theme as antTheme } from 'antd';
import { motion } from 'framer-motion';
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

function Page({ children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
}

function AnimatedRoutes({ token, handleLogout, theme, resolvedTheme, setTheme }) {
  return (
    <Routes>
      <Route path="/admin" element={<AdminLayout token={token} onLogout={handleLogout} theme={theme} resolvedTheme={resolvedTheme} onThemeChange={setTheme} />}>
        <Route index element={<Dashboard />} />
        <Route path="questions" element={<Questions />} />
        <Route path="surveys" element={<Surveys />} />
        <Route path="surveys/:id/responses" element={<Responses />} />
      </Route>
      <Route path="/s/:id" element={<Page><Survey /></Page>} />
      <Route path="/unauthorized" element={<Unauthorized />} />
      <Route path="*" element={<Navigate to="/admin" replace />} />
    </Routes>
  );
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
      colorPrimary: resolvedTheme === 'dark' ? '#30B0A0' : '#0D9488',
      colorSuccess: '#32D74B',
      colorInfo: '#64748b',
      colorWarning: '#FF9F0A',
      colorError: '#FF453A',
      colorTextBase: resolvedTheme === 'dark' ? '#f5f5f7' : '#1d1d1f',
      colorBgBase: resolvedTheme === 'dark' ? '#000000' : '#ffffff',
      borderRadius: resolvedTheme === 'dark' ? 10 : 6,
      fontFamily: 'Inter, "SF Pro Display", "Segoe UI", "Microsoft YaHei", system-ui, sans-serif',
      colorBgLayout: resolvedTheme === 'dark' ? '#000000' : '#f5f5f7',
      colorBgContainer: resolvedTheme === 'dark' ? '#1c1c1e' : '#ffffff',
      colorBorderSecondary: resolvedTheme === 'dark' ? '#38383a' : '#e5e5ea',
      controlHeight: 36,
      colorLink: resolvedTheme === 'dark' ? '#30B0A0' : '#0D9488',
      fontSize: 14,
      colorBgElevated: resolvedTheme === 'dark' ? '#2c2c2e' : '#ffffff',
      colorTextSecondary: resolvedTheme === 'dark' ? '#98989d' : '#6e6e73',
      colorTextTertiary: resolvedTheme === 'dark' ? '#636366' : '#aeaeb2',
    },
  }), [resolvedTheme, algorithm]);

  return (
    <ConfigProvider theme={themeConfig} locale={zhCN}>
      <AntApp>
        <BrowserRouter>
          <AnimatedRoutes token={token} handleLogout={handleLogout} theme={theme} resolvedTheme={resolvedTheme} setTheme={setTheme} />
        </BrowserRouter>
      </AntApp>
    </ConfigProvider>
  );
}

