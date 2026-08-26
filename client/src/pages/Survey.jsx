import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Typography, Result, Spin, Statistic, Card, Space, Divider, Button, Avatar } from 'antd';
import { CheckCircleOutlined, ClockCircleOutlined, FileTextOutlined, ReloadOutlined } from '@ant-design/icons';
import { api } from '../api';
import SurveyForm from './SurveyForm';

const { Text, Title, Paragraph } = Typography;

export default function Survey() {
  const { id } = useParams();
  const [survey, setSurvey] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [examResult, setExamResult] = useState(null);

  useEffect(() => {
    api.getPublicSurvey(id).then(setSurvey).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }, [id]);

  const handleSubmit = async (answers) => {
    const result = await api.submitResponse(id, answers);
    if (result.score != null) setExamResult(result);
    setSubmitted(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const containerStyle = { minHeight: '100vh', background: 'var(--ant-color-bg-layout)', display: 'flex', justifyContent: 'center', padding: '48px 16px' };

  if (loading) return (<div style={containerStyle}><Spin size="large" /></div>);
  if (error) return (<div style={containerStyle}><Result status="warning" title="无法加载问卷" subTitle={error}
    extra={<Button icon={<ReloadOutlined />} onClick={() => window.location.reload()}>重试</Button>} /></div>);

  return (
    <div style={containerStyle}>
      <div style={{ maxWidth: 640, width: '100%' }}>
        <Card bordered={false} style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)', borderRadius: 8 }}>
          {!submitted ? (
            <>
              <Space size={8} style={{ marginBottom: 8 }}>
                <Avatar shape="square" size={24} src={survey.siteIcon || undefined}>Q</Avatar>
                <Text type="secondary" style={{ fontSize: 12, letterSpacing: 0.5 }}>
                  {survey.siteName || 'Questra'} &middot; {survey.kind === 'exam' ? '考试' : '问卷'}
                </Text>
              </Space>
              <Title level={3} style={{ marginTop: 0, marginBottom: 8 }}>{survey.title}</Title>
              {survey.description && <Paragraph type="secondary" style={{ marginBottom: 16 }}>{survey.description}</Paragraph>}
              <Space size={16} wrap style={{ marginBottom: 24 }}>
                <Text type="secondary" style={{ fontSize: 13 }}><FileTextOutlined /> {survey.questions.length} 道题</Text>
                {survey.kind === 'exam' && <Text type="secondary" style={{ fontSize: 13 }}>满分 {survey.maxScore} 分</Text>}
                {survey.expiresAt && <Text type="secondary" style={{ fontSize: 13 }}><ClockCircleOutlined /> 截止 {new Date(survey.expiresAt).toLocaleString('zh-CN', { hour12: false })}</Text>}
              </Space>
              <Divider style={{ margin: '0 0 24px' }} />
              <SurveyForm survey={survey} onSubmit={handleSubmit} />
            </>
          ) : (
            <div style={{ padding: '48px 0', textAlign: 'center' }}>
              <CheckCircleOutlined style={{ fontSize: 48, color: 'var(--ant-color-success)', marginBottom: 16 }} />
              <Title level={4} style={{ marginTop: 0 }}>{survey.kind === 'exam' ? '试卷已提交' : '感谢参与'}</Title>
              <Text type="secondary">{examResult ? `你的得分：${examResult.score} / ${examResult.maxScore} 分` : '你的答卷已成功提交。'}</Text>
              {examResult && (
                <div style={{ marginTop: 24 }}>
                  <Statistic value={examResult.score}
                    valueStyle={{ color: 'var(--ant-color-primary)', fontSize: 40, fontWeight: 700 }}
                    suffix={<Text type="secondary" style={{ fontSize: 16, marginLeft: 4 }}>/ {examResult.maxScore} 分</Text>} />
                </div>
              )}
            </div>
          )}
        </Card>
        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>Powered by Questra</Text>
        </div>
      </div>
    </div>
  );
}
