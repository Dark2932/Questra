import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Alert, Avatar, Button, Card, Checkbox, ColorPicker, Divider, Empty, Form, Input, Popover, Space, Tabs, Typography, Upload, App } from 'antd';
import { AppstoreOutlined, BgColorsOutlined, CloudDownloadOutlined, DeleteOutlined, LockOutlined, PictureOutlined, ReloadOutlined, SafetyCertificateOutlined, SettingOutlined, UndoOutlined, UploadOutlined, UserOutlined } from '@ant-design/icons';
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
  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData] = useState(null);
  const [personalizationForm] = Form.useForm();
  const [accountForm] = Form.useForm();
  const [userSettings, setUserSettings] = useState(null);
  const [initialColorFormat, setInitialColorFormat] = useState('rgb');
  const [themeColorFormat, setThemeColorFormat] = useState('rgb');
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [emojiInput, setEmojiInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [updateChecking, setUpdateChecking] = useState(false);
  const [updateInstalling, setUpdateInstalling] = useState(false);
  const [updateInfo, setUpdateInfo] = useState(null);
  const [installResult, setInstallResult] = useState(null);
  const { message, modal } = App.useApp();
  const siteIcon = Form.useWatch('siteIcon', personalizationForm);
  const siteName = Form.useWatch('siteName', personalizationForm);
  const siteInitial = Form.useWatch('siteInitial', personalizationForm);
  const siteIconAsInitial = Form.useWatch('siteIconAsInitial', personalizationForm) || false;
  const siteInitialColor = Form.useWatch('siteInitialColor', personalizationForm) || '#0D9488';
  const themeColor = Form.useWatch('themeColor', personalizationForm) || '#0D9488';
  const characters = siteCharacters(siteName);
  const setColor = (form, field) => (color, css) => form.setFieldValue(field, css || color?.toCssString?.() || '#0D9488');

  useEffect(() => {
    Promise.all([api.getSettings(), api.getUpdateStatus(), api.getUserSettings()]).then(([settings, updateStatus, users]) => {
      setData(settings);
      personalizationForm.setFieldsValue(settings.site);
      accountForm.setFieldsValue(settings.account);
      setUpdateInfo(updateStatus);
      setUserSettings(users);
    }).catch((e) => message.error(e.message));
  }, [accountForm, message, personalizationForm]);

  const saveUserSettings = async () => {
    setSaving(true);
    try { const result = await api.updateUserSettings({ registrationEnabled: userSettings.registrationEnabled }); setUserSettings(result); message.success('普通用户相关设置已保存'); }
    catch (e) { message.error(e.message); } finally { setSaving(false); }
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
    reader.onload = () => personalizationForm.setFieldValue('siteIcon', reader.result);
    reader.readAsDataURL(file);
    return false;
  };

  const confirmRestorePersonalization = () => {
    modal.confirm({
      title: '确认恢复个性化默认设置？',
      content: '站点名称、图标、标识字符、标识背景色和主题色将恢复为默认值。此操作会立即保存。',
      okText: '确认恢复',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: async () => {
        setSaving(true);
        try {
          const result = await api.updateSiteSettings({ ...DEFAULT_SITE_SETTINGS, ...DEFAULT_PERSONALIZATION_SETTINGS });
          setData((prev) => ({ ...prev, site: result.site }));
          personalizationForm.setFieldsValue(result.site);
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
    personalizationForm.setFieldValue('siteIcon', emojiSiteIconUrl(emoji));
    setEmojiInput('');
    setEmojiOpen(false);
  };

  const checkForUpdate = async () => {
    setUpdateChecking(true);
    setInstallResult(null);
    try {
      const result = await api.checkForUpdate();
      setUpdateInfo(result);
      if (result.sourceBuild) message.info('当前为源码构建版，无法使用在线更新');
      else if (result.invalidVersion) message.warning('当前版本不属于已发布的正式版本');
      else if (result.updateAvailable) message.success(`发现新版本 ${result.latestVersion}`);
      else message.success('当前已经是最新版本');
    } catch (error) {
      message.error(error.message);
    } finally {
      setUpdateChecking(false);
    }
  };

  const confirmInstallUpdate = () => {
    if (!updateInfo?.updateAvailable) return;
    modal.confirm({
      title: `确认安装 Questra ${updateInfo.latestVersion}？`,
      content: '服务器会在当前请求完成后暂时关闭 Questra，使用 npm 全局安装该版本，再按原启动参数自动恢复服务。安装期间页面会短暂无法访问。',
      okText: '确认安装',
      cancelText: '取消',
      onOk: async () => {
        setUpdateInstalling(true);
        try {
          const result = await api.installUpdate();
          setUpdateInfo(result);
          setInstallResult(result);
          message.success(`Questra ${result.installedVersion} 更新任务已开始，服务将自动重启`);
        } catch (error) {
          message.error(error.message);
          throw error;
        } finally {
          setUpdateInstalling(false);
        }
      },
    });
  };

  if (!data) return <Card loading />;

  const updateBlocked = Boolean(updateInfo && !updateInfo.updateSupported);

  const items = [
    { key: 'site', label: <Space><SettingOutlined />站点设置</Space>, children: <div style={{ maxWidth: 720 }}>
      <Title level={4}>站点设置</Title><Paragraph type="secondary">此处可更改站点内部分系统性设置。</Paragraph>
    </div> },
    { key: 'personalization', label: <Space><BgColorsOutlined />个性化</Space>, children: <Form form={personalizationForm} layout="vertical" onFinish={savePersonalization} style={{ maxWidth: 720 }}>
      <Title level={4}>个性化</Title><Paragraph type="secondary">此处可调整站点外观、标识和界面主题。</Paragraph>
      <Form.Item name="siteName" label="站点名称"><Input maxLength={80} placeholder="Questra" /></Form.Item>
      <Form.Item name="siteIcon" label="站点图标"><Input prefix={<PictureOutlined />} placeholder="支持填入图片 URL、站内路径，也可上传图片或使用 Emoji" /></Form.Item>
      <div style={{ marginBottom: 24 }}><Space align="start"><Avatar shape="square" size={48} style={{ background: 'transparent', fontSize: 30 }} src={siteIcon || undefined}>{!siteIcon && DEFAULT_SITE_ICON}</Avatar><Upload accept="image/*" showUploadList={false} beforeUpload={readIcon}><Space direction="vertical" size={0}><Button icon={<UploadOutlined />}>上传图片</Button><Text type="secondary" className="upload-help">最大 1 MB</Text></Space></Upload><Popover open={emojiOpen} onOpenChange={setEmojiOpen} trigger="click" placement="bottomLeft" arrow={false} content={<div className="emoji-picker"><Space.Compact block><Input value={emojiInput} onChange={(event) => setEmojiInput(event.target.value)} onPressEnter={() => selectEmoji(emojiInput)} placeholder="输入或粘贴任意 Emoji" /><Button type="primary" disabled={!emojiInput.trim()} onClick={() => selectEmoji(emojiInput)}>使用</Button></Space.Compact><EmojiPicker width="100%" height={360} autoFocusSearch={false} lazyLoadEmojis searchPlaceHolder="搜索 Emoji" previewConfig={{ showPreview: false }} theme={resolvedTheme === 'dark' ? EmojiTheme.DARK : EmojiTheme.LIGHT} onEmojiClick={({ emoji }) => selectEmoji(emoji)} /></div>}><Button>使用 Emoji</Button></Popover><Button icon={<DeleteOutlined />} disabled={!siteIcon} onClick={() => personalizationForm.setFieldValue('siteIcon', '')}>清空图片</Button></Space></div>
      <div className="site-identity-row">
        <Form.Item name="siteInitial" label="标识字符" className={siteIconAsInitial ? 'site-identity-disabled' : ''} extra="只显示输入文本的第一个字符；留空时使用站点名称的第一个字符。">
          <Input disabled={siteIconAsInitial} placeholder={characters[0]} />
        </Form.Item>
        <Form.Item name="siteInitialColor" label="标识背景色" className={siteIconAsInitial ? 'site-identity-disabled' : ''} style={{ width: 190 }} extra="标识字符的背景底色">
          <ColorPicker disabled={siteIconAsInitial} format={initialColorFormat} onFormatChange={(format) => setInitialColorFormat(format || 'rgb')} showText value={siteInitialColor} onChange={setColor(personalizationForm, 'siteInitialColor')} />
        </Form.Item>
        <Form.Item name="siteIconAsInitial" valuePropName="checked" className="site-icon-as-initial">
          <Checkbox>使用站点图标</Checkbox>
        </Form.Item>
        <Space direction="vertical" align="center" size={4} className="site-identity-preview"><SiteMark size={40} siteName={siteName} siteInitial={siteInitial} siteInitialColor={siteInitialColor} siteIcon={siteIcon} siteIconAsInitial={siteIconAsInitial} /><Text type="secondary">预览</Text></Space>
      </div>
      <Divider />
      <Form.Item name="themeColor" label="主题色" extra="按钮等高亮元素的配色。">
        <ColorPicker format={themeColorFormat} onFormatChange={(format) => setThemeColorFormat(format || 'rgb')} showText value={themeColor} onChange={setColor(personalizationForm, 'themeColor')} />
      </Form.Item>
      <Space><Button type="primary" htmlType="submit" loading={saving}>保存个性化设置</Button><Button danger icon={<UndoOutlined />} disabled={saving} onClick={confirmRestorePersonalization}>恢复默认设置</Button></Space>
    </Form> },
    { key: 'plugins', label: <Space><AppstoreOutlined />插件</Space>, children: <div style={{ maxWidth: 680 }}>
      <Title level={4}>插件设置</Title><Paragraph type="secondary">已安装插件提供的配置项会集中显示在这里。</Paragraph>
      <Card size="small"><Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="当前没有可配置的插件"><Link to="/admin/plugins"><Button icon={<AppstoreOutlined />}>打开插件页面</Button></Link></Empty></Card>
    </div> },
    { key: 'accounts', label: <Space><SafetyCertificateOutlined />账户与验证</Space>, children: <div style={{ maxWidth: 680 }}>
      {/* <Title level={4}>账户与验证</Title><Paragraph type="secondary">普通用户和管理员使用彼此独立的账户与会话。</Paragraph> */}
      <Title level={4}>普通用户与邮箱验证</Title><Paragraph type="secondary">管理普通用户注册入口和邮件验证服务。</Paragraph>
      <Card size="small"><Checkbox checked={userSettings?.registrationEnabled !== false} disabled={!userSettings || saving} onChange={(event) => setUserSettings((current) => ({ ...current, registrationEnabled: event.target.checked }))}>允许新用户注册</Checkbox><Paragraph type="secondary" style={{ margin: '8px 0 0 24px' }}>关闭注册不会影响已有用户登录。启用注册前，请先在服务器配置 SMTP 邮件服务。</Paragraph></Card>
      <Alert style={{ marginTop: 16 }} type={userSettings?.emailConfigured ? 'success' : 'warning'} showIcon message={userSettings?.emailConfigured ? '邮件服务已配置' : '邮件服务未配置'} description={userSettings?.emailConfigured ? '可发送邮箱验证和密码重置邮件。' : '请在 survey.config.js 或环境变量中配置 SMTP，否则用户无法注册或重置密码。'} />
      <Space style={{ marginTop: 16 }} wrap>
        <Button type="primary" loading={saving} disabled={!userSettings} onClick={saveUserSettings}>保存普通用户相关设置</Button>
        <Link to="/admin/users"><Button icon={<UserOutlined />}>打开用户管理</Button></Link>
      </Space>
      <Divider />
      <Form form={accountForm} layout="vertical" onFinish={saveAccount} style={{ maxWidth: 620 }}>
      <Title level={4}>管理员账户</Title><Paragraph type="secondary">更改后台管理员昵称、登录账号和密码。</Paragraph>
      <Alert type="info" showIcon message="只修改昵称时无需填写当前密码。" style={{ marginBottom: 20 }} />
      <Form.Item name="nickname" label="管理员昵称" rules={[{ required: true, message: '请输入管理员昵称' }]}><Input prefix={<UserOutlined />} maxLength={40} /></Form.Item>
      <Form.Item name="username" label="登录账号" rules={[{ required: true, message: '请输入登录账号' }, { pattern: /^[a-zA-Z0-9_.-]{3,32}$/, message: '使用 3-32 位字母、数字、下划线、点或短横线' }]}><Input prefix={<UserOutlined />} autoComplete="username" /></Form.Item>
      <Form.Item name="currentPassword" label="当前密码"><Input.Password prefix={<LockOutlined />} autoComplete="current-password" /></Form.Item>
      <Form.Item name="newPassword" label="新密码" rules={[{ min: 8, message: '新密码至少 8 位' }]}><Input.Password prefix={<LockOutlined />} autoComplete="new-password" placeholder="不修改时留空" /></Form.Item>
      <Form.Item name="confirmPassword" label="确认新密码" dependencies={['newPassword']} rules={[({ getFieldValue }) => ({ validator(_, value) { return !getFieldValue('newPassword') || value === getFieldValue('newPassword') ? Promise.resolve() : Promise.reject(new Error('两次密码不一致')); } })]}><Input.Password prefix={<LockOutlined />} autoComplete="new-password" /></Form.Item>
      <Button type="primary" htmlType="submit" loading={saving}>保存管理员账户设置</Button>
      </Form>
    </div> },
    { key: 'update', label: <Space><CloudDownloadOutlined />更新</Space>, children: <div style={{ maxWidth: 680 }}>
      <Title level={4}>更新</Title><Paragraph type="secondary">从 GitHub Releases 检测正式版本，并使用 npm 安装更新。</Paragraph>
      <Space wrap style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<ReloadOutlined />} loading={updateChecking} disabled={updateInstalling || updateBlocked || !updateInfo} onClick={checkForUpdate}>检测更新</Button>
        <Button icon={<CloudDownloadOutlined />} loading={updateInstalling} disabled={!updateInfo?.updateAvailable || !updateInfo?.updateSupported || updateChecking} onClick={confirmInstallUpdate}>安装新版本</Button>
      </Space>
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        {updateInfo?.sourceBuild && <Alert type="info" showIcon message="当前版本为源码构建版" description={<Space direction="vertical" size={4}><Text>源码构建版无法使用检测更新和安装新版本功能。</Text><Typography.Link href={updateInfo.sourceRepositoryUrl} target="_blank" rel="noreferrer">前往 Questra 源码仓库查看变更</Typography.Link></Space>} />}
        {updateInfo && !updateInfo.sourceBuild && !updateInfo.checked && <Alert type="info" showIcon message="尚未检测更新" description="点击“检测更新”后，系统会对新旧版本分别进行检测于验证。" />}
        {updateInfo?.invalidVersion && <Alert type="warning" showIcon message={`当前版本 ${updateInfo.currentVersion} 不属于已发布的正式版本`} description={<Space direction="vertical" size={4}><Text>该版本号不存在于已发布的 GitHub Release 中，无法进行更新。</Text><Text>请重新安装最新正式版 {updateInfo.latestVersion}：</Text><Text code>npm i -g questra@{updateInfo.latestVersion}</Text><Typography.Link href={updateInfo.releaseUrl} target="_blank" rel="noreferrer">查看 GitHub Releases</Typography.Link></Space>} />}
        {updateInfo?.checked && updateInfo.compliantVersion && <Alert
          type={updateInfo.updateAvailable ? 'warning' : 'success'}
          showIcon
          message={updateInfo.updateAvailable ? `发现新版本 ${updateInfo.latestVersion}` : `当前已是最新正式版 ${updateInfo.currentVersion}`}
          description={<Space direction="vertical" size={4}>
            <Text>当前版本：{updateInfo.currentVersion}；最新正式版本：{updateInfo.latestVersion}</Text>
            <Text>您已落后 {updateInfo.versionsBehind} 个正式版本。</Text>
            <Typography.Link href={updateInfo.releaseUrl} target="_blank" rel="noreferrer">查看 GitHub Releases</Typography.Link>
            {updateInfo.publishedAt && <Text type="secondary">最新正式版发布时间：{new Date(updateInfo.publishedAt).toLocaleString('zh-CN', { hour12: false })}</Text>}
          </Space>}
        />}
        {updateInfo?.releaseNotes && <div><Text strong>最新正式版说明</Text><Paragraph className="update-release-notes">{updateInfo.releaseNotes}</Paragraph></div>}
        {installResult && <Alert type="info" showIcon message={`Questra ${installResult.installedVersion} 更新任务已排队`} description="服务将短暂关闭，并在 npm 安装结束后自动按原参数启动。稍后重新打开此页面即可确认版本。" />}
        {installResult?.output && <details className="update-install-output"><summary>查看任务信息</summary><pre>{installResult.output}</pre></details>}
        <Text type="secondary">此功能需要服务器能够访问 GitHub 和 npm，并拥有写入 npm 全局安装目录的权限。源码运行或权限不足时，可按安装文档手动升级。</Text>
      </Space>
    </div> }
  ];

  return <Space direction="vertical" size={24} style={{ width: '100%' }}>
    <div><Text type="secondary">SETTINGS</Text><Title level={3} style={{ marginTop: 4, marginBottom: 0 }}>设置</Title></div>
    <Card><Tabs tabPosition="left" activeKey={items.some((item) => item.key === searchParams.get('tab')) ? searchParams.get('tab') : 'site'} onChange={(key) => setSearchParams(key === 'site' ? {} : { tab: key })} items={items} /></Card>
  </Space>;
}
