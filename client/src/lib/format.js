/** 答卷答案的展示格式化：数组（多选）用顿号连接，空值显示占位符。 */
export function formatAnswer(value) {
  if (value === null || value === undefined || value === '') return '—';
  return Array.isArray(value) ? value.join('、') : String(value);
}

/** 时间戳的本地化展示。 */
export function formatDateTime(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString('zh-CN', { hour12: false });
}