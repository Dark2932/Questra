import { useState, useEffect, useCallback } from 'react';
import { Badge, Button, Card, Empty, Pagination, Space, Tag, Typography, App, Popconfirm } from 'antd';
import { PlusOutlined, CopyOutlined, EyeOutlined, PauseCircleOutlined, PlayCircleOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { api } from '../../api';
import SurveyDialog from './SurveyDialog';

const { Title, Text } = Typography;
const PAGE_SIZE = 10;
function isExpired(survey) { return Boolean(survey.expiresAt && new Date(survey.expiresAt).getTime() <= Date.now()); }

export default function Surveys() {
  const [surveys, setSurveys] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [page, setPage] = useState(1);
  const { message } = App.useApp();
  const load = useCallback(async () => { try { const [s, q, g] = await Promise.all([api.getSurveys(), api.getQuestions(), api.getGroups()]); setSurveys(s); setQuestions(q); setGroups(g); } catch (e) { message.error(e.message); } finally { setLoading(false); } }, [message]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage((current) => Math.min(current, Math.max(1, Math.ceil(surveys.length / PAGE_SIZE)))); }, [surveys.length]);
  const copyLink = async (id) => { await navigator.clipboard.writeText(`${window.location.origin}/s/${id}`); message.success('公开链接已复制'); };
  const toggleStatus = async (survey) => { try { await api.updateSurvey(survey.id, { status: survey.status === 'active' ? 'closed' : 'active' }); message.success('问卷状态已更新'); load(); } catch (e) { message.error(e.message); } };
  const deleteSurvey = async (id) => { try { await api.deleteSurvey(id); message.success('问卷已删除'); load(); } catch (e) { message.error(e.message); } };
  const pageItems = surveys.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  return <Space direction="vertical" size={24} style={{ width: '100%' }}>
    <div className="admin-page-header"><div><Text className="page-eyebrow" type="secondary">SURVEYS & EXAMS</Text><Title level={3}>问卷与考试</Title></div><Button type="primary" icon={<PlusOutlined />} onClick={() => setDialogOpen(true)}>生成实例</Button></div>
    <Card><div className="section-heading"><div><Title level={5}>实例列表</Title><Text type="secondary">分享公开链接，管理问卷或考试并查看提交数据。</Text></div><Pagination size="small" current={page} pageSize={PAGE_SIZE} total={surveys.length} hideOnSinglePage onChange={setPage} showSizeChanger={false} /></div>
      {loading ? <Card loading size="small" /> : <div className="survey-card-list">{!surveys.length && <Empty description="还没有问卷实例，请先添加题目再生成。" />}{pageItems.map((survey) => <Card size="small" className="survey-instance-card" key={survey.id}>
        <div className="survey-instance-main"><div className="survey-instance-identity"><Title level={5} ellipsis={{ tooltip: survey.title }}>{survey.title}</Title><Space size={6}><Tag color={survey.kind === 'exam' ? 'orange' : 'blue'}>{survey.kind === 'exam' ? '考试' : '问卷'}</Tag><Tag>{survey.questionCount} 题</Tag></Space></div>
          <div className="survey-instance-meta"><span><Badge status={survey.status === 'active' ? 'success' : 'default'} text={survey.status === 'active' ? '回收中' : '已关闭'} /></span><Text type="secondary">{survey.expiresAt ? `截止 ${new Date(survey.expiresAt).toLocaleString('zh-CN', { hour12: false })}` : '长期有效'}</Text><Text type="secondary">回收 {survey.responseCount || 0} 份</Text></div>
          <Space className="survey-instance-actions" wrap><Button size="small" icon={<CopyOutlined />} onClick={() => copyLink(survey.id)}>复制链接</Button><Button size="small" icon={<EditOutlined />} onClick={async () => { try { setEditing(await api.getSurvey(survey.id)); setDialogOpen(true); } catch (e) { message.error(e.message); } }}>编辑</Button><Link to={`/admin/surveys/${survey.id}/responses`}><Button size="small" icon={<EyeOutlined />}>数据</Button></Link><Button size="small" disabled={isExpired(survey)} icon={survey.status === 'active' ? <PauseCircleOutlined /> : <PlayCircleOutlined />} onClick={() => toggleStatus(survey)}>{survey.status === 'active' ? '关闭' : '开启'}</Button><Popconfirm title="删除问卷会同时删除所有答卷，且无法恢复。确定继续吗？" onConfirm={() => deleteSurvey(survey.id)} okText="确定" cancelText="取消"><Button size="small" danger icon={<DeleteOutlined />} /></Popconfirm></Space>
        </div>
      </Card>)}</div>}
    </Card>
    <SurveyDialog open={dialogOpen} onClose={() => { setDialogOpen(false); setEditing(null); }} questions={questions} groups={groups} editing={editing} onSubmit={async (payload) => { try { if (editing) await api.updateSurvey(editing.id, payload); else await api.createSurvey(payload); message.success(editing ? '实例已更新' : '问卷已生成'); setDialogOpen(false); setEditing(null); load(); } catch (e) { message.error(e.message); } }} />
  </Space>;
}
