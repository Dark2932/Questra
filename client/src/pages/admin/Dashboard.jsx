import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, Col, Row, Statistic, Table, Tag, Button, Typography, Space } from 'antd';
import { FileTextOutlined, FormOutlined, ThunderboltOutlined, EditOutlined } from '@ant-design/icons';
import { api } from '../../api';

const { Title, Text } = Typography;

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getDashboard().then(setData).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <Card loading />;
  if (!data) return null;
  const { totals, trend, recentSurveys = [] } = data;

  return (
    <Space direction="vertical" size={24} style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <Text type="secondary" style={{ letterSpacing: 1, textTransform: 'uppercase', fontSize: 12 }}>OVERVIEW</Text>
          <Title level={3} style={{ marginTop: 4, marginBottom: 0 }}>仪表盘</Title>
        </div>
        <Link to="/admin/surveys"><Button type="primary">新建问卷</Button></Link>
      </div>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}><Card><Statistic title="题库题目" value={totals.questions} prefix={<FormOutlined />} /></Card></Col>
        <Col xs={24} sm={12} lg={6}><Card><Statistic title="实例总数" value={totals.surveys} prefix={<FileTextOutlined />} /></Card></Col>
        <Col xs={24} sm={12} lg={6}><Card><Statistic title="回收中" value={totals.active_surveys} prefix={<ThunderboltOutlined />} /></Card></Col>
        <Col xs={24} sm={12} lg={6}><Card><Statistic title="答卷总数" value={totals.responses} prefix={<EditOutlined />} /></Card></Col>
      </Row>
      <Card title="近 7 日回收" extra={<Text type="secondary">按答卷提交日期统计</Text>}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 12, alignItems: 'end', height: 180 }}>
          {trend.map((item) => {
            const max = Math.max(1, ...trend.map((t) => t.count));
            const h = Math.max(item.count ? 12 : 3, (item.count / max) * 150);
            return (
              <div key={item.day} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <Text style={{ fontSize: 12 }}>{item.count}</Text>
                <div style={{ width: '100%', height: h, borderRadius: 6, background: 'var(--ant-color-primary)', opacity: 0.85 }} />
                <Text type="secondary" style={{ fontSize: 11 }}>{item.day.slice(5)}</Text>
              </div>
            );
          })}
        </div>
      </Card>
      <Card title="最近实例" extra={<Link to="/admin/surveys">查看全部</Link>}>
        <Table size="small" rowKey="id" pagination={false} dataSource={recentSurveys}
          columns={[
            { title: '实例', dataIndex: 'title', render: (t, r) => (<div><div style={{ fontWeight: 600 }}>{t}</div><Text type="secondary" style={{ fontSize: 12 }}>{r.kind === 'exam' ? `考试 · ${r.max_score} 分` : '普通问卷'}</Text></div>) },
            { title: '状态', dataIndex: 'status', width: 90, render: (v) => <Tag color={v === 'active' ? 'green' : 'default'}>{v === 'active' ? '回收中' : '已关闭'}</Tag> },
            { title: '题目', dataIndex: 'question_count', width: 80 },
            { title: '提交', dataIndex: 'response_count', width: 80 },
            { title: '创建时间', dataIndex: 'created_at', width: 180, render: (v) => v?.replace('T', ' ').slice(0, 16) },
            { width: 70, render: (_, r) => <Link to={`/admin/surveys/${r.id}/responses`}>数据</Link> },
          ]}
        />
      </Card>
    </Space>
  );
}