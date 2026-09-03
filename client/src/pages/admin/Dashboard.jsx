import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import dayjs from 'dayjs';
import {
  Alert,
  Button,
  Card,
  Col,
  DatePicker,
  Row,
  Segmented,
  Space,
  Statistic,
  Table,
  Tag,
  Typography,
} from 'antd';
import {
  BarChartOutlined,
  CheckCircleOutlined,
  FileDoneOutlined,
  FormOutlined,
  LineChartOutlined,
  PieChartOutlined,
  PlusOutlined,
  ThunderboltOutlined,
  TrophyOutlined,
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
  return {
    range: 'custom',
    startDate: customRange[0].format('YYYY-MM-DD'),
    endDate: customRange[1].format('YYYY-MM-DD'),
  };
}

export default function Dashboard() {
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

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      window.clearTimeout(highlightTimerRef.current);
    };
  }, []);

  const load = useCallback(async ({ poll = false } = {}) => {
    const requestId = ++requestIdRef.current;
    if (!poll) setRefreshing(true);
    try {
      const result = await api.getDashboard(filtersFor(rangeMode, customRange));
      if (!mountedRef.current || requestId !== requestIdRef.current) return;
      const newIds = poll ? findNewResponseIds(responseIdsRef.current, result.recentResponses) : [];
      responseIdsRef.current = new Set(result.recentResponses.map((response) => response.id));
      setData(result);
      setError('');
      setLastUpdatedAt(new Date());
      if (newIds.length) {
        window.clearTimeout(highlightTimerRef.current);
        setHighlightedIds(new Set(newIds));
        highlightTimerRef.current = window.setTimeout(() => setHighlightedIds(new Set()), HIGHLIGHT_DURATION_MS);
      }
    } catch (loadError) {
      if (mountedRef.current && requestId === requestIdRef.current) setError(loadError.message);
    } finally {
      if (mountedRef.current && requestId === requestIdRef.current && !poll) setRefreshing(false);
    }
  }, [customRange, rangeMode]);

  useEffect(() => {
    load();
    const interval = window.setInterval(() => load({ poll: true }), POLL_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [load]);

  const chartData = useMemo(() => buildDashboardChartData(
    data?.trend,
    data?.trendBySurvey,
    data?.surveyTotals,
  ), [data]);

  if (!data && refreshing) return <Card loading />;
  if (!data) return <Alert type="error" showIcon message="仪表盘加载失败" description={error || '无法读取统计数据'} action={<Button onClick={() => load()}>重试</Button>} />;

  const { totals, recentResponses = [], surveyTotals = [] } = data;
  const tableColumns = [
    { title: '提交时间', dataIndex: 'submittedAt', width: 190, render: formatDateTime },
    {
      title: '来源问卷 / 试卷',
      dataIndex: 'surveyTitle',
      render: (title, response) => <Space size={8} wrap>
        <Link to={`/admin/surveys/${response.surveyId}/responses`}>{title}</Link>
        <Tag color={response.kind === 'exam' ? 'orange' : 'blue'}>{response.kind === 'exam' ? '试卷' : '问卷'}</Tag>
      </Space>,
    },
    {
      title: '得分',
      width: 130,
      render: (_, response) => response.score === null ? <Text type="secondary">—</Text> : <Text strong>{response.score} / {response.maxScore}</Text>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 110,
      render: (status) => status === 'graded'
        ? <Tag color="success" icon={<CheckCircleOutlined />}>已评分</Tag>
        : <Tag color="processing">已提交</Tag>,
    },
  ];

  return <Space direction="vertical" size={24} style={{ width: '100%' }}>
    <div className="dashboard-page-header">
      <div>
        <Text type="secondary" style={{ letterSpacing: 1, textTransform: 'uppercase', fontSize: 12 }}>OVERVIEW</Text>
        <Title level={3} style={{ marginTop: 4, marginBottom: 0 }}>仪表盘</Title>
      </div>
      <Link to="/admin/surveys"><Button type="primary" icon={<PlusOutlined />}>新建问卷</Button></Link>
    </div>

    {error && <Alert type="warning" showIcon closable message="自动刷新暂时失败" description={`${error}。页面保留上一次成功获取的数据，并将在下一轮继续尝试。`} />}

    <Row gutter={[16, 16]}>
      <Col xs={24} sm={12} lg={6}><Card className="dashboard-metric-card"><Statistic title="累计回收量" value={totals.responses} prefix={<FileDoneOutlined />} suffix="份" /></Card></Col>
      <Col xs={24} sm={12} lg={6}><Card className="dashboard-metric-card"><Statistic title="活跃问卷实例数" value={totals.activeSurveys} prefix={<ThunderboltOutlined />} suffix="个" /></Card></Col>
      <Col xs={24} sm={12} lg={6}><Card className="dashboard-metric-card"><Statistic title="题库总题量" value={totals.questions} prefix={<FormOutlined />} suffix="题" /></Card></Col>
      <Col xs={24} sm={12} lg={6}><Card className="dashboard-metric-card"><Statistic title="近 7 天考试平均分" value={totals.averageExamScore7d ?? 0} precision={1} prefix={<TrophyOutlined />} suffix={totals.averageExamScore7d === null ? null : '%'} formatter={totals.averageExamScore7d === null ? () => '—' : undefined} /></Card></Col>
    </Row>

    <Card>
      <div className="dashboard-chart-header">
        <div>
          <Title level={4} style={{ margin: 0 }}>回收趋势</Title>
          <Text type="secondary">{data.range.startDate} 至 {data.range.endDate}，按 UTC 自然日统计</Text>
        </div>
        <div className="dashboard-chart-controls">
          <Segmented value={chartType} onChange={setChartType} options={[
            { label: '柱状图', value: 'bar', icon: <BarChartOutlined /> },
            { label: '折线图', value: 'line', icon: <LineChartOutlined /> },
            { label: '扇形图', value: 'pie', icon: <PieChartOutlined /> },
          ]} />
          <Segmented value={rangeMode} onChange={setRangeMode} options={[
            { label: '近一周', value: 'week' },
            { label: '近一月', value: 'month' },
            { label: '自定义', value: 'custom' },
          ]} />
          {rangeMode === 'custom' && <RangePicker allowClear={false} value={customRange} onChange={(dates) => dates?.[0] && dates?.[1] && setCustomRange(dates)} />}
        </div>
      </div>
      <RecoveryTrendChart type={chartType} daily={chartData.daily} series={chartData.series} surveyTotals={surveyTotals} />
    </Card>

    <Card className="dashboard-live-card" title={<div className="dashboard-listening-header">
      <span aria-hidden="true" />
      <Space size={8} className="dashboard-listening-title"><Text strong>监听中</Text><span className="dashboard-listening-dot" aria-hidden="true" /></Space>
      {lastUpdatedAt && <Text type="secondary" className="dashboard-last-updated">最近刷新 {lastUpdatedAt.toLocaleTimeString('zh-CN', { hour12: false })}</Text>}
    </div>}>
      <Table
        size="small"
        rowKey="id"
        pagination={false}
        dataSource={recentResponses}
        columns={tableColumns}
        scroll={{ x: 720 }}
        locale={{ emptyText: '暂无回收流水' }}
        rowClassName={(response) => highlightedIds.has(response.id) ? 'dashboard-response-new' : ''}
      />
    </Card>
  </Space>;
}
