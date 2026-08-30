import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Alert, Button, Card, Form, Input, Space, Typography, App } from 'antd';
import { KeyOutlined, LoginOutlined } from '@ant-design/icons';
import SiteMark from '../components/SiteMark';

const { Title, Text } = Typography;

export default function Unauthorized({ siteName, siteInitial, siteInitialColor, siteIcon, siteIconAsInitial }) {
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');
  const { message } = App.useApp();

  const submit = async ({ token: rawToken }) => {
    const token = rawToken.trim();
    setVerifying(true);
    setError('');
    try {
      const response = await fetch('/api/admin/dashboard', {
        headers: { authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Admin Token 无效或已过期，请检查后重试');
      sessionStorage.setItem('questra_admin_token', token);
      message.success('登录成功');
      window.location.href = '/admin';
    } catch (requestError) {
      setError(requestError.message || '无法连接服务器，请稍后重试');
    } finally {
      setVerifying(false);
    }
  };

  return <div className="auth-shell">
    <Card className="auth-card" bordered={false}>
      <div className="auth-brand"><SiteMark className="brand-mark" size={38} borderRadius={10} fontSize={17} siteName={siteName} siteInitial={siteInitial} siteInitialColor={siteInitialColor} siteIcon={siteIcon} siteIconAsInitial={siteIconAsInitial} /><span className="auth-brand-name">{siteName || 'Questra'}</span></div>
      <Title level={2}>管理员登录</Title>
      <Text type="secondary">请输入有效的的 Admin Token</Text>
      {error && <Alert type="error" showIcon message={error} style={{ marginTop: 20 }} />}
      <Form layout="vertical" onFinish={submit} requiredMark={false} style={{ marginTop: 24 }}>
        <Form.Item name="token" label="Admin Token" rules={[{ required: true, whitespace: true, message: '请输入 Admin Token' }]}><Input.Password prefix={<KeyOutlined />} autoComplete="off" placeholder="Admin Token" /></Form.Item>
        <Button type="primary" htmlType="submit" icon={<LoginOutlined />} loading={verifying} block>登录</Button>
      </Form>
      <Space direction="vertical" size={2} className="auth-note">
        <Link to="/admin/login" className="auth-token-link">使用账号与密码登录</Link>
      </Space>
    </Card>
  </div>;
}
