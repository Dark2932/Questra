import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import dayjs from 'dayjs';
import {
  Alert, App, Avatar, Button, Card, Col, DatePicker, Row, Segmented, Space, Statistic, Table, Tag, Typography,
} from 'antd';
import {
  AppstoreOutlined, BarChartOutlined, CheckCircleOutlined, ClockCircleOutlined,
  ExclamationCircleOutlined, FileDoneOutlined, FormOutlined, LineChartOutlined,
  CloudDownloadOutlined, PieChartOutlined, PlusOutlined, ThunderboltOutlined, TrophyOutlined, UserOutlined,
} from '@ant-design/icons';
import { api } from '../../api';
import RecoveryTrendChart from '../../components/dashboard/RecoveryTrendChart';
import { buildDashboardChartData, findNewResponseIds } from '../../lib/dashboard';
import { formatDateTime } from '../../lib/format';

const { RangePicker } = DatePicker;
const { Title, Text } = Typography;
const POLL_INTERVAL_MS = 15000;
const HIGHLIGHT_DURATION_MS = 3000;

function filtersFor(rangeMode, customRange) {
  if (rangeMode !== 'custom') return { range: rangeMode };
  return { range: 'custom', startDate: customRange[0].format('YYYY-MM-DD'), endDate: customRange[1].format('YYYY-MM-DD') };
}

function LiveTitle({ lastUpdatedAt }) {
  return <div className="dashboard-listening-header">
    <span aria-hidden="true" />
    <Space size={8} className="dashboard-listening-title"><Text strong>最近提交</Text></Space>
    {lastUpdatedAt && <Text type="secondary" className="dashboard-last-updated"><span className="dashboard-listening-dot" aria-hidden="true" />最近刷新 {lastUpdatedAt.toLocaleTimeString('zh-CN', { hour12: false })}</Text>}
  </div>;
}

function AlertList({ alerts }) {
  const highErrorQuestions = alerts.highErrorQuestions || [];
  const expiringSurveys = alerts.expiringSurveys || [];
  if (!highErrorQuestions.length && !expiringSurveys.length) return <Text type="secondary">暂无需要处理的预警</Text>;
  return <div className="dashboard-alert-list">
    {highErrorQuestions.map((question) => <Link className="dashboard-alert-item" to="/admin/questions" key={`question-${question.id}`}>
      <ExclamationCircleOutlined className="dashboard-alert-icon dashboard-alert-icon-warning" />
      <span className="dashboard-alert-copy"><Text ellipsis>{question.title}</Text><Text type="secondary">{question.attempts} 次作答</Text></span>
      <Tag color="warning">错误 {question.errorRate}%</Tag>
    </Link>)}
    {expiringSurveys.map((survey) => <Link className="dashboard-alert-item" to="/admin/surveys" key={`survey-${survey.id}`}>
      <ClockCircleOutlined className="dashboard-alert-icon dashboard-alert-icon-error" />
      <span className="dashboard-alert-copy"><Text ellipsis>{survey.title}</Text><Text type="secondary">截止 {formatDateTime(survey.expiresAt)}</Text></span>
      <Tag color="error">即将到期</Tag>
    </Link>)}
  </div>;
}

