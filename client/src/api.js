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
  updateSiteSettings: (data) => request('/admin/settings/site', { method: 'PUT', body: JSON.stringify(data) }),
  updateAccountSettings: (data) => request('/admin/settings/account', { method: 'PUT', body: JSON.stringify(data) }),

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
  exportSurveyResponses: async (id, format = 'csv') => {
    const token = sessionStorage.getItem('questra_admin_token') || '';
    const res = await fetch(`${API}/admin/surveys/${id}/export?format=${format}`, {
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
      if (!r.ok) throw new Error(d.error || '提交失败');
      return d;
    }),
};
