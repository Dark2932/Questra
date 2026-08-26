import { useState } from 'react';
import { Alert, Button, Card, Form, Input, Space, Typography, App } from 'antd';
import { LockOutlined, LoginOutlined, UserOutlined } from '@ant-design/icons';
import { api } from '../api';

const { Title, Text } = Typography;

export default function Login({ onLogin }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { message } = App.useApp();

  const submit = async (values) => {
    setLoading(true); setError('');
    try {
      await api.login(values);
      await onLogin();
      message.success('登录成功');
      window.location.href = '/admin';
    } catch (e) {
      setError(e.message);
    } finally { setLoading(false); }
  };

  return <div className="auth-shell">
    <Card className="auth-card" bordered={false}>
      <div className="auth-brand"><span className="brand-mark">Q</span><span>Questra</span></div>
      <Title level={2}>管理员登录</Title>
      <Text type="secondary">登录后管理题库、问卷和答卷数据</Text>
      {error && <Alert type="error" showIcon message={error} style={{ marginTop: 20 }} />}
      <Form layout="vertical" onFinish={submit} requiredMark={false} style={{ marginTop: 24 }}>
        <Form.Item name="username" label="账号" rules={[{ required: true, message: '请输入账号' }]}><Input prefix={<UserOutlined />} autoComplete="username" placeholder="管理员账号" /></Form.Item>
        <Form.Item name="password" label="密码" rules={[{ required: true, message: '请输入密码' }]}><Input.Password prefix={<LockOutlined />} autoComplete="current-password" placeholder="管理员密码" /></Form.Item>
        <Button type="primary" htmlType="submit" icon={<LoginOutlined />} loading={loading} block>登录</Button>
      </Form>
      <Space direction="vertical" size={2} className="auth-note">
        <Text type="secondary">旧版本也可以继续使用 Admin Token 登录。</Text>
        <Text type="secondary">首次部署？请打开初始化页面完成设置。</Text>
      </Space>
    </Card>
  </div>;
}
