import { Empty, Typography, theme } from 'antd';
import { useEffect, useState } from 'react';
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

const INSTANCE_COLORS = ['#8FB3FF', '#8FD3C7', '#F6C58C', '#D7B5F9', '#F3A6B8', '#A8D8EA', '#C9D99E', '#F7D794'];

function hslToHex(hue, saturation = 58, lightness = 72) {
  const s = saturation / 100;
  const l = lightness / 100;
  const chroma = (1 - Math.abs(2 * l - 1)) * s;
  const segment = hue / 60;
  const x = chroma * (1 - Math.abs((segment % 2) - 1));
  const [red, green, blue] = segment < 1 ? [chroma, x, 0]
    : segment < 2 ? [x, chroma, 0]
      : segment < 3 ? [0, chroma, x]
        : segment < 4 ? [0, x, chroma]
          : segment < 5 ? [x, 0, chroma]
            : [chroma, 0, x];
  const match = l - chroma / 2;
  return `#${[red, green, blue].map((value) => Math.round((value + match) * 255).toString(16).padStart(2, '0')).join('')}`;
}

function shortDate(value) {
  return String(value || '').slice(5).replace('-', '/');
}

function buildColorMap(ids, colors) {
  return new Map([...new Set(ids.map((id) => String(id)))].sort().map((id, index) => [id, colors[index] || hslToHex((index * 137.508) % 360)]));
}

function ChartLegend({ payload }) {
  return <div className="dashboard-chart-legend">
    {(payload || []).map((entry) => <span className="dashboard-chart-legend-item" key={entry.value}>
      <span className="dashboard-chart-legend-swatch" style={{ backgroundColor: entry.color }} aria-hidden="true" />
      <Text type="secondary">{entry.value}</Text>
    </span>)}
  </div>;
}

function BarShape({ x, y, width, height, fill, isTop, separator }) {
  const safeWidth = Math.max(0, Number(width) || 0);
  const safeHeight = Math.max(0, Number(height) || 0);
  if (!safeWidth || !safeHeight) return null;
  const topRadius = isTop ? Math.min(6, safeWidth / 2, safeHeight) : 0;
  const right = x + safeWidth;
  const bottom = y + safeHeight;
  const path = topRadius
    ? `M ${x} ${y + topRadius} Q ${x} ${y} ${x + topRadius} ${y} H ${right - topRadius} Q ${right} ${y} ${right} ${y + topRadius} V ${bottom} H ${x} Z`
    : `M ${x} ${y} H ${right} V ${bottom} H ${x} Z`;
  return <path d={path} fill={fill} stroke={separator} strokeWidth={1.5} />;
}

function TooltipBox({ label, date, children }) {
  return <div className="dashboard-chart-tooltip"><Text strong>{label}</Text>{children}{date && <Text type="secondary" className="dashboard-tooltip-date">日期：{date}</Text>}</div>;
}

function DayTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const day = payload[0]?.payload;
  if (!day) return null;
  return <TooltipBox key={day.day || label} label="当天回收" date={day.day || label}>
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
  const date = item.payload?.day || label;
  return <TooltipBox key={`${date}-${item.name}`} label={item.name} date={date}>
    <Text type="secondary">回收 {count} 份</Text>
    <Text type="secondary">占当天 {total ? Math.round(count * 1000 / total) / 10 : 0}%</Text>
  </TooltipBox>;
}

function PieTooltip({ active, payload, total }) {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload;
  const percentage = total ? Math.round(Number(item.count || 0) * 1000 / total) / 10 : 0;
  return <TooltipBox key={item.surveyId} label={item.surveyTitle}>
    <Text type="secondary">回收总数 {item.count} 份</Text>
    <Text type="secondary">占全部 {percentage}%</Text>
  </TooltipBox>;
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener?.('change', update);
    return () => query.removeEventListener?.('change', update);
  }, []);

  return reduced;
}

export default function RecoveryTrendChart({ type, daily, series, surveyTotals }) {
  const { token } = theme.useToken();
  const reducedMotion = useReducedMotion();
  const colors = INSTANCE_COLORS;
  const colorMap = buildColorMap([
    ...series.map((item) => item.surveyId),
    ...surveyTotals.map((item) => item.surveyId),
  ], colors);
  const colorFor = (id) => colorMap.get(String(id)) || colors[0];
  const axis = { fontSize: 12, fill: token.colorTextSecondary };
  const barData = daily.map((day) => ({
    ...day,
    __topDataKey: [...series].reverse().find((item) => Number(day[item.dataKey] || 0) > 0)?.dataKey,
  }));
  const surveyTotalCount = surveyTotals.reduce((sum, item) => sum + Number(item.count || 0), 0);

  if (!surveyTotals.length) return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="所选时间范围内暂无回收数据" />;

  if (type === 'pie') {
    return <div className="dashboard-chart" role="img" aria-label="按实例统计的回收占比扇形图">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={surveyTotals} dataKey="count" nameKey="surveyTitle" innerRadius="42%" outerRadius="72%" paddingAngle={0} stroke={token.colorBgContainer} strokeWidth={2}>
            {surveyTotals.map((item) => <Cell key={item.surveyId} fill={colorFor(item.surveyId)} />)}
          </Pie>
          <Tooltip isAnimationActive={false} content={<PieTooltip total={surveyTotalCount} />} />
          <Legend content={<ChartLegend />} />
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
      <BarChart data={barData} stackOffset="expand" margin={{ top: 12, right: 20, left: 0, bottom: 4 }}>
        <CartesianGrid stroke={token.colorBorderSecondary} strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="day" tickFormatter={shortDate} tick={axis} minTickGap={24} />
        <YAxis domain={[0, 1]} tickFormatter={(value) => `${Math.round(value * 100)}%`} tick={axis} width={48} />
        <Tooltip shared={false} isAnimationActive={false} content={<BarTooltip />} />
        <Legend content={<ChartLegend />} />
        {series.map((item) => <Bar key={item.surveyId} dataKey={item.dataKey} name={item.surveyTitle} stackId="responses" fill={colorFor(item.surveyId)} maxBarSize={48} isAnimationActive={!reducedMotion} animationBegin={0} animationDuration={520} animationEasing="ease-out" shape={(props) => <BarShape {...props} isTop={props.payload?.__topDataKey === item.dataKey} separator={token.colorBgContainer} />} />)}
      </BarChart>
    </ResponsiveContainer>
  </div>;
}
