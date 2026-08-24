'use strict';

const form = document.querySelector('#public-survey-form');

form?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const button = form.querySelector('[type="submit"]');
  const errorNode = document.querySelector('#submit-error');
  const answers = {};

  form.querySelectorAll('.question-block').forEach((block) => {
    const id = block.dataset.questionId;
    const inputs = [...block.querySelectorAll('[name]')];
    if (block.dataset.type === 'multiple') {
      answers[id] = inputs.filter((input) => input.checked).map((input) => input.value);
    } else if (block.dataset.type === 'single') {
      answers[id] = inputs.find((input) => input.checked)?.value ?? '';
    } else {
      answers[id] = inputs[0]?.value ?? '';
    }
  });

  errorNode.textContent = '';
  button.disabled = true;
  button.textContent = '正在提交…';
  try {
    const response = await fetch(`/api/surveys/${form.dataset.surveyId}/responses`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ answers })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || '提交失败，请稍后重试');
    form.hidden = true;
    document.querySelector('#thank-you').hidden = false;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } catch (error) {
    errorNode.textContent = error.message;
    button.disabled = false;
    button.textContent = '提交答卷';
  }
});
