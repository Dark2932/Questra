import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Typography, Result, Spin, Statistic } from 'antd';
import { CheckCircleOutlined, ClockCircleOutlined, FileTextOutlined } from '@ant-design/icons';
import { api } from '../api';
import Meteors from '../components/effects/Meteors';
import GridPattern from '../components/effects/GridPattern';
import SurveyForm from './SurveyForm';

const { Text, Title } = Typography;

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

  if (loading) return (<div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #070e1a, #0c1a2e, #091420)', display: 'grid', placeItems: 'center' }}><Spin size="large" /></div>);
  if (error) return (<div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #070e1a, #0c1a2e, #091420)', display: 'grid', placeItems: 'center', padding: 24 }}><Result status="warning" title="无法加载问卷" subTitle={error} style={{ color: '#fff' }} /></div>);

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #070e1a, #0c1a2e, #091420)', position: 'relative', overflow: 'hidden' }}>
      <Meteors number={25} /><GridPattern />
      <div style={{ position: 'relative', zIndex: 10, maxWidth: 640, margin: '0 auto', padding: '48px 24px' }}>
        <div style={{ borderRadius: 16, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(20px)', overflow: 'hidden' }}>
          {!submitted ? (
            <>
              <header style={{ padding: '32px 32px 24px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <Text style={{ color: 'rgba(16,185,129,0.8)', fontSize: 12, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12, display: 'block' }}>
                  {survey.siteName || 'Questra'} · {survey.kind === 'exam' ? '考试' : '问卷'}
                </Text>
                <Title level={2} style={{ color: '#fff', marginTop: 0, marginBottom: 8 }}>{survey.title}</Title>
                {survey.description && <Text style={{ color: 'rgba(255,255,255,0.5)', whiteSpace: 'pre-wrap' }}>{survey.description}</Text>}
                <div style={{ display: 'flex', gap: 20, marginTop: 16, color: 'rgba(255,255,255,0.4)', fontSize: 12, flexWrap: 'wrap' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><FileTextOutlined /> {survey.questions.length} 道题</span>
                  {survey.kind === 'exam' && <span>满分 {survey.maxScore} 分</span>}
                  {survey.expiresAt && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><ClockCircleOutlined /> 截止 {new Date(survey.expiresAt).toLocaleString('zh-CN', { hour12: false })}</span>}
                </div>
              </header>
              <SurveyForm survey={survey} onSubmit={handleSubmit} />
            </>
          ) : (
            <div style={{ padding: '64px 32px', textAlign: 'center' }}>
              <CheckCircleOutlined style={{ fontSize: 48, color: '#10b981', marginBottom: 16 }} />
              <Title level={3} style={{ color: '#fff', marginTop: 0 }}>{survey.kind === 'exam' ? '试卷已提交' : '感谢参与'}</Title>
              <Text style={{ color: 'rgba(255,255,255,0.5)' }}>{examResult ? `你的得分：${examResult.score} / ${examResult.maxScore} 分` : '你的答卷已成功提交。'}</Text>
              {examResult && (
                <div style={{ marginTop: 24, display: 'inline-flex', alignItems: 'baseline', gap: 8, background: 'rgba(255,255,255,0.06)', borderRadius: 12, padding: '16px 32px', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <Statistic value={examResult.score} valueStyle={{ color: '#10b981', fontSize: 36, fontWeight: 700 }} suffix={<Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 18 }}>/ {examResult.maxScore} 分</Text>} />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}