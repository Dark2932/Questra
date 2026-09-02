import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Alert, Button, Card, Form, Input, Typography } from 'antd';
import { LockOutlined } from '@ant-design/icons';
import { api } from '../api';

export default function UserResetPassword() {
  const token = new URLSearchParams(useLocation().search).get('token') || ''; const navigate = useNavigate(); const [error, setError] = useState('');
  const submit = async ({ password }) => { try { await api.userResetPassword({ token, password }); navigate('/'); } catch (e) { setError(e.message); } };
  return <div className="auth-shell"><Card className="auth-card"><Typography.Title level={2}>设置新密码</Typography.Title>{error && <Alert type="error" message={error} style={{ marginBottom: 16 }} />}
    <Form layout="vertical" onFinish={submit}><Form.Item name="password" label="新密码" rules={[{ required: true, min: 8, message: '密码至少 8 位' }]}><Input.Password prefix={<LockOutlined />} /></Form.Item><Button type="primary" htmlType="submit" block>保存密码</Button></Form><Link to="/user/login">返回登录</Link>
  </Card></div>;
}
