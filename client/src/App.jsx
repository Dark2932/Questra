import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense, useState, useCallback, useEffect, useMemo } from 'react';
import { ConfigProvider, App as AntApp, Spin, theme as antTheme } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { useTheme } from './hooks/useTheme';
import { api } from './api';

const AdminLayout = lazy(() => import('./components/layout/AdminLayout'));
const Dashboard = lazy(() => import('./pages/admin/Dashboard'));
const Questions = lazy(() => import('./pages/admin/Questions'));
const Surveys = lazy(() => import('./pages/admin/Surveys'));
const Responses = lazy(() => import('./pages/admin/Responses'));
const Settings = lazy(() => import('./pages/admin/Settings'));
const SetupWizard = lazy(() => import('./pages/SetupWizard'));
const Login = lazy(() => import('./pages/Login'));
const Survey = lazy(() => import('./pages/Survey'));

function useAdminAccess() {
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
  const [state, setState] = useState({ loading: true, setup: null, user: null });

  const refresh = useCallback(async () => {
    const setup = await api.getSetupStatus();
    const user = await api.me().catch(() => null);
    setState({ loading: false, setup, user });
    return { setup, user };
  }, []);

  useEffect(() => { refresh().catch(() => setState((prev) => ({ ...prev, loading: false }))); }, [refresh]);

  const authenticated = Boolean(state.user);
  const logout = useCallback(async () => {
    await api.logout().catch(() => {});
    sessionStorage.removeItem('questra_admin_token');
    setToken('');
    setState((prev) => ({ ...prev, user: null }));
  }, []);

  return { ...state, token, authenticated, refresh, setState, logout };
}

function CenterLoading() {
  return <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}><Spin size="large" /></div>;
}

function AdminGate({ access, children }) {
  if (access.loading) return <CenterLoading />;
  if (!access.setup?.initialized) return <Navigate to="/admin/setup" replace />;
  if (!access.authenticated) return <Navigate to="/admin/login" replace />;
  return children;
}

function AnimatedRoutes({ access, theme, resolvedTheme, setTheme }) {
  return <Suspense fallback={<CenterLoading />}><Routes>
    <Route path="/admin/setup" element={access.loading ? <CenterLoading /> : access.setup?.initialized ? <Navigate to="/admin/login" replace /> : <SetupWizard onComplete={access.refresh} />} />
    <Route path="/admin/login" element={access.loading ? <CenterLoading /> : !access.setup?.initialized ? <Navigate to="/admin/setup" replace /> : access.authenticated ? <Navigate to="/admin" replace /> : <Login onLogin={access.refresh} />} />
    <Route path="/admin" element={<AdminGate access={access}><AdminLayout authenticated={access.authenticated} site={access.setup} user={access.user} onLogout={access.logout} theme={theme} resolvedTheme={resolvedTheme} onThemeChange={setTheme} /></AdminGate>}>
      <Route index element={<Dashboard />} />
      <Route path="questions" element={<Questions />} />
      <Route path="surveys" element={<Surveys />} />
      <Route path="surveys/:id/responses" element={<Responses />} />
      <Route path="settings" element={<Settings onLogout={access.logout} onRefresh={access.refresh} />} />
    </Route>
    <Route path="/s/:id" element={<Survey />} />
    <Route path="/unauthorized" element={<Navigate to="/admin/login" replace />} />
    <Route path="*" element={<Navigate to="/admin" replace />} />
  </Routes></Suspense>;
}

export default function App() {
  const access = useAdminAccess();
  const { theme, resolvedTheme, setTheme } = useTheme();
  const algorithm = resolvedTheme === 'dark' ? antTheme.darkAlgorithm : antTheme.defaultAlgorithm;
  const themeConfig = useMemo(() => ({
    algorithm,
    token: {
      colorPrimary: resolvedTheme === 'dark' ? '#30B0A0' : '#0D9488',
      colorSuccess: '#32D74B', colorInfo: '#64748b', colorWarning: '#FF9F0A', colorError: '#FF453A',
      colorTextBase: resolvedTheme === 'dark' ? '#f5f5f7' : '#1d1d1f',
      colorBgBase: resolvedTheme === 'dark' ? '#000000' : '#ffffff',
      borderRadius: resolvedTheme === 'dark' ? 10 : 6,
      fontFamily: 'Inter, "SF Pro Display", "Segoe UI", "Microsoft YaHei", system-ui, sans-serif',
      colorBgLayout: resolvedTheme === 'dark' ? '#000000' : '#f5f5f7',
      colorBgContainer: resolvedTheme === 'dark' ? '#1c1c1e' : '#ffffff',
      colorBorderSecondary: resolvedTheme === 'dark' ? '#38383a' : '#e5e5ea', controlHeight: 36,
      colorLink: resolvedTheme === 'dark' ? '#30B0A0' : '#0D9488', fontSize: 14,
      colorBgElevated: resolvedTheme === 'dark' ? '#2c2c2e' : '#ffffff',
      colorTextSecondary: resolvedTheme === 'dark' ? '#98989d' : '#6e6e73',
      colorTextTertiary: resolvedTheme === 'dark' ? '#636366' : '#aeaeb2'
    }
  }), [resolvedTheme, algorithm]);

  return <ConfigProvider theme={themeConfig} locale={zhCN}><AntApp><BrowserRouter><AnimatedRoutes access={access} theme={theme} resolvedTheme={resolvedTheme} setTheme={setTheme} /></BrowserRouter></AntApp></ConfigProvider>;
}
