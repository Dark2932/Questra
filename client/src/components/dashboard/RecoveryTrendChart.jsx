import { Empty, Typography, theme } from 'antd';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const { Text } = Typography;

function shortDate(value) {
  return String(value || '').slice(5).replace('-', '/');
}

function seriesColor(id, colors) {
  let hash = 0;
  for (const char of String(id)) hash = ((hash << 5) - hash + char.charCodeAt(0)) | 0;
  return colors[Math.abs(hash) % colors.length];
}

function TooltipBox({ label, children }) {
  return <div className="dashboard-chart-tooltip"><Text strong>{label}</Text>{children}</div>;
}

function DayTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const day = payload[0]?.payload;
  if (!day) return null;
  return <TooltipBox key={label} label={label}>
    <Text type="secondary">当天合计 {day.total} 份</Text>
    {day.breakdown.map((item) => <div className="dashboard-tooltip-row" key={item.surveyId}>
      <span>{item.surveyTitle}</span><Text>{item.count} 份</Text>
    </div>)}
  </TooltipBox>;
}

function BarTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  const count = Number(item.value || 0);
  const total = Number(item.payload?.total || 0);
  return <TooltipBox key={`${label}-${item.name}`} label={item.name}>
    <Text type="secondary">{label} 回收 {count} 份</Text>
    <Text type="secondary">占当天 {total ? Math.round(count * 1000 / total) / 10 : 0}%</Text>
  </TooltipBox>;
}

function PieTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload;
  return <TooltipBox key={item.surveyId} label={item.surveyTitle}>
    <Text type="secondary">回收总数 {item.count} 份</Text>
  </TooltipBox>;
}

export default function RecoveryTrendChart({ type, daily, series, surveyTotals }) {
  const { token } = theme.useToken();
  const colors = [token.colorPrimary, token.colorSuccess, token.colorWarning, token.colorInfo, token.colorError, token.colorTextTertiary];
  const axis = { fontSize: 12, fill: token.colorTextSecondary };

  if (!surveyTotals.length) return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="所选时间范围内暂无回收数据" />;

  if (type === 'pie') {
    return <div className="dashboard-chart" role="img" aria-label="按实例统计的回收占比扇形图">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={surveyTotals} dataKey="count" nameKey="surveyTitle" innerRadius="42%" outerRadius="72%" paddingAngle={2}>
            {surveyTotals.map((item) => <Cell key={item.surveyId} fill={seriesColor(item.surveyId, colors)} />)}
          </Pie>
          <Tooltip isAnimationActive={false} content={<PieTooltip />} />
          <Legend formatter={(value) => <Text type="secondary">{value}</Text>} />
        </PieChart>
      </ResponsiveContainer>
    </div>;
  }

  if (type === 'line') {
    return <div className="dashboard-chart" role="img" aria-label="按天统计的回收总量折线图">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={daily} margin={{ top: 12, right: 20, left: 0, bottom: 4 }}>
          <CartesianGrid stroke={token.colorBorderSecondary} strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="day" tickFormatter={shortDate} tick={axis} minTickGap={24} />
          <YAxis allowDecimals={false} tick={axis} width={44} />
          <Tooltip isAnimationActive={false} content={<DayTooltip />} />
          <Line type="monotone" dataKey="total" name="回收总数" stroke={token.colorPrimary} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>;
  }

  return <div className="dashboard-chart" role="img" aria-label="按天和实例统计的回收占比柱状图">
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={daily} stackOffset="expand" margin={{ top: 12, right: 20, left: 0, bottom: 4 }}>
        <CartesianGrid stroke={token.colorBorderSecondary} strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="day" tickFormatter={shortDate} tick={axis} minTickGap={24} />
        <YAxis domain={[0, 1]} tickFormatter={(value) => `${Math.round(value * 100)}%`} tick={axis} width={48} />
        <Tooltip shared={false} isAnimationActive={false} content={<BarTooltip />} />
        <Legend formatter={(value) => <Text type="secondary">{value}</Text>} />
        {series.map((item) => <Bar key={item.surveyId} dataKey={item.dataKey} name={item.surveyTitle} stackId="responses" fill={seriesColor(item.surveyId, colors)} maxBarSize={48} radius={[6, 6, 6, 6]} />)}
      </BarChart>
    </ResponsiveContainer>
  </div>;
}
