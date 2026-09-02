import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Alert, Button, Card, Form, Input, Space, Spin, Typography, App } from 'antd';
import { LockOutlined, SaveOutlined, UserOutlined } from '@ant-design/icons';
import { api } from '../api';
import { useUserAuth } from '../hooks/useUserAuth';

export default function UserProfile() {
  const { loading, user, refresh, logout } = useUserAuth();
  const [profileForm] = Form.useForm();
  const [passwordForm] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const { message } = App.useApp();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) profileForm.setFieldsValue({ displayName: user.displayName });
  }, [profileForm, user]);

  if (loading) return <div className="auth-shell"><Spin size="large" /></div>;
  if (!user) return <Navigate to="/user/login?returnTo=%2Fuser%2Fprofile" replace />;

  const saveProfile = async ({ displayName }) => {
    setSaving(true);
    try { await api.updateUserProfile(displayName); await refresh(); message.success('资料已保存'); }
    catch (error) { message.error(error.message); } finally { setSaving(false); }
  };
  const savePassword = async (values) => {
    setSaving(true);
    try { await api.updateUserPassword(values); passwordForm.resetFields(); await refresh(); message.success('密码已更新，其他设备已退出登录'); }
    catch (error) { message.error(error.message); } finally { setSaving(false); }
  };
  const handleLogout = async () => { await logout(); navigate('/user/login'); };

  return <div className="auth-shell"><Card className="auth-card" bordered={false}>
    <Typography.Title level={2}>账户资料</Typography.Title>
    <Typography.Paragraph type="secondary">管理你的显示名称、邮箱验证状态和登录密码。</Typography.Paragraph>
    {!user.emailVerified && <Alert type="warning" showIcon message="邮箱尚未验证" description="请从验证邮件完成验证后再填写要求已验证邮箱的问卷。" style={{ marginBottom: 20 }} />}
    <Typography.Title level={4}>基本资料</Typography.Title>
    <Form form={profileForm} layout="vertical" onFinish={saveProfile} requiredMark={false}>
      <Form.Item label="邮箱"><Input value={user.email} disabled prefix={<UserOutlined />} /></Form.Item>
      <Form.Item name="displayName" label="显示名称" rules={[{ required: true, message: '请输入显示名称' }]}><Input prefix={<UserOutlined />} maxLength={40} /></Form.Item>
      <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={saving}>保存资料</Button>
    </Form>
    <Typography.Title level={4} style={{ marginTop: 28 }}>修改密码</Typography.Title>
    <Form form={passwordForm} layout="vertical" onFinish={savePassword} requiredMark={false}>
      <Form.Item name="currentPassword" label="当前密码" rules={[{ required: true, message: '请输入当前密码' }]}><Input.Password prefix={<LockOutlined />} /></Form.Item>
      <Form.Item name="newPassword" label="新密码" rules={[{ required: true, min: 8, message: '新密码至少 8 位' }]}><Input.Password prefix={<LockOutlined />} /></Form.Item>
      <Form.Item name="confirmPassword" label="确认新密码" dependencies={['newPassword']} rules={[{ required: true, message: '请再次输入新密码' }, ({ getFieldValue }) => ({ validator(_, value) { return value === getFieldValue('newPassword') ? Promise.resolve() : Promise.reject(new Error('两次密码不一致')); } })]}><Input.Password prefix={<LockOutlined />} /></Form.Item>
      <Button htmlType="submit" loading={saving}>更新密码</Button>
    </Form>
    <Space style={{ marginTop: 24 }}><Link to="/">返回首页</Link><Button type="link" danger onClick={handleLogout}>退出登录</Button></Space>
  </Card></div>;
}
