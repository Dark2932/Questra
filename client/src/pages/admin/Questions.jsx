import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, Button, Table, Tag, Space, Typography, App, Popconfirm, Tabs, Modal, Input, Empty } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, FolderAddOutlined } from '@ant-design/icons';
import { api } from '../../api';
import QuestionDialog from './QuestionDialog';

const { Title, Text } = Typography;
const typeMap = { single: { text: '单选', color: 'blue' }, multiple: { text: '多选', color: 'purple' }, text: { text: '填空 / 文本', color: 'gold' }, judgment: { text: '判断', color: 'cyan' } };

export default function Questions() {
  const [questions, setQuestions] = useState([]);
  const [groups, setGroups] = useState([]);
  const [activeGroup, setActiveGroup] = useState('all');
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [groupModal, setGroupModal] = useState(null);
  const { message } = App.useApp();
  const load = useCallback(async () => {
    try { const [q, g] = await Promise.all([api.getQuestions(), api.getGroups()]); setQuestions(q); setGroups(g); } catch (e) { message.error(e.message); } finally { setLoading(false); }
  }, [message]);
  useEffect(() => { load(); }, [load]);
  const filtered = useMemo(() => activeGroup === 'all' ? questions : questions.filter((q) => q.groupIds?.map(String).includes(String(activeGroup))), [questions, activeGroup]);
  const rows = useMemo(() => Object.keys(typeMap).flatMap((type) => filtered.filter((q) => q.type === type)), [filtered]);
  const saveQuestion = async (payload) => { try { if (editing) await api.updateQuestion(editing.id, payload); else await api.createQuestion(payload); setDialogOpen(false); setEditing(null); load(); message.success('题目已保存'); } catch (e) { message.error(e.message); } };
  const deleteQuestion = async (id) => { try { await api.deleteQuestion(id); load(); message.success('题目已删除'); } catch (e) { message.error(e.message); } };
  const saveGroup = async () => { const name = groupModal?.name?.trim(); if (!name) return; try { if (groupModal.id) await api.updateGroup(groupModal.id, { name }); else await api.createGroup({ name }); setGroupModal(null); load(); } catch (e) { message.error(e.message); } };
  const columns = [
    { title: '题目', dataIndex: 'title', render: (title, row) => <div><Space size={4}><Tag color={typeMap[row.type]?.color}>{typeMap[row.type]?.text}</Tag><Tag color={row.required ? 'red' : 'default'}>{row.required ? '必填' : '选填'}</Tag></Space><div style={{ fontWeight: 600 }}>{title}</div>{row.options?.length > 0 && <Text type="secondary" style={{ fontSize: 12 }}>{row.options.join(' / ')}</Text>}</div> },
    { title: '所属分组', width: 220, render: (_, row) => <Space wrap>{groups.filter((g) => g.id !== 'all' && row.groupIds?.includes(g.id)).map((g) => <Tag key={g.id}>{g.name}</Tag>)}</Space> },
    { title: '', width: 120, render: (_, row) => <Space><Button size="small" icon={<EditOutlined />} onClick={() => { setEditing(row); setDialogOpen(true); }}>编辑</Button><Popconfirm title="确定删除这道题目吗？" onConfirm={() => deleteQuestion(row.id)} okText="确定" cancelText="取消"><Button size="small" danger icon={<DeleteOutlined />} /></Popconfirm></Space> }
  ];
  return <Space direction="vertical" size={24} style={{ width: '100%' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}><div><Text type="secondary">QUESTION POOL</Text><Title level={3} style={{ marginTop: 4 }}>问题池</Title></div><Space><Button icon={<FolderAddOutlined />} onClick={() => setGroupModal({ name: '' })}>新建分组</Button><Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditing(null); setDialogOpen(true); }}>添加题目</Button></Space></div>
    <Card><Text type="secondary">默认显示全部问题，也可以切换自定义分组；题目按题型归类。</Text><Tabs activeKey={String(activeGroup)} onChange={setActiveGroup} items={groups.map((g) => ({ key: String(g.id), label: <span>{g.name} ({g.questionCount})</span>, children: g.id === 'all' ? null : <Space style={{ marginTop: 8 }}><Button size="small" onClick={() => setGroupModal({ id: g.id, name: g.name })}>重命名</Button><Popconfirm title="删除分组不会删除题目，继续吗？" onConfirm={async () => { await api.deleteGroup(g.id); load(); }}><Button size="small" danger>删除分组</Button></Popconfirm></Space> }))} />{rows.length ? <Table loading={loading} rowKey="id" pagination={false} dataSource={rows} columns={columns} /> : <Empty description="当前分组暂无题目" />}</Card>
    <QuestionDialog open={dialogOpen} onClose={() => setDialogOpen(false)} editing={editing} groups={groups.filter((g) => g.id !== 'all')} onSuccess={saveQuestion} />
    <Modal open={!!groupModal} title={groupModal?.id ? '重命名分组' : '新建分组'} onCancel={() => setGroupModal(null)} onOk={saveGroup} okText="保存" cancelText="取消"><Input value={groupModal?.name || ''} onChange={(e) => setGroupModal((v) => ({ ...v, name: e.target.value }))} /></Modal>
  </Space>;
}
