import { describe, it, expect } from 'vitest';
import { formatAnswer, formatDateTime } from './format';

describe('formatAnswer', () => {
  it('多选数组用顿号连接', () => {
    expect(formatAnswer(['A', 'B', 'C'])).toBe('A、B、C');
  });

  it('单选纯字符串原样返回', () => {
    expect(formatAnswer('Node.js')).toBe('Node.js');
  });

  it('null / undefined / 空串显示占位符', () => {
    expect(formatAnswer(null)).toBe('—');
    expect(formatAnswer(undefined)).toBe('—');
    expect(formatAnswer('')).toBe('—');
  });
});

describe('formatDateTime', () => {
  const fixed = '2025-01-02T03:04:05.000Z';
  const zhCN = formatDateTime(fixed);
  expect(zhCN).toContain('2025');
  expect(zhCN).not.toBe('—');

  it('空值显示占位符', () => {
    expect(formatDateTime('')).toBe('—');
    expect(formatDateTime(null)).toBe('—');
  });
});