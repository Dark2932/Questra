import { useState, useEffect, useCallback, useMemo } from 'react';
import { Button, Card, Empty, Input, Modal, Pagination, Popconfirm, Select, Space, Tabs, Tag, Typography, App } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, FolderAddOutlined, SearchOutlined, FilterOutlined } from '@ant-design/icons';
import { api } from '../../api';
import QuestionDialog from './QuestionDialog';
import { QUESTION_TYPES, questionsInGroup, typeFilterOptions } from '../../lib/questionTypes';

const { Title, Text } = Typography;
const PAGE_SIZE = 12;

export default function Questions() {
  const [questions, setQuestions] = useState([]); const [groups, setGroups] = useState([]); const [activeGroup, setActiveGroup] = useState('all'); const [typeFilter, setTypeFilter] = useState('all'); const [loading, setLoading] = useState(true); const [dialogOpen, setDialogOpen] = useState(false); const [editing, setEditing] = useState(null); const [groupModal, setGroupModal] = useState(null); const [search, setSearch] = useState(''); const [page, setPage] = useState(1); const { message } = App.useApp();
  const load = useCallback(async () => { try { const [q, g] = await Promise.all([api.getQuestions(), api.getGroups()]); setQuestions(q); setGroups(g); } catch (e) { message.error(e.message); } finally { setLoading(false); } }, [message]);
  useEffect(() => { load(); }, [load]);
  const filtered = useMemo(() => { const term = search.trim().toLocaleLowerCase(); return questionsInGroup(questions, activeGroup).filter((q) => (typeFilter === 'all' || q.type === typeFilter) && (!term || q.title.toLocaleLowerCase().includes(term) || q.options?.some((option) => option.toLocaleLowerCase().includes(term)))); }, [questions, activeGroup, typeFilter, search]);
  useEffect(() => { setPage((current) => Math.min(current, Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)))); }, [filtered.length]);
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const saveQuestion = async (payload) => { try { if (editing) await api.updateQuestion(editing.id, payload); else await api.createQuestion(payload); setDialogOpen(false); setEditing(null); load(); message.success('题目已保存'); } catch (e) { message.error(e.message); } };
  const deleteQuestion = async (id) => { try { await api.deleteQuestion(id); load(); message.success('题目已删除'); } catch (e) { message.error(e.message); } };
  const saveGroup = async () => { const name = groupModal?.name?.trim(); if (!name) return; try { if (groupModal.id) await api.updateGroup(groupModal.id, { name }); else await api.createGroup({ name }); setGroupModal(null); load(); } catch (e) { message.error(e.message); } };
  const visibleGroups = groups.filter((group) => !String(group.id).startsWith('type:'));
  const groupTabs = visibleGroups.map((group) => ({ key: String(group.id), label: <span>{group.name} ({group.questionCount})</span> }));
  const activeGroupRecord = visibleGroups.find((group) => String(group.id) === String(activeGroup));
  return <Space direction="vertical" size={24} style={{ width: '100%' }}>
    <div className="admin-page-header"><div><Text className="page-eyebrow" type="secondary">QUESTION BANK</Text><Title level={3}>题库</Title></div><Space><Button icon={<FolderAddOutlined />} onClick={() => setGroupModal({ name: '' })}>新建分组</Button><Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditing(null); setDialogOpen(true); }}>添加题目</Button></Space></div>
    <Card><div className="question-toolbar"><Input allowClear prefix={<SearchOutlined />} placeholder="搜索题目或选项" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} /><Pagination size="small" current={page} pageSize={PAGE_SIZE} total={filtered.length} hideOnSinglePage onChange={setPage} showSizeChanger={false} /></div>
      <Tabs activeKey={String(activeGroup)} onChange={(key) => { setActiveGroup(key); setTypeFilter('all'); setPage(1); }} items={groupTabs} />
      <div className="question-group-actions"><Select aria-label="按题型显示" suffixIcon={<FilterOutlined />} value={typeFilter} onChange={(value) => { setTypeFilter(value); setPage(1); }} options={typeFilterOptions()} />{activeGroupRecord && !activeGroupRecord.virtual && <><Button size="small" onClick={() => setGroupModal({ id: activeGroupRecord.id, name: activeGroupRecord.name })}>重命名分组</Button><Popconfirm title="删除分组不会删除题目，继续吗？" onConfirm={async () => { await api.deleteGroup(activeGroup); setActiveGroup('all'); load(); }}><Button size="small" danger>删除分组</Button></Popconfirm></>}</div>
      {loading ? <div className="question-card-list"><Card loading size="small" /></div> : pageItems.length ? <div className="question-card-list">{pageItems.map((question) => { const type = QUESTION_TYPES[question.type] || QUESTION_TYPES.text; const customGroups = visibleGroups.filter((group) => !group.virtual && question.groupIds?.map(String).includes(String(group.id))); return <Card size="small" className="question-item-card" key={question.id}><div className="question-item-main"><div className="question-item-copy"><Title level={5} ellipsis={{ tooltip: question.title }}>{question.title}</Title><Tag color={type.color}>{type.label}</Tag></div><div className="question-item-meta"><Text type="secondary">{question.options?.length ? `${question.options.length} 个选项 · ${question.options.join(' / ')}` : question.type === 'open_text' ? '开放作答，不设标准答案' : '文本作答'}</Text><Space size={4} wrap>{customGroups.length ? customGroups.map((group) => <Tag key={group.id}>{group.name}</Tag>) : <Text type="secondary">未分组</Text>}</Space></div><Space className="question-item-actions"><Button size="small" icon={<EditOutlined />} onClick={() => { setEditing(question); setDialogOpen(true); }}>编辑</Button><Popconfirm title="确定删除这道题目吗？" onConfirm={() => deleteQuestion(question.id)} okText="确定" cancelText="取消"><Button size="small" danger icon={<DeleteOutlined />} /></Popconfirm></Space></div></Card>; })}</div> : <Empty description={search ? '没有匹配的题目' : '当前分组暂无此类题目'} />}
    </Card>
    <QuestionDialog open={dialogOpen} onClose={() => setDialogOpen(false)} editing={editing} groups={groups.filter((group) => !group.virtual)} onSuccess={saveQuestion} />
    <Modal open={!!groupModal} title={groupModal?.id ? '重命名分组' : '新建分组'} onCancel={() => setGroupModal(null)} onOk={saveGroup} okText="保存" cancelText="取消"><Input value={groupModal?.name || ''} onChange={(event) => setGroupModal((value) => ({ ...value, name: event.target.value }))} /></Modal>
  </Space>;
}
