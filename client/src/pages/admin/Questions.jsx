import { useState, useEffect, useCallback } from 'react';
import { Card, Button, Table, Tag, Space, Typography, App, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { api } from '../../api';
import QuestionDialog from './QuestionDialog';

const { Title, Text } = Typography;
const typeMap = { single: { text: '单选', color: 'blue' }, multiple: { text: '多选', color: 'purple' }, text: { text: '文本', color: 'gold' } };

export default function Questions() {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const { message } = App.useApp();

  const load = useCallback(async () => {
    try { setQuestions(await api.getQuestions()); } catch (e) { message.error(e.message); } finally { setLoading(false); }
  }, [message]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id) => {
    try { await api.deleteQuestion(id); message.success('题目已删除'); load(); } catch (e) { message.error(e.message); }
  };

  const handleSubmit = async (payload) => {
    try {
      if (editing) { await api.updateQuestion(editing.id, payload); message.success('题目已更新'); }
      else { await api.createQuestion(payload); message.success('题目已添加'); }
      setDialogOpen(false); load();
    } catch (e) { message.error(e.message); }
  };

  return (
    <Space direction="vertical" size={24} style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16 }}>
        <div>
          <Text type="secondary" style={{ letterSpacing: 1, textTransform: 'uppercase', fontSize: 12 }}>QUESTION POOL</Text>
          <Title level={3} style={{ marginTop: 4, marginBottom: 0 }}>问题池</Title>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditing(null); setDialogOpen(true); }}>添加题目</Button>
      </div>
      <Card>
        <div style={{ marginBottom: 16 }}>
          <Title level={5} style={{ marginBottom: 4 }}>公共题目模板</Title>
          <Text type="secondary">问卷生成时会复制题目，之后修改不会影响已有问卷。</Text>
        </div>
        <Table loading={loading} rowKey="id" pagination={false} dataSource={questions}
          locale={{ emptyText: '问题池还是空的，添加第一道题目后即可生成问卷。' }}
          columns={[
            { title: '题目', dataIndex: 'title', render: (t, r) => (
              <div>
                <Space size={4} style={{ marginBottom: 4 }}>
                  <Tag color={typeMap[r.type]?.color}>{typeMap[r.type]?.text}</Tag>
                  <Tag color={r.required ? 'red' : 'default'}>{r.required ? '必填' : '选填'}</Tag>
                </Space>
                <div style={{ fontWeight: 600 }}>{t}</div>
                {r.options?.length > 0 && <Text type="secondary" style={{ fontSize: 12 }}>{r.options.join(' / ')}</Text>}
              </div>
            )},
            { title: '', width: 120, render: (_, r) => (
              <Space>
                <Button size="small" icon={<EditOutlined />} onClick={() => { setEditing(r); setDialogOpen(true); }}>编辑</Button>
                <Popconfirm title="确定要删除这道题目吗？" onConfirm={() => handleDelete(r.id)} okText="确定" cancelText="取消">
                  <Button size="small" danger icon={<DeleteOutlined />} />
                </Popconfirm>
              </Space>
            )},
          ]}
        />
      </Card>
      <QuestionDialog open={dialogOpen} onClose={() => setDialogOpen(false)} editing={editing} onSuccess={handleSubmit} />
    </Space>
  );
}