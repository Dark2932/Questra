import { useState, useEffect, useCallback } from 'react';
import { Card, Button, Table, Tag, Space, Typography, App, Popconfirm } from 'antd';
import { PlusOutlined, CopyOutlined, EyeOutlined, PauseCircleOutlined, PlayCircleOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { api } from '../../api';
import SurveyDialog from './SurveyDialog';

const { Title, Text } = Typography;

function isExpired(survey) {
  return Boolean(survey.expiresAt && new Date(survey.expiresAt).getTime() <= Date.now());
}

export default function Surveys() {
  const [surveys, setSurveys] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const { message } = App.useApp();

  const load = useCallback(async () => {
    try { const [s, q, g] = await Promise.all([api.getSurveys(), api.getQuestions(), api.getGroups()]); setSurveys(s); setQuestions(q); setGroups(g); }
    catch (e) { message.error(e.message); } finally { setLoading(false); }
  }, [message]);

  useEffect(() => { load(); }, [load]);

  const copyLink = async (id) => { await navigator.clipboard.writeText(`${window.location.origin}/s/${id}`); message.success('公开链接已复制'); };
  const toggleStatus = async (s) => { try { await api.updateSurvey(s.id, { status: s.status === 'active' ? 'closed' : 'active' }); message.success('问卷状态已更新'); load(); } catch (e) { message.error(e.message); } };
  const deleteSurvey = async (id) => { try { await api.deleteSurvey(id); message.success('问卷已删除'); load(); } catch (e) { message.error(e.message); } };
  const handleSave = async (payload) => { try { if (editing) await api.updateSurvey(editing.id, payload); else await api.createSurvey(payload); message.success(editing ? '实例已更新' : '问卷已生成'); setDialogOpen(false); setEditing(null); load(); } catch (e) { message.error(e.message); } };

  return (
    <Space direction="vertical" size={24} style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16 }}>
        <div>
          <Text type="secondary" style={{ letterSpacing: 1, textTransform: 'uppercase', fontSize: 12 }}>SURVEYS & EXAMS</Text>
          <Title level={3} style={{ marginTop: 4, marginBottom: 0 }}>问卷与考试</Title>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setDialogOpen(true)}>生成实例</Button>
      </div>
      <Card>
        <div style={{ marginBottom: 16 }}>
          <Title level={5} style={{ marginBottom: 4 }}>实例列表</Title>
          <Text type="secondary">分享公开链接，管理问卷或考试并查看提交数据。</Text>
        </div>
        <Table loading={loading} rowKey="id" pagination={false} dataSource={surveys}
          locale={{ emptyText: '还没有问卷实例，请先添加题目再生成。' }}
          columns={[
            { title: '实例', dataIndex: 'title', render: (t, r) => (
              <div>
                <Space size={4} style={{ marginBottom: 4 }}>
                  <Tag color={r.kind === 'exam' ? 'orange' : 'blue'}>{r.kind === 'exam' ? '考试' : '问卷'}</Tag>
                  <Tag color={r.status === 'active' ? 'green' : 'default'}>{r.status === 'active' ? '回收中' : '已关闭'}</Tag>
                </Space>
                <div style={{ fontWeight: 600 }}>{t}</div>
                {r.description && <Text type="secondary" style={{ fontSize: 12, whiteSpace: 'normal', overflowWrap: 'anywhere' }}>{r.description}</Text>}
              </div>
            )},
            { title: '信息', width: 200, render: (_, r) => (
              <Space size={4} direction="vertical" style={{ fontSize: 12 }}>
                <Text type="secondary">{r.question_count} 题 · {r.response_count} 份答卷</Text>
                {r.kind === 'exam' && <Text type="secondary">满分 {r.maxScore} 分</Text>}
                {r.expiresAt && <Text type="secondary">截止 {new Date(r.expiresAt).toLocaleString('zh-CN', { hour12: false })}</Text>}
              </Space>
            )},
            { title: '', width: 240, render: (_, r) => (
              <Space wrap size={8}>
                <Button size="small" icon={<CopyOutlined />} onClick={() => copyLink(r.id)}>链接</Button>
                <Button size="small" icon={<EditOutlined />} onClick={async () => { try { setEditing(await api.getSurvey(r.id)); setDialogOpen(true); } catch (e) { message.error(e.message); } }}>编辑</Button>
                <Link to={`/admin/surveys/${r.id}/responses`}><Button size="small" icon={<EyeOutlined />}>数据</Button></Link>
                <Button size="small" disabled={isExpired(r)} icon={r.status === 'active' ? <PauseCircleOutlined /> : <PlayCircleOutlined />} onClick={() => toggleStatus(r)}>
                  {r.status === 'active' ? '关闭' : '开启'}
                </Button>
                <Popconfirm title="删除问卷会同时删除所有答卷，且无法恢复。确定继续吗？" onConfirm={() => deleteSurvey(r.id)} okText="确定" cancelText="取消">
                  <Button size="small" danger icon={<DeleteOutlined />} />
                </Popconfirm>
              </Space>
            )},
          ]}
        />
      </Card>
      <SurveyDialog open={dialogOpen} onClose={() => { setDialogOpen(false); setEditing(null); }} questions={questions} groups={groups} editing={editing} onSubmit={handleSave} />
    </Space>
  );
}
