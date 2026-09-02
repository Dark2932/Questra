import { useCallback, useEffect, useState } from 'react';
import { Alert, App, Button, Card, Empty, Popconfirm, Space, Table, Tag, Typography } from 'antd';
import { LockOutlined, ReloadOutlined, UnlockOutlined, StopOutlined } from '@ant-design/icons';
import { api } from '../../api';

export default function Users() {
  const [users, setUsers] = useState(null);
  const [error, setError] = useState('');
  const { message } = App.useApp();
  const load = useCallback(() => {
    setError('');
    return api.getUsers().then(setUsers).catch((e) => setError(e.message));
  }, []);
  useEffect(() => { load(); }, [load]);
  const changeStatus = async (user, status) => {
    try { await api.updateUserStatus(user.id, status); await load(); message.success(status === 'disabled' ? '用户已禁用' : '用户已启用'); }
    catch (e) { message.error(e.message); }
  };
  const revoke = async (user) => {
    try { const result = await api.revokeUserSessions(user.id); await load(); message.success(`已撤销 ${result.revoked} 个会话`); }
    catch (e) { message.error(e.message); }
  };
  const remove = async (user) => {
    try { await api.deleteUser(user.id); await load(); message.success('用户已删除，历史答卷已匿名化'); }
    catch (e) { message.error(e.message); }
  };
  return <Space direction="vertical" size={20} style={{ width: '100%' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><div><Typography.Title level={3} style={{ margin: 0 }}>用户管理</Typography.Title><Typography.Text type="secondary">查看普通用户状态、参与记录并管理会话。</Typography.Text></div><Button icon={<ReloadOutlined />} onClick={load}>刷新</Button></div>
    {error && <Alert type="error" showIcon message={error} />}
    <Card>{users?.length ? <Table rowKey="id" dataSource={users} scroll={{ x: 900 }} pagination={{ pageSize: 20 }} columns={[
      { title: '用户', render: (_, user) => <Space direction="vertical" size={0}><Typography.Text strong>{user.displayName}</Typography.Text><Typography.Text type="secondary">{user.email}</Typography.Text></Space>, fixed: 'left', width: 220 },
      { title: '状态', width: 110, render: (_, user) => user.status === 'disabled' ? <Tag color="error">已禁用</Tag> : user.emailVerified ? <Tag color="success">已验证</Tag> : <Tag color="warning">待验证</Tag> },
      { title: '答卷', dataIndex: 'responseCount', width: 80 },
      { title: '活跃会话', dataIndex: 'activeSessionCount', width: 100 },
      { title: '注册时间', dataIndex: 'createdAt', width: 180 },
      { title: '操作', width: 260, render: (_, user) => <Space wrap><Button size="small" icon={user.status === 'disabled' ? <UnlockOutlined /> : <StopOutlined />} onClick={() => changeStatus(user, user.status === 'disabled' ? 'active' : 'disabled')}>{user.status === 'disabled' ? '启用' : '禁用'}</Button><Button size="small" icon={<LockOutlined />} onClick={() => revoke(user)}>撤销会话</Button><Popconfirm title="删除用户并匿名化历史答卷？" description="此操作不可恢复。" okText="删除" cancelText="取消" okButtonProps={{ danger: true }} onConfirm={() => remove(user)}><Button danger size="small">删除</Button></Popconfirm></Space> }
    ]} /> : <Empty description={users ? '暂无普通用户' : '加载中'} />}</Card>
  </Space>;
}
