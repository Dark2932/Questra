'use strict';

const toast = document.querySelector('#toast');

function showToast(message) {
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('visible');
  window.setTimeout(() => toast.classList.remove('visible'), 2400);
}

async function api(path, options = {}) {
  const response = await fetch(`/api/admin${path}`, {
    ...options,
    headers: { 'content-type': 'application/json', ...options.headers }
  });
  if (response.status === 204) return null;
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `请求失败 (${response.status})`);
  return data;
}

function escapeHtml(value) {
  const node = document.createElement('span');
  node.textContent = String(value ?? '');
  return node.innerHTML;
}

function bindDialogClose(dialog) {
  dialog.querySelectorAll('[data-close]').forEach((button) => button.addEventListener('click', () => dialog.close()));
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });
}

async function initQuestions() {
  const list = document.querySelector('#question-list');
  if (!list) return;
  const dialog = document.querySelector('#question-dialog');
  const form = document.querySelector('#question-form');
  const optionsField = document.querySelector('#options-field');
  const errorNode = document.querySelector('#question-error');
  let questions = [];
  bindDialogClose(dialog);

  function updateType() {
    optionsField.hidden = form.elements.type.value === 'text';
  }

  function render() {
    if (!questions.length) {
      list.innerHTML = '<div class="empty-state"><strong>问题池还是空的</strong><span>添加第一道题目后即可生成问卷。</span></div>';
      return;
    }
    const labels = { single: '单选', multiple: '多选', text: '文本' };
    list.innerHTML = questions.map((question) => `
      <article class="list-row">
        <div class="list-content"><div class="list-meta"><span class="type-tag">${labels[question.type]}</span>${question.required ? '<span>必填</span>' : '<span>选填</span>'}</div><strong>${escapeHtml(question.title)}</strong>${question.options.length ? `<p>${question.options.map(escapeHtml).join(' / ')}</p>` : ''}</div>
        <div class="row-actions"><button class="button small" data-edit="${question.id}">编辑</button><button class="button small danger" data-delete="${question.id}">删除</button></div>
      </article>`).join('');
  }

  async function load() {
    questions = await api('/questions');
    render();
  }

  document.querySelector('[data-open-question]').addEventListener('click', () => {
    form.reset();
    form.elements.id.value = '';
    document.querySelector('#question-form-title').textContent = '添加题目';
    errorNode.textContent = '';
    updateType();
    dialog.showModal();
  });
  form.elements.type.addEventListener('change', updateType);

  list.addEventListener('click', async (event) => {
    const editId = Number(event.target.dataset.edit);
    const deleteId = Number(event.target.dataset.delete);
    if (editId) {
      const question = questions.find((item) => item.id === editId);
      form.elements.id.value = question.id;
      form.elements.title.value = question.title;
      form.elements.type.value = question.type;
      form.elements.options.value = question.options.join('\n');
      form.elements.required.checked = question.required;
      document.querySelector('#question-form-title').textContent = '编辑题目';
      errorNode.textContent = '';
      updateType();
      dialog.showModal();
    }
    if (deleteId && window.confirm('确定删除这个题目模板吗？已有问卷不会受影响。')) {
      try {
        await api(`/questions/${deleteId}`, { method: 'DELETE' });
        await load();
        showToast('题目已删除');
      } catch (error) { showToast(error.message); }
    }
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const id = form.elements.id.value;
    const payload = {
      title: form.elements.title.value,
      type: form.elements.type.value,
      options: form.elements.options.value.split('\n'),
      required: form.elements.required.checked
    };
    errorNode.textContent = '';
    try {
      await api(id ? `/questions/${id}` : '/questions', { method: id ? 'PUT' : 'POST', body: JSON.stringify(payload) });
      dialog.close();
      await load();
      showToast(id ? '题目已更新' : '题目已添加');
    } catch (error) { errorNode.textContent = error.message; }
  });

  await load();
}

