import { useState } from 'react';
import { Result, Button, Input, App } from 'antd';

export default function Unauthorized() {
  const [value, setValue] = useState('');
  const [verifying, setVerifying] = useState(false);
  const { message } = App.useApp();

  const handleSubmit = async () => {
    const token = value.trim();
    if (!token) {
      message.warning('请输入 Admin Token');
      return;
    }
    setVerifying(true);
    try {
      // 先向后端验证 Token，通过后才写入 sessionStorage。
      const ok = await fetch('/api/admin/dashboard', {
        headers: { authorization: `Bearer ${token}` },
      });
      if (ok.ok) {
        sessionStorage.setItem('questra_admin_token', token);
        message.success('Token 已验证');
        // App 的 token state 在挂载时读取一次，这里整页刷新让应用带着新 Token 重新挂载。
        window.location.href = '/admin';
      } else {
        message.error('Token 无效或已过期，请检查后重试');
      }
    } catch {
      message.error('无法连接服务器，请稍后重试');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24 }}>
      <Result
        status="403"
        title="需要管理授权"
        subTitle="服务器重启后 Admin Token 会保留在数据目录。请粘贴最新的 Admin Token，或使用带 ?token= 参数的管理链接。"
        extra={[
          <Input.Password
            key="token"
            placeholder="粘贴 Admin Token"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onPressEnter={handleSubmit}
            style={{ maxWidth: 320, margin: '0 auto' }}
            autoComplete="off"
          />,
          <Button key="submit" type="primary" disabled={verifying} onClick={handleSubmit} style={{ marginTop: 12 }}>
            验证并进入
          </Button>,
        ]}
      />
    </div>
  );
}