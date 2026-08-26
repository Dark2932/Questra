import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card, Table, Statistic, Button, Typography, Space, Row, Col, Empty, App } from 'antd';
import { ArrowLeftOutlined, ExportOutlined, FileExcelOutlined, CloudDownloadOutlined } from '@ant-design/icons';
import { formatAnswer } from '../../lib/format';
import { api } from '../../api';

const { Title, Text } = Typography;

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export default function Responses() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const { message } = App.useApp();

  useEffect(() => {
    api.getSurveyResponses(id).then(setData).catch(() => {}).finally(() => setLoading(false));
  }, [id]);

  const handleExport = async (format) => {
    if (exporting) return;
    setExporting(true);
    try {
      const blob = await api.exportSurveyResponses(id, format);
      downloadBlob(blob, `survey-${id}.${format}`);
      message.success('导出成功');
    } catch (e) {
      message.error(e.message);
    } finally {
      setExporting(false);
    }
  };

  if (loading) return <Card loading />;
  if (!data) return <Card><Empty description="加载失败" /></Card>;

  const { survey, responses } = data;
  const avgScore = responses.length ? (responses.reduce((s, r) => s + (r.score || 0), 0) / responses.length).toFixed(1) : '0';

  return (
    <Space direction="vertical" size={24} style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <Link to="/admin/surveys" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: 8 }}>
            <ArrowLeftOutlined /> 返回问卷
          </Link>
          <Title level={3} style={{ marginTop: 0, marginBottom: 4 }}>{survey.title}</Title>
          <Text type="secondary">回收数据</Text>
        </div>
        <Space wrap>
          <a href={`/s/${survey.id}`} target="_blank" rel="noopener noreferrer">
            <Button icon={<ExportOutlined />}>打开问卷</Button>
          </a>
          <Button icon={<FileExcelOutlined />} loading={exporting} disabled={!responses.length} onClick={() => handleExport('csv')}>导出 CSV</Button>
          <Button icon={<CloudDownloadOutlined />} loading={exporting} disabled={!responses.length} onClick={() => handleExport('json')}>导出 JSON</Button>
        </Space>
      </div>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12}><Card><Statistic title={survey.kind === 'exam' ? '试卷总数' : '答卷总数'} value={responses.length} /></Card></Col>
        {survey.kind === 'exam' && <Col xs={24} sm={12}><Card><Statistic title="平均分" value={avgScore} suffix={`/ ${survey.maxScore}`} /></Card></Col>}
      </Row>
      <Card title={survey.kind === 'exam' ? '成绩明细' : '答卷明细'}
        extra={<Text type="secondary">{survey.kind === 'exam' ? `满分 ${survey.maxScore} 分` : '多选答案使用顿号分隔展示'}</Text>}>
        <Table size="small" rowKey="id" pagination={false} dataSource={responses}
          scroll={{ x: true }}
          columns={[
            { title: '提交时间', dataIndex: 'submittedAt', width: 180 },
            ...survey.questions.map((q) => ({ title: q.title, key: q.id, width: 160,
              render: (_, r) => { const ans = r.answers[q.id]; return ans ? formatAnswer(ans.value) : '\u2014'; } })),
            ...(survey.kind === 'exam' ? [{ title: '得分', width: 100,
              render: (_, r) => r.score != null ? <Text strong>{r.score} / {r.maxScore}</Text> : '\u2014' }] : []),
          ]}
          locale={{ emptyText: <Empty description="分享问卷链接后，提交数据会出现在这里" /> }}
        />
      </Card>
    </Space>
  );
}
