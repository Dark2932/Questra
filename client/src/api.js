const API = '/api';

async function request(path, options = {}) {
  const token = sessionStorage.getItem('questra_admin_token') || '';
  const headers = { 'content-type': 'application/json', ...options.headers };
  if (token) headers.authorization = `Bearer ${token}`;

  const res = await fetch(`${API}${path}`, { ...options, headers });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `请求失败 (${res.status})`);
  return data;
}

export const api = {
  getConfig: () => request('/config'),
  getDashboard: () => request('/admin/dashboard'),

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
