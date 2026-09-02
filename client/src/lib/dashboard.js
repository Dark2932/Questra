export function buildDashboardChartData(trend = [], trendBySurvey = [], surveyTotals = []) {
  const series = surveyTotals.map((survey, index) => ({
    ...survey,
    dataKey: `survey_${index}`,
  }));
  const seriesById = new Map(series.map((survey) => [survey.surveyId, survey]));
  const byDay = new Map(trend.map((item) => [item.day, {
    day: item.day,
    total: Number(item.count || 0),
    breakdown: [],
  }]));

  trendBySurvey.forEach((item) => {
    const day = byDay.get(item.day);
    const survey = seriesById.get(item.surveyId);
    if (!day || !survey) return;
    const count = Number(item.count || 0);
    day[survey.dataKey] = count;
    day.breakdown.push({ ...survey, count });
  });

  const daily = [...byDay.values()].map((day) => {
    series.forEach((survey) => {
      if (day[survey.dataKey] === undefined) day[survey.dataKey] = 0;
    });
    day.breakdown.sort((a, b) => b.count - a.count || a.surveyTitle.localeCompare(b.surveyTitle, 'zh-CN'));
    return day;
  });

  return { daily, series };
}

export function findNewResponseIds(previousIds, responses = []) {
  if (!previousIds) return [];
  return responses.map((response) => response.id).filter((id) => !previousIds.has(id));
}

