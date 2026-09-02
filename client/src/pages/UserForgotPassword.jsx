import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Alert, Button, Card, Form, Input, Typography } from 'antd';
import { MailOutlined } from '@ant-design/icons';
import { api } from '../api';

export default function UserForgotPassword() {
  const [message, setMessage] = useState(''); const [error, setError] = useState('');
  const submit = async ({ email }) => { setError(''); try { const result = await api.userForgotPassword(email); setMessage(result.message); } catch (e) { setError(e.message); } };
  return <div className="auth-shell"><Card className="auth-card"><Typography.Title level={2}>重置密码</Typography.Title>{error && <Alert type="error" message={error} />}{message && <Alert type="success" message={message} />}
    <Form layout="vertical" onFinish={submit} style={{ marginTop: 24 }}><Form.Item name="email" label="邮箱" rules={[{ required: true, type: 'email', message: '请输入有效邮箱' }]}><Input prefix={<MailOutlined />} /></Form.Item><Button type="primary" htmlType="submit" block>发送重置邮件</Button></Form><Link to="/user/login">返回登录</Link>
  </Card></div>;
}
