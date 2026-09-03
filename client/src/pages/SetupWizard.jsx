import { useState } from 'react';
import { Alert, Button, Card, Form, Input, Result, Steps, Typography, App } from 'antd';
import { ArrowLeftOutlined, ArrowRightOutlined, CheckCircleOutlined, LockOutlined, UserOutlined } from '@ant-design/icons';
import { api } from '../api';

const { Title, Paragraph } = Typography;

export default function SetupWizard({ onComplete }) {
  const [current, setCurrent] = useState(0);
  const [accountForm] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { message } = App.useApp();

  const submitAccount = async () => {
    try {
      await accountForm.validateFields();
      setCurrent(2);
      setError('');
    } catch (validationError) {
      const firstErrorField = validationError.errorFields?.[0]?.name;
      if (firstErrorField) accountForm.scrollToField(firstErrorField, { block: 'center' });
    }
  };
  const submitSetup = async () => {
    setLoading(true); setError('');
    try {
      const { nickname, username, password } = accountForm.getFieldsValue();
      await api.setup({ nickname, username, password, siteName: '', siteIcon: '' });
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
      {current === 0 && <div className="setup-welcome"><Title level={2}>欢迎使用 Questra</Title><Paragraph type="secondary">只需设置管理员账户即可完成站点初始化。</Paragraph><Paragraph type="secondary">你的管理员账户只有一组，密码会以哈希值安全保存。</Paragraph><div className="setup-actions"><Button type="primary" icon={<ArrowRightOutlined />} onClick={() => setCurrent(1)}>下一步</Button></div></div>}
      <div className="setup-step" hidden={current !== 1}><Title level={3}>创建管理员账户</Title><Paragraph type="secondary">该账户用于登录后台，初始化完成后不能再创建第二组管理员账户。</Paragraph><Form form={accountForm} layout="vertical" requiredMark={false}>
        <Form.Item name="nickname" label="管理员昵称" rules={[{ required: true, message: '请输入管理员昵称' }]}><Input prefix={<UserOutlined />} placeholder="例如：站点管理员" /></Form.Item>
        <Form.Item name="username" label="登录账号" rules={[{ required: true, message: '请输入登录账号' }, { pattern: /^[a-zA-Z0-9_.-]{3,32}$/, message: '使用 3-32 位字母、数字、下划线、点或短横线' }]}><Input prefix={<UserOutlined />} autoComplete="username" placeholder="admin" /></Form.Item>
        <Form.Item name="password" label="登录密码" rules={[{ required: true, message: '请输入密码' }, { min: 8, message: '密码至少 8 位' }]}><Input.Password prefix={<LockOutlined />} autoComplete="new-password" placeholder="至少 8 位" /></Form.Item>
        <Form.Item name="confirmPassword" label="确认密码" dependencies={['password']} rules={[{ required: true, message: '请再次输入密码' }, ({ getFieldValue }) => ({ validator(_, value) { return !value || getFieldValue('password') === value ? Promise.resolve() : Promise.reject(new Error('两次密码不一致')); } })]}><Input.Password prefix={<LockOutlined />} autoComplete="new-password" /></Form.Item>
        <div className="setup-actions"><Button icon={<ArrowLeftOutlined />} onClick={() => setCurrent(0)}>上一步</Button><Button type="primary" onClick={submitAccount} icon={<ArrowRightOutlined />}>下一步</Button></div>
      </Form></div>
      {current === 2 && <Result className="setup-step" icon={<CheckCircleOutlined />} title="大功告成" subTitle="管理员账户已设置完成，其他设置可以稍后在设置中修改。" extra={<div className="setup-actions"><Button icon={<ArrowLeftOutlined />} onClick={() => setCurrent(1)}>上一步</Button><Button type="primary" loading={loading} onClick={submitSetup} icon={<ArrowRightOutlined />}>进入控制台</Button></div>} />}
    </Card>
  </div>;
}