export default function Dashboard() {
  const { message } = App.useApp();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(true);
  const [rangeMode, setRangeMode] = useState('week');
  const [customRange, setCustomRange] = useState(() => [dayjs().subtract(6, 'day'), dayjs()]);
  const [chartType, setChartType] = useState('bar');
  const [highlightedIds, setHighlightedIds] = useState(() => new Set());
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null);
  const responseIdsRef = useRef(null);
  const requestIdRef = useRef(0);
  const highlightTimerRef = useRef(null);
  const mountedRef = useRef(true);
  const liveGridRef = useRef(null);
  const sideStackRef = useRef(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; window.clearTimeout(highlightTimerRef.current); };
  }, []);

  const load = useCallback(async ({ poll = false } = {}) => {
    const requestId = ++requestIdRef.current;
    if (!poll) setRefreshing(true);
    try {
      const result = await api.getDashboard(filtersFor(rangeMode, customRange));
      if (!mountedRef.current || requestId !== requestIdRef.current) return;
      const newIds = poll ? findNewResponseIds(responseIdsRef.current, result.recentResponses) : [];
      responseIdsRef.current = new Set(result.recentResponses.map((response) => response.id));
      setData(result); setError(''); setLastUpdatedAt(new Date());
      if (newIds.length) {
        window.clearTimeout(highlightTimerRef.current);
        setHighlightedIds(new Set(newIds));
        highlightTimerRef.current = window.setTimeout(() => setHighlightedIds(new Set()), HIGHLIGHT_DURATION_MS);
      }
    } catch (loadError) {
      if (mountedRef.current && requestId === requestIdRef.current) {
        if (rangeMode === 'custom' && loadError.status === 400) {
          setError('');
          if (!poll) message.warning({ key: 'dashboard-custom-range', content: loadError.message });
        } else {
          setError(loadError.message);
        }
      }
    } finally {
      if (mountedRef.current && requestId === requestIdRef.current && !poll) setRefreshing(false);
    }
  }, [customRange, message, rangeMode]);

  useEffect(() => {
    load();
    const interval = window.setInterval(() => load({ poll: true }), POLL_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [load]);

  useLayoutEffect(() => {
    const grid = liveGridRef.current;
    const sideStack = sideStackRef.current;
    if (!grid || !sideStack || !window.ResizeObserver) return undefined;
    const updateHeight = () => grid.style.setProperty('--dashboard-side-height', `${sideStack.getBoundingClientRect().height}px`);
    updateHeight();
    const observer = new window.ResizeObserver(updateHeight);
    observer.observe(sideStack);
    return () => observer.disconnect();
  }, [data]);

  const chartData = useMemo(() => buildDashboardChartData(data?.trend, data?.trendBySurvey, data?.surveyTotals), [data]);
  if (!data && refreshing) return <Card loading />;
  if (!data) return <Alert type="error" showIcon message="仪表盘加载失败" description={error || '无法读取统计数据'} action={<Button onClick={() => load()}>重试</Button>} />;

  const { totals, recentResponses = [], surveyTotals = [], todayOverview = {}, alerts = {} } = data;
  const tableColumns = [
    { title: '提交时间', dataIndex: 'submittedAt', minWidth: 168, render: formatDateTime },
    { title: '来源问卷 / 试卷', dataIndex: 'surveyTitle', minWidth: 230, render: (title, response) => <Space size={8} wrap={false}><Link to={`/admin/surveys/${response.surveyId}/responses`}>{title}</Link><Tag color={response.kind === 'exam' ? 'orange' : 'blue'}>{response.kind === 'exam' ? '试卷' : '问卷'}</Tag></Space> },
    { title: '提交用户', minWidth: 150, render: (_, response) => <Space size={6} wrap={false}><Avatar size={24} icon={<UserOutlined />} /><Text>{response.participant?.displayName || '匿名'}</Text></Space> },
    { title: '得分', minWidth: 112, render: (_, response) => response.score === null ? <Text type="secondary">—</Text> : <Text strong>{response.score} / {response.maxScore}</Text> },
    { title: '状态', dataIndex: 'status', minWidth: 104, render: (status) => status === 'graded' ? <Tag color="success" icon={<CheckCircleOutlined />}>已评分</Tag> : <Tag color="processing">已提交</Tag> },
  ];

  return <Space direction="vertical" size={24} style={{ width: '100%' }}>
    <div className="dashboard-page-header"><div><Text type="secondary" className="page-eyebrow">OVERVIEW</Text><Title level={3}>仪表盘</Title></div><Link to="/admin/surveys"><Button type="primary" icon={<PlusOutlined />}>新建问卷</Button></Link></div>
    {error && <Alert type="warning" showIcon closable message="自动刷新暂时失败" description={`${error}。页面保留上一次成功获取的数据，并将在下一轮继续尝试。`} />}
    <Row gutter={[16, 16]}>
      <Col xs={24} sm={12} lg={6}><Card className="dashboard-metric-card"><Statistic title="累计回收量" value={totals.responses} prefix={<FileDoneOutlined />} suffix="份" /></Card></Col>
      <Col xs={24} sm={12} lg={6}><Card className="dashboard-metric-card"><Statistic title="活跃问卷实例数" value={totals.activeSurveys} prefix={<ThunderboltOutlined />} suffix="个" /></Card></Col>
      <Col xs={24} sm={12} lg={6}><Card className="dashboard-metric-card"><Statistic title="题库总题量" value={totals.questions} prefix={<FormOutlined />} suffix="题" /></Card></Col>
      <Col xs={24} sm={12} lg={6}><Card className="dashboard-metric-card"><Statistic title="近 7 天考试平均分" value={totals.averageExamScore7d ?? 0} precision={1} prefix={<TrophyOutlined />} suffix={totals.averageExamScore7d === null ? null : '%'} formatter={totals.averageExamScore7d === null ? () => '—' : undefined} /></Card></Col>
    </Row>
    <Card><div className="dashboard-chart-header"><div><Title level={4} style={{ margin: 0 }}>回收趋势</Title><Text type="secondary">{data.range.startDate} 至 {data.range.endDate}，按 UTC 自然日统计</Text></div><div className="dashboard-chart-controls">
      <Segmented value={chartType} onChange={setChartType} options={[{ label: '柱状图', value: 'bar', icon: <BarChartOutlined /> }, { label: '折线图', value: 'line', icon: <LineChartOutlined /> }, { label: '扇形图', value: 'pie', icon: <PieChartOutlined /> }]} />
      <Segmented value={rangeMode} onChange={setRangeMode} options={[{ label: '近一周', value: 'week' }, { label: '近一月', value: 'month' }, { label: '自定义', value: 'custom' }]} />
      {rangeMode === 'custom' && <RangePicker allowClear={false} value={customRange} onChange={(dates) => dates?.[0] && dates?.[1] && setCustomRange(dates)} />}
    </div></div><RecoveryTrendChart type={chartType} daily={chartData.daily} series={chartData.series} surveyTotals={surveyTotals} /></Card>
    <div className="dashboard-live-grid" ref={liveGridRef}>
      <Card className="dashboard-live-card" title={<LiveTitle lastUpdatedAt={lastUpdatedAt} />}><Table className="dashboard-live-table" size="small" rowKey="id" pagination={false} tableLayout="auto" dataSource={recentResponses} columns={tableColumns} scroll={{ x: 'max-content' }} locale={{ emptyText: '暂无回收流水' }} rowClassName={(response) => highlightedIds.has(response.id) ? 'dashboard-response-new' : ''} /></Card>
      <div className="dashboard-side-stack" ref={sideStackRef}>
        <Card className="dashboard-side-card" title="今日概览"><div className="dashboard-overview-stats"><Statistic title="回收量" value={todayOverview.responses ?? '—'} suffix={todayOverview.responses === undefined ? null : '份'} /><Statistic title="考试数" value={todayOverview.exams ?? '—'} suffix={todayOverview.exams === undefined ? null : '场'} /><Statistic title="通过率" value={todayOverview.passRate ?? '—'} suffix={todayOverview.passRate === undefined || todayOverview.passRate === null ? null : '%'} /></div></Card>
        <Card className="dashboard-side-card" title="待办预警"><AlertList alerts={alerts} /></Card>
        <Card className="dashboard-side-card" title="快捷入口"><div className="dashboard-quick-links"><Link to="/admin/users"><Button block icon={<UserOutlined />}>用户管理</Button></Link><Link to="/admin/plugins"><Button block icon={<AppstoreOutlined />}>插件中心</Button></Link><Link to="/admin/settings?tab=update"><Button block icon={<CloudDownloadOutlined />}>检查更新</Button></Link></div></Card>
      </div>
    </div>
  </Space>;
}