async function initSurveys() {
  const list = document.querySelector('#survey-list');
  if (!list) return;
  const dialog = document.querySelector('#survey-dialog');
  const form = document.querySelector('#survey-form');
  const choices = document.querySelector('#survey-question-options');
  const errorNode = document.querySelector('#survey-error');
  let surveys = [];
  let questions = [];
  bindDialogClose(dialog);

  function render() {
    if (!surveys.length) {
      list.innerHTML = '<div class="empty-state"><strong>还没有问卷</strong><span>从问题池选择题目，生成第一份问卷。</span></div>';
      return;
    }
    list.innerHTML = `<table><thead><tr><th>问卷</th><th>状态</th><th>题目</th><th>答卷</th><th>截止时间</th><th>操作</th></tr></thead><tbody>${surveys.map((survey) => `
      <tr><td><strong>${escapeHtml(survey.title)}</strong><small class="id-text">${survey.id}</small></td><td><span class="status ${survey.status}">${survey.status === 'active' ? '回收中' : '已关闭'}</span></td><td>${survey.questionCount}</td><td>${survey.responseCount}</td><td>${survey.expiresAt ? new Date(survey.expiresAt).toLocaleString('zh-CN', { hour12: false }) : '长期有效'}</td><td><div class="table-actions"><button class="text-button" data-copy="${survey.id}">复制链接</button><a href="/admin/surveys/${survey.id}/responses">数据</a><button class="text-button" data-toggle="${survey.id}" data-status="${survey.status}">${survey.status === 'active' ? '关闭' : '开启'}</button><button class="text-button danger-text" data-delete="${survey.id}">删除</button></div></td></tr>`).join('')}</tbody></table>`;
  }

  function renderChoices() {
    choices.innerHTML = questions.length ? questions.map((question) => `<label class="check-row choice-item"><input type="checkbox" name="questionIds" value="${question.id}"><span><strong>${escapeHtml(question.title)}</strong><small>${{ single: '单选', multiple: '多选', text: '文本' }[question.type]} · ${question.required ? '必填' : '选填'}</small></span></label>`).join('') : '<p class="empty-note">问题池为空，请先添加题目。</p>';
  }

  async function load() {
    [surveys, questions] = await Promise.all([api('/surveys'), api('/questions')]);
    render();
    renderChoices();
  }

  document.querySelector('[data-open-survey]').addEventListener('click', () => {
    form.reset();
    errorNode.textContent = '';
    renderChoices();
    dialog.showModal();
  });

  list.addEventListener('click', async (event) => {
    const id = event.target.dataset.copy || event.target.dataset.toggle || event.target.dataset.delete;
    if (!id) return;
    try {
      if (event.target.dataset.copy) {
        await navigator.clipboard.writeText(`${window.location.origin}/s/${id}`);
        return showToast('公开链接已复制');
      }
      if (event.target.dataset.toggle) {
        await api(`/surveys/${id}`, { method: 'PUT', body: JSON.stringify({ status: event.target.dataset.status === 'active' ? 'closed' : 'active' }) });
        showToast('问卷状态已更新');
      }
      if (event.target.dataset.delete) {
        if (!window.confirm('删除问卷会同时删除所有答卷，且无法恢复。确定继续吗？')) return;
        await api(`/surveys/${id}`, { method: 'DELETE' });
        showToast('问卷已删除');
      }
      await load();
    } catch (error) { showToast(error.message); }
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const questionIds = [...form.querySelectorAll('[name="questionIds"]:checked')].map((node) => Number(node.value));
    const expiresAt = form.elements.expiresAt.value;
    errorNode.textContent = '';
    try {
      await api('/surveys', { method: 'POST', body: JSON.stringify({ title: form.elements.title.value, description: form.elements.description.value, expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null, questionIds }) });
      dialog.close();
      await load();
      showToast('问卷已生成');
    } catch (error) { errorNode.textContent = error.message; }
  });
  await load();
}

async function initResponses() {
  const container = document.querySelector('#response-table');
  if (!container) return;
  try {
    const data = await api(`/surveys/${container.dataset.surveyId}/responses`);
    document.querySelector('#response-metrics strong').textContent = data.responses.length;
    if (!data.responses.length) {
      container.innerHTML = '<div class="empty-state"><strong>暂时没有答卷</strong><span>分享问卷链接后，提交数据会出现在这里。</span></div>';
      return;
    }
    const display = (value) => Array.isArray(value) ? value.join('、') : (value || '—');
    container.innerHTML = `<table><thead><tr><th>提交时间</th>${data.survey.questions.map((q) => `<th>${escapeHtml(q.title)}</th>`).join('')}</tr></thead><tbody>${data.responses.map((response) => `<tr><td>${escapeHtml(response.submittedAt)}</td>${data.survey.questions.map((question) => `<td>${escapeHtml(display(response.answers[question.id]))}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
  } catch (error) { container.innerHTML = `<p class="form-error">${escapeHtml(error.message)}</p>`; }
}

Promise.all([initQuestions(), initSurveys(), initResponses()]).catch((error) => showToast(error.message));
