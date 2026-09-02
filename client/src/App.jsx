import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { lazy, Suspense, useState, useCallback, useEffect, useMemo } from 'react';
import { ConfigProvider, App as AntApp, Spin, theme as antTheme } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { useTheme } from './hooks/useTheme';
import { api } from './api';
import { DEFAULT_SITE_ICON_URL } from './lib/siteIcon';
import { formatPageTitle, pageNameForPath } from './lib/pageTitle';
import { UserAuthProvider } from './hooks/useUserAuth';

const AdminLayout = lazy(() => import('./components/layout/AdminLayout'));
const Dashboard = lazy(() => import('./pages/admin/Dashboard'));
const Questions = lazy(() => import('./pages/admin/Questions'));
const Surveys = lazy(() => import('./pages/admin/Surveys'));
const Responses = lazy(() => import('./pages/admin/Responses'));
const Users = lazy(() => import('./pages/admin/Users'));
const Plugins = lazy(() => import('./pages/admin/Plugins'));
const Settings = lazy(() => import('./pages/admin/Settings'));
const SetupWizard = lazy(() => import('./pages/SetupWizard'));
const Login = lazy(() => import('./pages/Login'));
const Unauthorized = lazy(() => import('./pages/Unauthorized'));
const Survey = lazy(() => import('./pages/Survey'));
const UserLogin = lazy(() => import('./pages/UserLogin'));
const UserRegister = lazy(() => import('./pages/UserRegister'));
const UserVerify = lazy(() => import('./pages/UserVerify'));
const UserForgotPassword = lazy(() => import('./pages/UserForgotPassword'));
const UserResetPassword = lazy(() => import('./pages/UserResetPassword'));
const UserProfile = lazy(() => import('./pages/UserProfile'));

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
    const auth = await api.me().catch(() => null);
    const user = auth?.user || null;
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

function RouteTitle({ siteName }) {
  const location = useLocation();

  useEffect(() => {
    if (/^\/s\/[^/]+\/?$/.test(location.pathname)) return;
    document.title = formatPageTitle(pageNameForPath(location.pathname), siteName);
  }, [location.pathname, siteName]);

  return null;
}

function AdminGate({ access, children }) {
  if (access.loading) return <CenterLoading />;
  if (!access.setup?.initialized) return <Navigate to="/admin/setup" replace />;
  if (!access.authenticated) return <Navigate to="/admin/login" replace />;
  return children;
}

function AnimatedRoutes({ access, theme, resolvedTheme, setTheme }) {
  return <Suspense fallback={<CenterLoading />}>
    <RouteTitle siteName={access.setup?.siteName} />
    <Routes>
    <Route path="/admin/setup" element={access.loading ? <CenterLoading /> : access.setup?.initialized ? <Navigate to="/admin/login" replace /> : <SetupWizard onComplete={access.refresh} />} />
    <Route path="/admin/login" element={access.loading ? <CenterLoading /> : !access.setup?.initialized ? <Navigate to="/admin/setup" replace /> : access.authenticated ? <Navigate to="/admin" replace /> : <Login onLogin={access.refresh} siteName={access.setup?.siteName} siteInitial={access.setup?.siteInitial} siteInitialColor={access.setup?.siteInitialColor} siteIcon={access.setup?.siteIcon} siteIconAsInitial={access.setup?.siteIconAsInitial} />} />
    <Route path="/admin" element={<AdminGate access={access}><AdminLayout authenticated={access.authenticated} site={access.setup} user={access.user} onLogout={access.logout} theme={theme} resolvedTheme={resolvedTheme} onThemeChange={setTheme} /></AdminGate>}>
      <Route index element={<Dashboard />} />
      <Route path="questions" element={<Questions />} />
      <Route path="surveys" element={<Surveys />} />
      <Route path="surveys/:id/responses" element={<Responses />} />
      <Route path="users" element={<Users />} />
      <Route path="plugins" element={<Plugins />} />
      <Route path="settings" element={<Settings onLogout={access.logout} onRefresh={access.refresh} resolvedTheme={resolvedTheme} />} />
    </Route>
    <Route path="/s/:id" element={<Survey siteName={access.setup?.siteName} />} />
    <Route path="/user/login" element={<UserLogin />} />
    <Route path="/user/register" element={<UserRegister />} />
    <Route path="/user/verify" element={<UserVerify />} />
    <Route path="/user/forgot-password" element={<UserForgotPassword />} />
    <Route path="/user/reset-password" element={<UserResetPassword />} />
    <Route path="/user/profile" element={<UserProfile />} />
    <Route path="/unauthorized" element={access.loading ? <CenterLoading /> : !access.setup?.initialized ? <Navigate to="/admin/setup" replace /> : access.authenticated ? <Navigate to="/admin" replace /> : <Unauthorized siteName={access.setup?.siteName} siteInitial={access.setup?.siteInitial} siteInitialColor={access.setup?.siteInitialColor} siteIcon={access.setup?.siteIcon} siteIconAsInitial={access.setup?.siteIconAsInitial} />} />
    <Route path="*" element={<Navigate to="/admin" replace />} />
    </Routes>
  </Suspense>;
}

export default function App() {
  const access = useAdminAccess();
  const { theme, resolvedTheme, setTheme } = useTheme();
  const algorithm = resolvedTheme === 'dark' ? antTheme.darkAlgorithm : antTheme.defaultAlgorithm;
  const themeConfig = useMemo(() => ({
    algorithm,
    token: {
      colorPrimary: access.setup?.themeColor || (resolvedTheme === 'dark' ? '#30B0A0' : '#0D9488'),
      colorSuccess: '#32D74B', colorInfo: '#64748b', colorWarning: '#FF9F0A', colorError: '#FF453A',
      colorTextBase: resolvedTheme === 'dark' ? '#f5f5f7' : '#1d1d1f',
      colorBgBase: resolvedTheme === 'dark' ? '#000000' : '#ffffff',
      borderRadius: resolvedTheme === 'dark' ? 10 : 6,
      fontFamily: 'Inter, "SF Pro Display", "Segoe UI", "Microsoft YaHei", system-ui, sans-serif',
      colorBgLayout: resolvedTheme === 'dark' ? '#000000' : '#f5f5f7',
      colorBgContainer: resolvedTheme === 'dark' ? '#1c1c1e' : '#ffffff',
      colorBorderSecondary: resolvedTheme === 'dark' ? '#38383a' : '#e5e5ea', controlHeight: 36,
      colorLink: access.setup?.themeColor || (resolvedTheme === 'dark' ? '#30B0A0' : '#0D9488'), fontSize: 14,
      colorBgElevated: resolvedTheme === 'dark' ? '#2c2c2e' : '#ffffff',
      colorTextSecondary: resolvedTheme === 'dark' ? '#98989d' : '#6e6e73',
      colorTextTertiary: resolvedTheme === 'dark' ? '#636366' : '#aeaeb2'
    }
  }), [access.setup?.themeColor, resolvedTheme, algorithm]);

  useEffect(() => {
    const icon = access.setup?.siteIcon || DEFAULT_SITE_ICON_URL;
    let link = document.querySelector('link[rel="icon"]');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = icon;
  }, [access.setup?.siteIcon]);

  return <ConfigProvider theme={themeConfig} locale={zhCN}><AntApp><BrowserRouter><UserAuthProvider><AnimatedRoutes access={access} theme={theme} resolvedTheme={resolvedTheme} setTheme={setTheme} /></UserAuthProvider></BrowserRouter></AntApp></ConfigProvider>;
}
