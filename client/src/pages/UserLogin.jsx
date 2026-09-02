import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Alert, Button, Card, Form, Input, Space, Typography } from 'antd';
import { LockOutlined, LoginOutlined, MailOutlined } from '@ant-design/icons';
import { api } from '../api';
import { useUserAuth } from '../hooks/useUserAuth';

const { Title, Text } = Typography;

export default function UserLogin() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const location = useLocation();
  const navigate = useNavigate();
  const { refresh } = useUserAuth();
  const returnTo = new URLSearchParams(location.search).get('returnTo') || '/';
  const submit = async (values) => {
    setLoading(true); setError('');
    try { const result = await api.userLogin({ ...values, returnTo }); await refresh(); navigate(result.returnTo || returnTo); }
    catch (e) { setError(e.message); } finally { setLoading(false); }
  };
  return <div className="auth-shell"><Card className="auth-card" bordered={false}>
    <Title level={2}>用户登录</Title><Text type="secondary">登录后继续填写问卷</Text>
    {error && <Alert type="error" showIcon message={error} style={{ marginTop: 20 }} />}
    <Form layout="vertical" onFinish={submit} requiredMark={false} style={{ marginTop: 24 }}>
      <Form.Item name="email" label="邮箱" rules={[{ required: true, type: 'email', message: '请输入有效邮箱' }]}><Input prefix={<MailOutlined />} autoComplete="email" /></Form.Item>
      <Form.Item name="password" label="密码" rules={[{ required: true, message: '请输入密码' }]}><Input.Password prefix={<LockOutlined />} autoComplete="current-password" /></Form.Item>
      <Button type="primary" htmlType="submit" icon={<LoginOutlined />} loading={loading} block>登录</Button>
    </Form>
    <Space direction="vertical" size={4} style={{ marginTop: 20 }}><Link to={`/user/register?returnTo=${encodeURIComponent(returnTo)}`}>注册账户</Link><Link to="/user/forgot-password">忘记密码</Link><Link to="/user/profile">账户资料</Link><Link to={`/admin/login`}>管理员登录</Link></Space>
  </Card></div>;
}
