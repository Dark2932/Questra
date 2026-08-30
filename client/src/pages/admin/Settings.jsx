import { useEffect, useState } from 'react';
import { Alert, Avatar, Button, Card, Checkbox, ColorPicker, Form, Input, Popover, Space, Tabs, Typography, Upload, App } from 'antd';
import { BgColorsOutlined, DeleteOutlined, LockOutlined, PictureOutlined, SafetyCertificateOutlined, SettingOutlined, UndoOutlined, UploadOutlined, UserOutlined } from '@ant-design/icons';
import EmojiPicker, { Theme as EmojiTheme } from 'emoji-picker-react';
import { api } from '../../api';
import { DEFAULT_SITE_ICON, emojiSiteIconUrl } from '../../lib/siteIcon';
import SiteMark from '../../components/SiteMark';

const { Title, Text, Paragraph } = Typography;
const DEFAULT_SITE_SETTINGS = {
  siteName: 'Questra',
  siteIcon: '',
  siteIconAsInitial: false,
  siteInitial: 'Q',
  siteInitialColor: '#0D9488',
};
const DEFAULT_PERSONALIZATION_SETTINGS = { themeColor: '#0D9488' };

function siteCharacters(value) {
  return Array.from(String(value || '').trim() || 'Questra');
}

export default function Settings({ onLogout, onRefresh, resolvedTheme }) {
  const [data, setData] = useState(null);
  const [siteForm] = Form.useForm();
  const [personalizationForm] = Form.useForm();
  const [accountForm] = Form.useForm();
  const [initialColorFormat, setInitialColorFormat] = useState('rgb');
  const [themeColorFormat, setThemeColorFormat] = useState('rgb');
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [emojiInput, setEmojiInput] = useState('');
  const [saving, setSaving] = useState(false);
  const { message, modal } = App.useApp();
  const siteIcon = Form.useWatch('siteIcon', siteForm);
  const siteName = Form.useWatch('siteName', siteForm);
  const siteInitial = Form.useWatch('siteInitial', siteForm);
  const siteIconAsInitial = Form.useWatch('siteIconAsInitial', siteForm) || false;
  const siteInitialColor = Form.useWatch('siteInitialColor', siteForm) || '#0D9488';
  const themeColor = Form.useWatch('themeColor', personalizationForm) || '#0D9488';
  const characters = siteCharacters(siteName);
  const setColor = (form, field) => (color, css) => form.setFieldValue(field, css || color?.toCssString?.() || '#0D9488');

  useEffect(() => {
    api.getSettings().then((settings) => {
      setData(settings);
      siteForm.setFieldsValue(settings.site);
      personalizationForm.setFieldsValue({ themeColor: settings.site.themeColor });
      accountForm.setFieldsValue(settings.account);
    }).catch((e) => message.error(e.message));
  }, [accountForm, message, personalizationForm, siteForm]);

  const saveSite = async (values) => {
    setSaving(true);
    try {
      const result = await api.updateSiteSettings(values);
      setData((prev) => ({ ...prev, site: result.site }));
      await onRefresh();
      message.success('站点设置已保存');
    } catch (e) { message.error(e.message); } finally { setSaving(false); }
  };

  const savePersonalization = async (values) => {
    setSaving(true);
    try {
      const result = await api.updateSiteSettings({ ...data.site, ...values });
      setData((prev) => ({ ...prev, site: result.site }));
      await onRefresh();
      message.success('个性化设置已保存');
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
    if (file.size > 1024 * 1024) { message.error('站点图标不能超过 1 MB'); return Upload.LIST_IGNORE; }
    const reader = new window.FileReader();
    reader.onload = () => siteForm.setFieldValue('siteIcon', reader.result);
    reader.readAsDataURL(file);
    return false;
  };

  const confirmRestoreSite = () => {
    modal.confirm({
      title: '确认恢复站点默认设置？',
      content: '站点名称、图标、标识字符和标识背景色将恢复为默认值。此操作会立即保存。',
      okText: '确认恢复',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: async () => {
        setSaving(true);
        try {
          const result = await api.updateSiteSettings(DEFAULT_SITE_SETTINGS);
          setData((prev) => ({ ...prev, site: result.site }));
          siteForm.setFieldsValue(result.site);
          await onRefresh();
          message.success('站点设置已恢复为默认值');
        } catch (e) {
          message.error(e.message);
          throw e;
        } finally {
          setSaving(false);
        }
      },
    });
  };

  const confirmRestorePersonalization = () => {
    modal.confirm({
      title: '确认恢复个性化默认设置？',
      content: '主题色将恢复为默认值。此操作会立即保存。',
      okText: '确认恢复',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: async () => {
        setSaving(true);
        try {
          const result = await api.updateSiteSettings(DEFAULT_PERSONALIZATION_SETTINGS);
          setData((prev) => ({ ...prev, site: result.site }));
          personalizationForm.setFieldsValue(DEFAULT_PERSONALIZATION_SETTINGS);
          await onRefresh();
          message.success('个性化设置已恢复为默认值');
        } catch (e) {
          message.error(e.message);
          throw e;
        } finally {
          setSaving(false);
        }
      },
    });
  };

  const selectEmoji = (emoji) => {
    if (!String(emoji || '').trim()) return;
    siteForm.setFieldValue('siteIcon', emojiSiteIconUrl(emoji));
    setEmojiInput('');
    setEmojiOpen(false);
  };

  if (!data) return <Card loading />;

  const items = [
    { key: 'site', label: <Space><SettingOutlined />站点设置</Space>, children: <Form form={siteForm} layout="vertical" onFinish={saveSite} style={{ maxWidth: 720 }}>
      <Title level={4}>站点设置</Title><Paragraph type="secondary">站点信息相关设置</Paragraph>
      <Form.Item name="siteName" label="站点名称"><Input maxLength={80} placeholder="Questra" /></Form.Item>
      <div className="site-identity-row">
        <Form.Item name="siteInitial" label="标识字符" extra="可输入任意文本，页面显示其第一个字符；留空时使用站点名称的第一个字符。">
          <Input placeholder={characters[0]} />
        </Form.Item>
        <Form.Item name="siteIconAsInitial" valuePropName="checked" className="site-icon-as-initial">
          <Checkbox>使用站点图标</Checkbox>
        </Form.Item>
        <Form.Item name="siteInitialColor" label="标识背景色" style={{ width: 190 }}>
          <ColorPicker format={initialColorFormat} onFormatChange={(format) => setInitialColorFormat(format || 'rgb')} showText value={siteInitialColor} onChange={setColor(siteForm, 'siteInitialColor')} />
        </Form.Item>
        <Space direction="vertical" align="center" size={4} className="site-identity-preview"><SiteMark size={40} siteName={siteName} siteInitial={siteInitial} siteInitialColor={siteInitialColor} siteIcon={siteIcon} siteIconAsInitial={siteIconAsInitial} /><Text type="secondary">预览</Text></Space>
      </div>
      <Form.Item name="siteIcon" label="站点图标"><Input prefix={<PictureOutlined />} placeholder="图片 URL、站内路径或上传小图标" /></Form.Item>
      <div style={{ marginBottom: 24 }}><Space align="start"><Avatar shape="square" size={48} style={{ background: 'transparent', fontSize: 30 }} src={siteIcon || undefined}>{!siteIcon && DEFAULT_SITE_ICON}</Avatar><Upload accept="image/*" showUploadList={false} beforeUpload={readIcon}><Space direction="vertical" size={0}><Button icon={<UploadOutlined />}>上传图片</Button><Text type="secondary" className="upload-help">最大 1 MB</Text></Space></Upload><Popover open={emojiOpen} onOpenChange={setEmojiOpen} trigger="click" placement="bottomLeft" arrow={false} content={<div className="emoji-picker"><Space.Compact block><Input value={emojiInput} onChange={(event) => setEmojiInput(event.target.value)} onPressEnter={() => selectEmoji(emojiInput)} placeholder="输入或粘贴任意 Emoji" /><Button type="primary" disabled={!emojiInput.trim()} onClick={() => selectEmoji(emojiInput)}>使用</Button></Space.Compact><EmojiPicker width="100%" height={360} autoFocusSearch={false} lazyLoadEmojis searchPlaceHolder="搜索 Emoji" previewConfig={{ showPreview: false }} theme={resolvedTheme === 'dark' ? EmojiTheme.DARK : EmojiTheme.LIGHT} onEmojiClick={({ emoji }) => selectEmoji(emoji)} /></div>}><Button>使用 Emoji</Button></Popover><Button icon={<DeleteOutlined />} disabled={!siteIcon} onClick={() => siteForm.setFieldValue('siteIcon', '')}>清空图片</Button></Space></div>
      <Space><Button type="primary" htmlType="submit" loading={saving}>保存站点设置</Button><Button danger icon={<UndoOutlined />} disabled={saving} onClick={confirmRestoreSite}>恢复默认设置</Button></Space>
    </Form> },
    { key: 'personalization', label: <Space><BgColorsOutlined />个性化</Space>, children: <Form form={personalizationForm} layout="vertical" onFinish={savePersonalization} style={{ maxWidth: 620 }}>
      <Title level={4}>个性化</Title><Paragraph type="secondary">个性化相关设置</Paragraph>
      <Form.Item name="themeColor" label="主题色">
        <ColorPicker format={themeColorFormat} onFormatChange={(format) => setThemeColorFormat(format || 'rgb')} showText value={themeColor} onChange={setColor(personalizationForm, 'themeColor')} />
      </Form.Item>
      <Space><Button type="primary" htmlType="submit" loading={saving}>保存个性化设置</Button><Button danger icon={<UndoOutlined />} disabled={saving} onClick={confirmRestorePersonalization}>恢复默认设置</Button></Space>
    </Form> },
    { key: 'account', label: <Space><SafetyCertificateOutlined />账户安全</Space>, children: <Form form={accountForm} layout="vertical" onFinish={saveAccount} style={{ maxWidth: 620 }}>
      <Title level={4}>账户安全</Title><Paragraph type="secondary">账户安全相关设置</Paragraph>
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
