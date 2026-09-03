import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMemo } from 'react';
import { Typography, Result, Spin, Statistic, Card, Space, Divider, Button, ConfigProvider, Segmented, Tooltip, theme as antTheme } from 'antd';
import { CheckCircleOutlined, ClockCircleOutlined, FileTextOutlined, ReloadOutlined, SettingOutlined, SunOutlined, MoonOutlined } from '@ant-design/icons';
import { api } from '../api';
import { useTheme } from '../hooks/useTheme';
import { DEFAULT_SITE_ICON_URL } from '../lib/siteIcon';
import { formatPageTitle } from '../lib/pageTitle';
import SurveyForm from './SurveyForm';

const { Text, Title, Paragraph } = Typography;

export default function Survey({ siteName }) {
  const { id } = useParams();
  const [survey, setSurvey] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [examResult, setExamResult] = useState(null);
  const { theme, resolvedTheme, setTheme } = useTheme('questra-survey-theme', false);

  useEffect(() => {
    api.getPublicSurvey(id).then(setSurvey).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    document.title = formatPageTitle(survey?.title || '问卷', survey?.siteName || siteName);
  }, [siteName, survey]);

  const handleSubmit = async (answers) => {
    const result = await api.submitResponse(id, answers);
    if (result.score != null) setExamResult(result);
    setSubmitted(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const containerStyle = {
    minHeight: '100%',
    background: resolvedTheme === 'dark' ? '#000000' : '#f5f5f7',
    colorScheme: resolvedTheme,
    display: 'flex',
    justifyContent: 'center',
    padding: '48px 16px',
    position: 'relative',
  };
  const themeColor = survey?.themeColor || '#0D9488';
  const surveyTheme = useMemo(() => ({
    algorithm: resolvedTheme === 'dark' ? antTheme.darkAlgorithm : antTheme.defaultAlgorithm,
    token: {
      colorPrimary: themeColor,
      colorLink: themeColor,
      colorBgBase: resolvedTheme === 'dark' ? '#000000' : '#ffffff',
      colorBgLayout: resolvedTheme === 'dark' ? '#000000' : '#f5f5f7',
      colorBgContainer: resolvedTheme === 'dark' ? '#1c1c1e' : '#ffffff',
      colorBgElevated: resolvedTheme === 'dark' ? '#2c2c2e' : '#ffffff',
      colorTextBase: resolvedTheme === 'dark' ? '#f5f5f7' : '#1d1d1f',
      colorTextSecondary: resolvedTheme === 'dark' ? '#98989d' : '#6e6e73',
      colorBorderSecondary: resolvedTheme === 'dark' ? '#38383a' : '#e5e5ea',
      borderRadius: resolvedTheme === 'dark' ? 10 : 6,
    },
  }), [resolvedTheme, themeColor]);

  useEffect(() => {
    if (!survey) return undefined;
    const root = document.documentElement;
    root.style.setProperty('--questra-theme-color', themeColor);
    let link = document.querySelector('link[rel="icon"]');
    if (!link) { link = document.createElement('link'); link.rel = 'icon'; document.head.appendChild(link); }
    link.href = survey.siteIcon || DEFAULT_SITE_ICON_URL;
    return () => root.style.removeProperty('--questra-theme-color');
  }, [survey, themeColor]);

  if (loading) return (<ConfigProvider theme={surveyTheme}><div style={containerStyle}><Spin size="large" /></div></ConfigProvider>);
  if (error) return (<ConfigProvider theme={surveyTheme}><div style={containerStyle}><Result status="warning" title="无法加载问卷" subTitle={error}
    extra={<Button icon={<ReloadOutlined />} onClick={() => window.location.reload()}>重试</Button>} /></div></ConfigProvider>);

  const accessDenied = survey && !survey.questions;
  if (accessDenied) {
    const returnTo = `/s/${id}`;
    const loginUrl = `/user/login?returnTo=${encodeURIComponent(returnTo)}`;
    const registerUrl = `/user/register?returnTo=${encodeURIComponent(returnTo)}`;
    return <ConfigProvider theme={surveyTheme}><div style={containerStyle}><Card bordered={false} style={{ maxWidth: 640, width: '100%', textAlign: 'center' }}>
      <Result status={survey.viewer?.authenticated ? 'warning' : 'info'} title={survey.accessPolicy?.requiresVerifiedEmail && survey.viewer?.authenticated ? '请先验证邮箱' : '请登录后填写'}
        subTitle={survey.accessPolicy?.requiresVerifiedEmail ? '该问卷要求使用已验证邮箱的账户。' : '该问卷需要登录 Questra 用户账户后才能填写。'}
        extra={<Space><Link to={loginUrl}><Button type="primary">登录</Button></Link><Link to={registerUrl}><Button>注册账户</Button></Link></Space>} />
    </Card></div></ConfigProvider>;
  }

  return (
    <ConfigProvider theme={surveyTheme}><div className="survey-page-shell" style={containerStyle}>
      <Segmented
        size="small"
        value={theme}
        onChange={setTheme}
        aria-label="问卷页面主题"
        style={{ position: 'absolute', top: 16, right: 48 }}
        options={[
          { value: 'light', icon: <Tooltip title="浅色"><SunOutlined /></Tooltip> },
          { value: 'dark', icon: <Tooltip title="深色"><MoonOutlined /></Tooltip> },
          { value: 'system', icon: <Tooltip title="跟随系统"><SettingOutlined /></Tooltip> },
        ]}
      />
      <div style={{ maxWidth: 640, width: '100%' }}>
        <Card bordered={false} style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)', borderRadius: 8 }}>
          {!submitted ? (
            <>
              <div style={{ textAlign: 'center' }}>
                <Title level={3} style={{ marginTop: 0, marginBottom: 8 }}>{survey.title}</Title>
                {survey.description && <Paragraph type="secondary" style={{ marginBottom: 16 }}>{survey.description}</Paragraph>}
                <Space size={16} wrap style={{ marginBottom: 24, justifyContent: 'center' }}>
                  <Text type="secondary" style={{ fontSize: 13 }}><FileTextOutlined /> {survey.questions.length} 道题</Text>
                  {survey.kind === 'exam' && <Text type="secondary" style={{ fontSize: 13 }}>满分 {survey.maxScore} 分</Text>}
                  {survey.expiresAt && <Text type="secondary" style={{ fontSize: 13 }}><ClockCircleOutlined /> 截止于 {new Date(survey.expiresAt).toLocaleString('zh-CN', { hour12: false })}</Text>}
                </Space>
              </div>
              <Divider style={{ margin: '0 0 24px' }} />
              <SurveyForm survey={survey} onSubmit={handleSubmit} />
            </>
          ) : (
            <div style={{ padding: '48px 0', textAlign: 'center' }}>
              <CheckCircleOutlined style={{ fontSize: 48, color: 'var(--ant-color-success)', marginBottom: 16 }} />
              <Title level={4} style={{ marginTop: 0 }}>{survey.kind === 'exam' ? '试卷已提交' : '感谢参与'}</Title>
              <Text type="secondary">{examResult ? `你的得分：${examResult.score} / ${examResult.maxScore} 分` : '你的答卷已成功提交'}</Text>
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
      </div>
    </div></ConfigProvider>
  );
}
