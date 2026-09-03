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

function escapeAttribute(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]);
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
  const correctChoiceField = document.querySelector('#correct-choice-field');
  const correctTextField = document.querySelector('#correct-text-field');
  const correctChoiceOptions = document.querySelector('#correct-choice-options');
  const errorNode = document.querySelector('#question-error');
  let questions = [];
  bindDialogClose(dialog);

  function renderCorrectChoices(selected = null) {
    const oldSelected = selected || [...correctChoiceOptions.querySelectorAll('input:checked')].map((input) => input.value);
    const type = form.elements.type.value;
    const options = type === 'judgment' ? ['正确', '错误'] : form.elements.options.value.split('\n').map((value) => value.trim()).filter(Boolean);
    correctChoiceOptions.innerHTML = options.length ? options.map((option) => `
      <label class="check-row"><input type="${type === 'single' ? 'radio' : 'checkbox'}" name="correctChoice" value="${escapeAttribute(option)}" ${oldSelected.includes(option) ? 'checked' : ''}><span>${escapeHtml(option)}</span></label>
    `).join('') : '<p class="empty-note">请先填写选项。</p>';
  }

  function updateType(selected = null) {
    const type = form.elements.type.value;
    const isFill = type === 'text';
    const isOpenText = type === 'open_text';
    optionsField.hidden = isFill || isOpenText || type === 'judgment';
    correctTextField.hidden = !isFill;
    if (!isFill && !isOpenText) renderCorrectChoices(selected);
    correctChoiceField.hidden = isFill || isOpenText || !correctChoiceOptions.querySelector('input');
  }

  function render() {
    if (!questions.length) {
      list.innerHTML = '<div class="empty-state"><strong>题库还是空的</strong><span>添加第一道题目后即可生成问卷。</span></div>';
      return;
    }
    const labels = { single: '单选', multiple: '多选', judgment: '判断', text: '填空', open_text: '开放文本' };
    list.innerHTML = questions.map((question) => `
      <article class="list-row">
        <div class="list-content"><div class="list-meta"><span class="type-tag">${labels[question.type]}</span>${question.type === 'open_text' ? '<span>无需标准答案</span>' : (question.correctAnswer === null ? '<span class="answer-missing">未设答案</span>' : '<span class="answer-ready">已设答案</span>')}</div><strong>${escapeHtml(question.title)}</strong>${question.options.length ? `<p>${question.options.map(escapeHtml).join(' / ')}</p>` : ''}${question.correctAnswer !== null ? `<p class="correct-answer-text">标准答案：${escapeHtml(Array.isArray(question.correctAnswer) ? question.correctAnswer.join('、') : question.correctAnswer)}</p>` : ''}</div>
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
  form.elements.type.addEventListener('change', () => updateType([]));
  form.elements.options.addEventListener('input', () => updateType());

  list.addEventListener('click', async (event) => {
    const editId = Number(event.target.dataset.edit);
    const deleteId = Number(event.target.dataset.delete);
    if (editId) {
      const question = questions.find((item) => item.id === editId);
      form.elements.id.value = question.id;
      form.elements.title.value = question.title;
      form.elements.type.value = question.type;
      form.elements.options.value = question.options.join('\n');
      form.elements.correctText.value = question.type === 'text' && Array.isArray(question.correctAnswer) ? question.correctAnswer.join('\n') : '';
      document.querySelector('#question-form-title').textContent = '编辑题目';
      errorNode.textContent = '';
      const selected = question.correctAnswer === null
        ? []
        : (Array.isArray(question.correctAnswer) ? question.correctAnswer : [question.correctAnswer]);
      updateType(selected);
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
    const selectedAnswers = [...form.querySelectorAll('[name="correctChoice"]:checked')].map((input) => input.value);
    const correctAnswer = form.elements.type.value === 'open_text' ? null : form.elements.type.value === 'text'
      ? form.elements.correctText.value.split('\n').map((value) => value.trim()).filter(Boolean)
      : (form.elements.type.value === 'single' ? (selectedAnswers[0] || null) : selectedAnswers);
    const payload = {
      title: form.elements.title.value,
      type: form.elements.type.value,
      options: form.elements.options.value.split('\n'),
      required: false,
      correctAnswer: Array.isArray(correctAnswer) && !correctAnswer.length ? null : correctAnswer
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
  const typeLabels = { single: '单选', multiple: '多选', judgment: '判断', text: '填空', open_text: '开放文本' };

  function render() {
    if (!surveys.length) {
      list.innerHTML = '<div class="empty-state"><strong>还没有问卷</strong><span>从题库选择题目，生成第一份问卷。</span></div>';
      return;
    }
    list.innerHTML = `<table><thead><tr><th>实例</th><th>类型</th><th>状态</th><th>题目</th><th>提交</th><th>截止时间</th><th>操作</th></tr></thead><tbody>${surveys.map((survey) => `
      <tr><td><strong>${escapeHtml(survey.title)}</strong><small class="id-text">${survey.id}</small></td><td><span class="type-tag">${survey.kind === 'exam' ? `考试 · ${survey.maxScore} 分` : '问卷'}</span></td><td><span class="status ${survey.status}">${survey.status === 'active' ? '回收中' : '已关闭'}</span></td><td>${survey.questionCount}</td><td>${survey.responseCount}</td><td>${survey.expiresAt ? new Date(survey.expiresAt).toLocaleString('zh-CN', { hour12: false }) : '长期有效'}</td><td><div class="table-actions"><button class="text-button" data-copy="${survey.id}">复制链接</button><a href="/admin/surveys/${survey.id}/responses">数据</a><button class="text-button" data-toggle="${survey.id}" data-status="${survey.status}">${survey.status === 'active' ? '关闭' : '开启'}</button><button class="text-button danger-text" data-delete="${survey.id}">删除</button></div></td></tr>`).join('')}</tbody></table>`;
  }

  function renderChoices() {
    choices.innerHTML = questions.length ? questions.map((question) => `
      <div class="choice-item scored-choice" data-question-type="${question.type}">
        <label class="check-row"><input type="checkbox" name="questionIds" value="${question.id}"><span><strong>${escapeHtml(question.title)}</strong><small>${typeLabels[question.type]} · ${question.type === 'open_text' ? '无需标准答案' : (question.correctAnswer === null ? '<b class="answer-missing">未设答案</b>' : '<b class="answer-ready">已设答案</b>')}</small></span></label>
        <label class="check-row question-required" hidden><input type="checkbox" data-question-required="${question.id}" checked><span>必填</span></label>
        <label class="question-score" hidden><input type="number" min="0.01" step="0.01" data-question-score="${question.id}" placeholder="分值"><span>分</span></label>
      </div>`).join('') : '<p class="empty-note">题库为空，请先添加题目。</p>';
  }

  function selectedQuestions() {
    const selectedIds = new Set([...form.querySelectorAll('[name="questionIds"]:checked')].map((node) => Number(node.value)));
    return questions.filter((question) => selectedIds.has(question.id));
  }

  function updateMaxScore() {
    const total = [...form.querySelectorAll('[data-question-score]')]
      .filter((input) => input.closest('.scored-choice').querySelector('[name="questionIds"]').checked)
      .reduce((sum, input) => sum + (Number(input.value) || 0), 0);
    document.querySelector('#calculated-max-score').textContent = Math.round(total * 100) / 100;
  }

  function renderWeights() {
    const weights = document.querySelector('#weight-fields');
    const types = [...new Set(selectedQuestions().filter((question) => question.type !== 'open_text').map((question) => question.type))];
    const previous = Object.fromEntries([...weights.querySelectorAll('[data-weight-type]')]
      .map((input) => [input.dataset.weightType, input.value]));
    const sameTypes = types.length === Object.keys(previous).length && types.every((type) => previous[type] !== undefined);
    const defaultWeight = types.length ? Math.floor(10000 / types.length) / 100 : 0;
    weights.innerHTML = types.length ? types.map((type, index) => {
      const value = sameTypes
        ? previous[type]
        : (index === types.length - 1 ? Math.round((100 - defaultWeight * index) * 100) / 100 : defaultWeight);
      return `<label>${typeLabels[type]}权重<div class="input-suffix"><input type="number" min="0.01" max="100" step="0.01" value="${value}" data-weight-type="${type}"><span>%</span></div></label>`;
    }).join('') : '<p class="empty-note">选择题目后设置权重。</p>';
  }

  function updateExamSettings() {
    const isExam = form.elements.kind.value === 'exam';
    const mode = form.elements.scoringMode.value;
    document.querySelector('#exam-settings').hidden = !isExam;
    document.querySelector('#weighted-settings').hidden = !isExam || mode !== 'weighted';
    document.querySelector('#per-question-settings').hidden = !isExam || mode !== 'per_question';
    form.querySelectorAll('.question-score').forEach((field) => { field.hidden = !isExam || mode !== 'per_question' || field.closest('.scored-choice').dataset.questionType === 'open_text'; });
    if (isExam && mode === 'weighted') renderWeights();
    updateMaxScore();
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
    updateExamSettings();
    dialog.showModal();
  });

  form.elements.kind.addEventListener('change', updateExamSettings);
  form.querySelectorAll('[name="scoringMode"]').forEach((input) => input.addEventListener('change', updateExamSettings));
  choices.addEventListener('change', (event) => {
    if (event.target.matches('[name="questionIds"]')) {
      event.target.closest('.scored-choice').querySelector('.question-required').hidden = !event.target.checked;
      renderWeights();
    }
    updateMaxScore();
  });
  choices.addEventListener('input', updateMaxScore);
  form.querySelectorAll('[data-apply-score]').forEach((button) => button.addEventListener('click', () => {
    const type = button.dataset.applyScore;
    const value = form.querySelector(`[data-batch-value="${type}"]`).value;
    if (!value) return;
    form.querySelectorAll(`.scored-choice[data-question-type="${type}"]`).forEach((row) => {
      if (row.querySelector('[name="questionIds"]').checked) row.querySelector('[data-question-score]').value = value;
    });
    updateMaxScore();
  }));

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
    const typeWeights = Object.fromEntries([...form.querySelectorAll('[data-weight-type]')].map((input) => [input.dataset.weightType, Number(input.value)]));
    const questionScores = Object.fromEntries([...form.querySelectorAll('[data-question-score]')].map((input) => [input.dataset.questionScore, Number(input.value)]));
    const questionRequired = Object.fromEntries([...form.querySelectorAll('[data-question-required]')].map((input) => [input.dataset.questionRequired, input.checked]));
    errorNode.textContent = '';
    try {
      await api('/surveys', { method: 'POST', body: JSON.stringify({
        kind: form.elements.kind.value,
        title: form.elements.title.value,
        description: form.elements.description.value,
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
        questionIds,
        questionRequired,
        scoringMode: form.elements.scoringMode.value,
        totalScore: Number(form.elements.totalScore.value),
        typeWeights,
        questionScores
      }) });
      dialog.close();
      await load();
      showToast(form.elements.kind.value === 'exam' ? '考试已生成' : '问卷已生成');
    } catch (error) { errorNode.textContent = error.message; }
  });
  await load();
}

async function initResponses() {
  const container = document.querySelector('#response-table');
  if (!container) return;
  try {
    const data = await api(`/surveys/${container.dataset.surveyId}/responses`);
    const metrics = document.querySelector('#response-metrics');
    metrics.querySelector('[data-response-count]').textContent = data.responses.length;
    if (data.survey.kind === 'exam') {
      const average = data.responses.length
        ? data.responses.reduce((sum, response) => sum + response.score, 0) / data.responses.length
        : 0;
      metrics.querySelector('[data-average-score]').textContent = `${Math.round(average * 100) / 100} / ${data.survey.maxScore}`;
    }
    if (!data.responses.length) {
      container.innerHTML = '<div class="empty-state"><strong>暂时没有答卷</strong><span>分享问卷链接后，提交数据会出现在这里。</span></div>';
      return;
    }
    const display = (value) => Array.isArray(value) ? value.join('、') : (value || '—');
    const scoreHeader = data.survey.kind === 'exam' ? '<th>总分</th>' : '';
    container.innerHTML = `<table><thead><tr><th>提交时间</th>${scoreHeader}${data.survey.questions.map((q) => `<th>${escapeHtml(q.title)}${data.survey.kind === 'exam' ? ` (${q.points}分)` : ''}</th>`).join('')}</tr></thead><tbody>${data.responses.map((response) => {
      const scoreCell = data.survey.kind === 'exam' ? `<td><strong>${response.score} / ${response.maxScore}</strong></td>` : '';
      const answerCells = data.survey.questions.map((question) => {
        const answer = response.answers[question.id];
        const correctness = answer.isCorrect === null ? '' : (answer.isCorrect ? ' correct-cell' : ' wrong-cell');
        const awarded = answer.awardedScore === null ? '' : `<small class="awarded-score">${answer.isCorrect ? '正确' : '错误'} · ${answer.awardedScore} 分</small>`;
        return `<td class="${correctness}">${escapeHtml(display(answer.value))}${awarded}</td>`;
      }).join('');
      return `<tr><td>${escapeHtml(response.submittedAt)}</td>${scoreCell}${answerCells}</tr>`;
    }).join('')}</tbody></table>`;
  } catch (error) { container.innerHTML = `<p class="form-error">${escapeHtml(error.message)}</p>`; }
}

Promise.all([initQuestions(), initSurveys(), initResponses()]).catch((error) => showToast(error.message));
