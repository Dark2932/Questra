import { useState } from 'react';
import { Alert, Button, Card, Form, Input, Result, Steps, Typography, App } from 'antd';
import { ArrowRightOutlined, CheckCircleOutlined, LockOutlined, SettingOutlined, UserOutlined } from '@ant-design/icons';
import { api } from '../api';

const { Title, Paragraph } = Typography;

export default function SetupWizard({ onComplete }) {
  const [current, setCurrent] = useState(0);
  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { message } = App.useApp();

  const submitAccount = (values) => { setAccount(values); setCurrent(2); setError(''); };
  const submitSetup = async (values) => {
    setLoading(true); setError('');
    try {
      await api.setup({ ...account, siteName: values.siteName, siteIcon: values.siteIcon || '' });
      await onComplete();
      message.success('初始化完成');
      window.location.href = '/admin';
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  };

  return <div className="setup-shell">
    <Card className="setup-card" bordered={false}>
      <div className="auth-brand"><span className="brand-mark">Q</span><span>Questra</span></div>
      <Steps current={current} items={[{ title: '欢迎' }, { title: '设置账户' }, { title: '完成初始化' }]} />
      {error && <Alert type="error" showIcon message={error} style={{ marginTop: 24 }} />}
      {current === 0 && <Result icon={<CheckCircleOutlined />} title="欢迎使用 Questra" subTitle="只需设置管理员账户即可完成站点初始化。你的管理员账户只有一组，密码会以哈希值安全保存。" extra={<Button type="primary" icon={<ArrowRightOutlined />} onClick={() => setCurrent(1)}>开始设置</Button>} />}
      {current === 1 && <div className="setup-step"><Title level={3}>创建管理员账户</Title><Paragraph type="secondary">该账户用于登录后台，初始化完成后不能再创建第二组管理员账户。</Paragraph><Form layout="vertical" onFinish={submitAccount} requiredMark={false}>
        <Form.Item name="nickname" label="管理员昵称" rules={[{ required: true, message: '请输入管理员昵称' }]}><Input prefix={<UserOutlined />} placeholder="例如：站点管理员" /></Form.Item>
        <Form.Item name="username" label="登录账号" rules={[{ required: true, message: '请输入登录账号' }, { pattern: /^[a-zA-Z0-9_.-]{3,32}$/, message: '使用 3-32 位字母、数字、下划线、点或短横线' }]}><Input prefix={<UserOutlined />} autoComplete="username" placeholder="admin" /></Form.Item>
        <Form.Item name="password" label="登录密码" rules={[{ required: true, message: '请输入密码' }, { min: 8, message: '密码至少 8 位' }]}><Input.Password prefix={<LockOutlined />} autoComplete="new-password" placeholder="至少 8 位" /></Form.Item>
        <Form.Item name="confirmPassword" label="确认密码" dependencies={['password']} rules={[{ required: true, message: '请再次输入密码' }, ({ getFieldValue }) => ({ validator(_, value) { return !value || getFieldValue('password') === value ? Promise.resolve() : Promise.reject(new Error('两次密码不一致')); } })]}><Input.Password prefix={<LockOutlined />} autoComplete="new-password" /></Form.Item>
        <Button type="primary" htmlType="submit" icon={<ArrowRightOutlined />}>下一步</Button>
      </Form></div>}
      {current === 2 && <div className="setup-step"><Title level={3}>设置站点信息</Title><Paragraph type="secondary">站点名称和图标之后都可以在“设置”中修改。名称留空时显示 Questra。</Paragraph><Form layout="vertical" onFinish={submitSetup} requiredMark={false}>
        <Form.Item name="siteName" label="站点名称"><Input prefix={<SettingOutlined />} placeholder="Questra" /></Form.Item>
        <Form.Item name="siteIcon" label="站点图标地址"><Input placeholder="可选，例如 https://example.com/icon.png" /></Form.Item>
        <Button type="primary" htmlType="submit" loading={loading} icon={<CheckCircleOutlined />}>完成初始化</Button>
      </Form></div>}
    </Card>
  </div>;
}
