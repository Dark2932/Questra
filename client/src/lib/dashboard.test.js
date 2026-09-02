import { describe, expect, it } from 'vitest';
import { buildDashboardChartData, findNewResponseIds } from './dashboard';

describe('dashboard chart data', () => {
  it('merges real per-survey counts into complete daily rows', () => {
    const result = buildDashboardChartData(
      [{ day: '2026-09-01', count: 3 }, { day: '2026-09-02', count: 1 }],
      [
        { day: '2026-09-01', surveyId: 'a', surveyTitle: '问卷 A', kind: 'survey', count: 2 },
        { day: '2026-09-01', surveyId: 'b', surveyTitle: '考试 B', kind: 'exam', count: 1 },
        { day: '2026-09-02', surveyId: 'b', surveyTitle: '考试 B', kind: 'exam', count: 1 },
      ],
      [
        { surveyId: 'b', surveyTitle: '考试 B', kind: 'exam', count: 2 },
        { surveyId: 'a', surveyTitle: '问卷 A', kind: 'survey', count: 2 },
      ],
    );

    expect(result.series.map((item) => item.surveyId)).toEqual(['b', 'a']);
    expect(result.daily[0]).toMatchObject({ day: '2026-09-01', total: 3, survey_0: 1, survey_1: 2 });
    expect(result.daily[1]).toMatchObject({ day: '2026-09-02', total: 1, survey_0: 1, survey_1: 0 });
  });
});

describe('dashboard live responses', () => {
  it('does not highlight initial data and only returns newly observed ids later', () => {
    const responses = [{ id: 'new' }, { id: 'existing' }];
    expect(findNewResponseIds(null, responses)).toEqual([]);
    expect(findNewResponseIds(new Set(['existing']), responses)).toEqual(['new']);
  });
});

