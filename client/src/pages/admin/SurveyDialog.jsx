import { useState, useEffect, useMemo } from 'react';
import { Modal, Form, Input, Select, DatePicker, Checkbox, Typography, Space, App } from 'antd';
import ExamSettings from './ExamSettings';

const { TextArea } = Input;
const { Text } = Typography;
const typeLabels = { single: '单选', multiple: '多选', text: '文本' };

export default function SurveyDialog({ open, onClose, questions, onSubmit }) {
  const [form] = Form.useForm();
  const [kind, setKind] = useState('survey');
  const [selected, setSelected] = useState([]);
  const [scoringMode, setScoringMode] = useState('weighted');
  const { message } = App.useApp();

  useEffect(() => {
    if (open) { form.resetFields(); setSelected([]); setKind('survey'); setScoringMode('weighted'); }
  }, [open, form]);

  const selQs = useMemo(() => questions.filter((q) => selected.includes(q.id)), [questions, selected]);
  const typeCounts = useMemo(() => { const c = {}; selQs.forEach((q) => { c[q.type] = (c[q.type] || 0) + 1; }); return c; }, [selQs]);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      if (!selected.length) { message.warning('请至少选择一道题目'); return; }
      const payload = {
        kind,
        title: values.title.trim(),
        description: (values.description || '').trim(),
        expiresAt: values.expiresAt ? values.expiresAt.toISOString() : null,
        questionIds: selected,
      };
      if (kind === 'exam') {
        payload.scoringMode = scoringMode;
        if (scoringMode === 'weighted') {
          payload.totalScore = values.totalScore || 100;
          payload.typeWeights = values.typeWeights || {};
        } else {
          const qs = {}; selQs.forEach((q) => { qs[q.id] = values.questionScores?.[q.id] || 1; }); payload.questionScores = qs;
        }
      }
      onSubmit(payload);
    } catch (e) { /* validation error */ }
  };

  return (
    <Modal open={open} title="生成问卷或考试" onCancel={onClose} onOk={handleOk}
      okText="生成问卷" cancelText="取消" destroyOnHidden width={600}>
      <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
        <Form.Item name="kind" label="实例类型" initialValue="survey">
          <Select onChange={setKind} options={[{ value: 'survey', label: '普通问卷' }, { value: 'exam', label: '考试 / 答题' }]} />
        </Form.Item>
        <Form.Item name="title" label="问卷标题" rules={[{ required: true, message: '请输入问卷标题' }]}>
          <Input maxLength={200} placeholder="例如：活动反馈问卷" />
        </Form.Item>
        <Form.Item name="description" label="说明">
          <TextArea rows={2} placeholder="选填，向填写者说明问卷用途" />
        </Form.Item>
        <Form.Item name="expiresAt" label="截止时间"><DatePicker showTime style={{ width: '100%' }} /></Form.Item>
        <Form.Item label="从问题池选择题目">
          {questions.length === 0 ? <Text type="secondary">问题池为空。</Text> : (
            <div style={{ maxHeight: 192, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {questions.map((q) => (
                <label key={q.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '8px 12px', borderRadius: 8,
                  border: selected.includes(q.id) ? '1px solid var(--ant-color-primary)' : '1px solid var(--ant-color-border-secondary)',
                  background: selected.includes(q.id) ? 'var(--ant-color-primary-bg)' : undefined, cursor: 'pointer' }}>
                  <Checkbox checked={selected.includes(q.id)}
                    onChange={(e) => setSelected((prev) => e.target.checked ? [...prev, q.id] : prev.filter((id) => id !== q.id))} />
                  <div><div style={{ fontWeight: 600, fontSize: 13 }}>{q.title}</div><Text type="secondary" style={{ fontSize: 12 }}>{typeLabels[q.type]} · {q.required ? '必填' : '选填'}</Text></div>
                </label>
              ))}
            </div>
          )}
        </Form.Item>
        {kind === 'exam' && selQs.length > 0 && (
          <ExamSettings scoringMode={scoringMode} setScoringMode={setScoringMode} typeCounts={typeCounts} />
        )}
      </Form>
    </Modal>
  );
}