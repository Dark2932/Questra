const API = '/api';

async function request(path, options = {}) {
  const token = sessionStorage.getItem('questra_admin_token') || '';
  const headers = { 'content-type': 'application/json', ...options.headers };
  if (token) headers.authorization = `Bearer ${token}`;

  const res = await fetch(`${API}${path}`, { ...options, headers, credentials: 'same-origin' });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error(data.error || `请求失败 (${res.status})`);
    error.status = res.status;
    throw error;
  }
  return data;
}

export const api = {
  getConfig: () => request('/config'),
  getSetupStatus: () => request('/setup/status'),
  setup: (data) => request('/setup', { method: 'POST', body: JSON.stringify(data) }),
  login: (data) => request('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  me: () => request('/auth/me'),
  logout: () => request('/auth/logout', { method: 'POST' }),
  getDashboard: () => request('/admin/dashboard'),
  getSettings: () => request('/admin/settings'),
  getUserSettings: () => request('/admin/user-settings'),
  updateUserSettings: (data) => request('/admin/user-settings', { method: 'PUT', body: JSON.stringify(data) }),
  updateSiteSettings: (data) => request('/admin/settings/site', { method: 'PUT', body: JSON.stringify(data) }),
  updateAccountSettings: (data) => request('/admin/settings/account', { method: 'PUT', body: JSON.stringify(data) }),
  checkForUpdate: () => request('/admin/update'),
  getUpdateStatus: () => request('/admin/update/status'),
  installUpdate: () => request('/admin/update/install', { method: 'POST' }),

  getQuestions: () => request('/admin/questions'),
  createQuestion: (data) => request('/admin/questions', { method: 'POST', body: JSON.stringify(data) }),
  updateQuestion: (id, data) => request(`/admin/questions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteQuestion: (id) => request(`/admin/questions/${id}`, { method: 'DELETE' }),
  getGroups: () => request('/admin/groups'),
  createGroup: (data) => request('/admin/groups', { method: 'POST', body: JSON.stringify(data) }),
  updateGroup: (id, data) => request(`/admin/groups/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteGroup: (id) => request(`/admin/groups/${id}`, { method: 'DELETE' }),

  getSurveys: () => request('/admin/surveys'),
  getSurvey: (id) => request(`/admin/surveys/${id}`),
  createSurvey: (data) => request('/admin/surveys', { method: 'POST', body: JSON.stringify(data) }),
  updateSurvey: (id, data) => request(`/admin/surveys/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteSurvey: (id) => request(`/admin/surveys/${id}`, { method: 'DELETE' }),
  getSurveyResponses: (id) => request(`/admin/surveys/${id}/responses`),
  exportSurveyResponses: async (id, format = 'csv', { includePersonalInfo = false } = {}) => {
    const token = sessionStorage.getItem('questra_admin_token') || '';
    const params = new URLSearchParams({ format, includePersonalInfo: includePersonalInfo ? '1' : '0' });
    const res = await fetch(`${API}/admin/surveys/${id}/export?${params}`, {
      headers: token ? { authorization: `Bearer ${token}` } : {},
      credentials: 'same-origin',
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || `导出失败 (${res.status})`);
    }
    return res.blob();
  },

  getPublicSurvey: (id) =>
    fetch(`/api/surveys/${id}`).then(async (r) => {
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || '加载失败');
      return d;
    }),
  submitResponse: (id, answers) =>
    fetch(`/api/surveys/${id}/responses`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ answers }),
    }).then(async (r) => {
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { const error = new Error(d.error || '提交失败'); error.status = r.status; throw error; }
      return d;
    }),
  userRegister: (data) => request('/user/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  userVerify: (token) => request('/user/auth/verify', { method: 'POST', body: JSON.stringify({ token }) }),
  userResendVerification: (email) => request('/user/auth/resend-verification', { method: 'POST', body: JSON.stringify({ email }) }),
  userLogin: (data) => request('/user/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  userMe: () => request('/user/auth/me'),
  userLogout: () => request('/user/auth/logout', { method: 'POST' }),
  userForgotPassword: (email) => request('/user/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),
  userResetPassword: (data) => request('/user/auth/reset-password', { method: 'POST', body: JSON.stringify(data) }),
  updateUserProfile: (displayName) => request('/user/profile', { method: 'PUT', body: JSON.stringify({ displayName }) }),
  updateUserPassword: (data) => request('/user/password', { method: 'PUT', body: JSON.stringify(data) }),
  getUsers: () => request('/admin/users'),
  updateUserStatus: (id, status) => request(`/admin/users/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),
  revokeUserSessions: (id) => request(`/admin/users/${id}/revoke-sessions`, { method: 'POST' }),
  deleteUser: (id) => request(`/admin/users/${id}`, { method: 'DELETE' }),
};
