export const QUESTION_TYPE_ORDER = ['single', 'multiple', 'judgment', 'text', 'open_text'];

export const QUESTION_TYPES = {
  single: { label: '单选', color: 'blue' },
  multiple: { label: '多选', color: 'purple' },
  judgment: { label: '判断', color: 'cyan' },
  text: { label: '填空', color: 'gold' },
  open_text: { label: '开放文本', color: 'green' },
};

export function questionType(question) {
  return question?.type || 'text';
}

export function questionsInGroup(questions, groupId) {
  const key = String(groupId ?? 'all');
  if (key === 'all') return questions;
  if (key.startsWith('type:')) {
    const type = key.slice(5);
    return questions.filter((question) => questionType(question) === type);
  }
  return questions.filter((question) => question.groupIds?.map(String).includes(key));
}

export function typeFilterOptions({ includeAll = true } = {}) {
  const options = QUESTION_TYPE_ORDER.map((type) => ({ label: QUESTION_TYPES[type].label, value: type }));
  return includeAll ? [{ label: '全部题型', value: 'all' }, ...options] : options;
}
