import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Alert, Button, Card, Form, Input, Space, Typography } from 'antd';
import { LockOutlined, MailOutlined, UserOutlined } from '@ant-design/icons';
import { api } from '../api';

const { Title, Text } = Typography;

export default function UserRegister() {
  const [loading, setLoading] = useState(false); const [result, setResult] = useState(''); const [error, setError] = useState('');
  const location = useLocation(); const navigate = useNavigate();
  const returnTo = new URLSearchParams(location.search).get('returnTo') || '/';
  const submit = async (values) => { setLoading(true); setError(''); try { await api.userRegister({ ...values, returnTo }); setResult('注册成功，请查收邮箱并完成验证。'); } catch (e) { setError(e.message); } finally { setLoading(false); } };
  return <div className="auth-shell"><Card className="auth-card" bordered={false}><Title level={2}>注册账户</Title><Text type="secondary">验证邮箱后可填写受保护问卷</Text>
    {error && <Alert type="error" showIcon message={error} style={{ marginTop: 20 }} />}{result && <Alert type="success" showIcon message={result} style={{ marginTop: 20 }} />}
    <Form layout="vertical" onFinish={submit} requiredMark={false} style={{ marginTop: 24 }}>
      <Form.Item name="displayName" label="显示名称"><Input prefix={<UserOutlined />} maxLength={40} /></Form.Item>
      <Form.Item name="email" label="邮箱" rules={[{ required: true, type: 'email', message: '请输入有效邮箱' }]}><Input prefix={<MailOutlined />} autoComplete="email" /></Form.Item>
      <Form.Item name="password" label="密码" rules={[{ required: true, min: 8, message: '密码至少 8 位' }]}><Input.Password prefix={<LockOutlined />} autoComplete="new-password" /></Form.Item>
      <Button type="primary" htmlType="submit" loading={loading} block>注册</Button>
    </Form><Space style={{ marginTop: 20 }}><Link to={`/user/login?returnTo=${encodeURIComponent(returnTo)}`}>已有账户？登录</Link><Button type="link" onClick={() => navigate(returnTo)}>返回</Button></Space>
  </Card></div>;
}
