import { useEffect, useState } from 'react';
import { Alert, Avatar, Button, Card, Form, Input, Space, Tabs, Typography, Upload, App } from 'antd';
import { LockOutlined, PictureOutlined, SafetyCertificateOutlined, SettingOutlined, UploadOutlined, UserOutlined } from '@ant-design/icons';
import { api } from '../../api';

const { Title, Text, Paragraph } = Typography;

export default function Settings({ onLogout, onRefresh }) {
  const [data, setData] = useState(null);
  const [siteForm] = Form.useForm();
  const [accountForm] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const { message } = App.useApp();
  const siteIcon = Form.useWatch('siteIcon', siteForm);

  useEffect(() => {
    api.getSettings().then((settings) => {
      setData(settings);
      siteForm.setFieldsValue(settings.site);
      accountForm.setFieldsValue(settings.account);
    }).catch((e) => message.error(e.message));
  }, [accountForm, message, siteForm]);

  const saveSite = async (values) => {
    setSaving(true);
    try {
      const result = await api.updateSiteSettings(values);
      setData((prev) => ({ ...prev, site: result.site }));
      await onRefresh();
      message.success('站点设置已保存');
    } catch (e) { message.error(e.message); } finally { setSaving(false); }
  };

  const saveAccount = async (values) => {
    setSaving(true);
    try {
      const result = await api.updateAccountSettings(values);
      setData((prev) => ({ ...prev, account: result.account }));
      accountForm.setFieldsValue({ ...result.account, currentPassword: '', newPassword: '', confirmPassword: '' });
      if (result.requiresLogin) {
        message.success('账号安全信息已更新，请重新登录');
        await onLogout();
        window.location.href = '/admin/login';
      } else {
        await onRefresh();
        message.success('管理员信息已保存');
      }
    } catch (e) { message.error(e.message); } finally { setSaving(false); }
  };

  const readIcon = (file) => {
    if (!file.type.startsWith('image/')) { message.error('请选择图片文件'); return Upload.LIST_IGNORE; }
    if (file.size > 128 * 1024) { message.error('站点图标不能超过 128 KB'); return Upload.LIST_IGNORE; }
    const reader = new window.FileReader();
    reader.onload = () => siteForm.setFieldValue('siteIcon', reader.result);
    reader.readAsDataURL(file);
    return false;
  };

  if (!data) return <Card loading />;

  const items = [
    { key: 'site', label: <Space><SettingOutlined />站点设置</Space>, children: <Form form={siteForm} layout="vertical" onFinish={saveSite} style={{ maxWidth: 620 }}>
      <Title level={4}>基础信息</Title><Paragraph type="secondary">用于管理后台和公开问卷页面，留空的站点名称会恢复为 Questra。</Paragraph>
      <Form.Item name="siteName" label="站点名称"><Input maxLength={80} placeholder="Questra" /></Form.Item>
      <Form.Item name="siteIcon" label="站点图标"><Input prefix={<PictureOutlined />} placeholder="图片 URL、站内路径或上传小图标" /></Form.Item>
      <Space align="center" style={{ marginBottom: 24 }}><Avatar shape="square" size={48} src={siteIcon || undefined}>Q</Avatar><Upload accept="image/*" showUploadList={false} beforeUpload={readIcon}><Button icon={<UploadOutlined />}>上传图片</Button></Upload><Text type="secondary">最大 128 KB</Text></Space>
      <div><Button type="primary" htmlType="submit" loading={saving}>保存站点设置</Button></div>
    </Form> },
    { key: 'account', label: <Space><SafetyCertificateOutlined />账号安全</Space>, children: <Form form={accountForm} layout="vertical" onFinish={saveAccount} style={{ maxWidth: 620 }}>
      <Title level={4}>管理员账户</Title><Paragraph type="secondary">系统有且只有这一组管理员账户。修改账号或密码后，所有设备需要重新登录。</Paragraph>
      <Alert type="info" showIcon message="只修改昵称时无需填写当前密码。" style={{ marginBottom: 20 }} />
      <Form.Item name="nickname" label="管理员昵称" rules={[{ required: true, message: '请输入管理员昵称' }]}><Input prefix={<UserOutlined />} maxLength={40} /></Form.Item>
      <Form.Item name="username" label="登录账号" rules={[{ required: true, message: '请输入登录账号' }, { pattern: /^[a-zA-Z0-9_.-]{3,32}$/, message: '使用 3-32 位字母、数字、下划线、点或短横线' }]}><Input prefix={<UserOutlined />} autoComplete="username" /></Form.Item>
      <Form.Item name="currentPassword" label="当前密码"><Input.Password prefix={<LockOutlined />} autoComplete="current-password" /></Form.Item>
      <Form.Item name="newPassword" label="新密码" rules={[{ min: 8, message: '新密码至少 8 位' }]}><Input.Password prefix={<LockOutlined />} autoComplete="new-password" placeholder="不修改时留空" /></Form.Item>
      <Form.Item name="confirmPassword" label="确认新密码" dependencies={['newPassword']} rules={[({ getFieldValue }) => ({ validator(_, value) { return !getFieldValue('newPassword') || value === getFieldValue('newPassword') ? Promise.resolve() : Promise.reject(new Error('两次密码不一致')); } })]}><Input.Password prefix={<LockOutlined />} autoComplete="new-password" /></Form.Item>
      <Button type="primary" htmlType="submit" loading={saving}>保存账户设置</Button>
    </Form> }
  ];

  return <Space direction="vertical" size={24} style={{ width: '100%' }}>
    <div><Text type="secondary">SETTINGS</Text><Title level={3} style={{ marginTop: 4, marginBottom: 0 }}>设置</Title></div>
    <Card><Tabs tabPosition="left" items={items} /></Card>
  </Space>;
}
