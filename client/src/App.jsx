import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useCallback } from 'react';
import AdminLayout from './components/layout/AdminLayout';
import Dashboard from './pages/admin/Dashboard';
import Questions from './pages/admin/Questions';
import Surveys from './pages/admin/Surveys';
import Responses from './pages/admin/Responses';
import Survey from './pages/Survey';
import Unauthorized from './pages/Unauthorized';
import { ToastProvider } from './components/ui/Toast';

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

  const handleLogout = useCallback(() => {
    sessionStorage.removeItem('questra_admin_token');
    setToken('');
  }, [setToken]);

  return (
    <ToastProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/admin" element={<AdminLayout token={token} onLogout={handleLogout} />}>
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
    </ToastProvider>
  );
}
