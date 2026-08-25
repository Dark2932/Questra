import { useEffect, useMemo, useState } from 'react';
import { Modal, Form, Input, Select, DatePicker, Checkbox, Typography, Radio, InputNumber, Row, Col, App } from 'antd';
import ExamSettings from './ExamSettings';
const { TextArea } = Input;
const labels = { single: '单选', multiple: '多选', text: '填空 / 文本', judgment: '判断' };

export default function SurveyDialog({ open, onClose, questions, groups = [], editing, onSubmit }) {
  const [form] = Form.useForm();
  const [kind, setKind] = useState('survey');
  const [mode, setMode] = useState('manual');
  const [selected, setSelected] = useState([]);
  const [sourceGroup, setSourceGroup] = useState('all');
  const [scoringMode, setScoringMode] = useState('weighted');
  const { message } = App.useApp();
  useEffect(() => { if (!open) return; form.resetFields(); setKind(editing?.kind || 'survey'); setMode(editing?.selectionMode || 'manual'); setSelected(editing?.questions?.map((q) => q.poolQuestionId).filter(Boolean) || []); setSourceGroup(editing?.sourceGroupId ?? 'all'); setScoringMode(editing?.scoringMode || 'weighted'); form.setFieldsValue({ title: editing?.title || '', description: editing?.description || '', kind: editing?.kind || 'survey', selectionMode: editing?.selectionMode || 'manual', sourceGroupId: editing?.sourceGroupId ?? 'all', randomCounts: editing?.selectionConfig?.randomCounts || {}, totalScore: editing?.maxScore || 100, typeWeights: editing?.scoringConfig?.typeWeights || {} }); }, [open, editing, form]);
  const available = useMemo(() => sourceGroup === 'all' ? questions : questions.filter((q) => q.groupIds?.map(String).includes(String(sourceGroup))), [questions, sourceGroup]);
  const selectedQuestions = useMemo(() => mode === 'manual' ? questions.filter((q) => selected.includes(q.id)) : available, [mode, questions, selected, available]);
  const typeCounts = useMemo(() => selectedQuestions.reduce((out, q) => ({ ...out, [q.type]: (out[q.type] || 0) + 1 }), {}), [selectedQuestions]);
  const capacities = useMemo(() => available.reduce((out, q) => ({ ...out, [q.type]: (out[q.type] || 0) + 1 }), {}), [available]);
  const submit = async () => {
    try {
      const values = await form.validateFields();
      if (mode === 'manual' && !selected.length) return message.warning('请至少选择一道题目');
      const payload = { kind, title: values.title.trim(), description: (values.description || '').trim(), expiresAt: values.expiresAt ? values.expiresAt.toISOString() : null, selectionMode: mode };
      if (mode === 'manual') payload.questionIds = selected; else { payload.sourceGroupId = sourceGroup; payload.randomCounts = values.randomCounts || {}; }
      if (kind === 'exam') {
        payload.scoringMode = scoringMode;
        if (scoringMode === 'weighted') { payload.totalScore = values.totalScore || 100; payload.typeWeights = values.typeWeights || {}; }
        else { payload.questionScores = {}; selectedQuestions.forEach((question) => { payload.questionScores[question.id] = values.questionScores?.[question.id] || 1; }); }
      }
      await onSubmit(payload);
    } catch (error) {
      // Ant Design rejects validation failures so the dialog remains open.
      if (!error?.errorFields) throw error;
    }
  };
  return <Modal open={open} title={editing ? '编辑实例' : '生成问卷或考试'} onCancel={onClose} onOk={submit} okText="保存" cancelText="取消" destroyOnHidden width={680}>
    <Form form={form} layout="vertical"><Form.Item name="kind" label="实例类型"><Select onChange={setKind} options={[{ value: 'survey', label: '普通问卷' }, { value: 'exam', label: '考试 / 答题' }]} /></Form.Item><Form.Item name="title" label="标题" rules={[{ required: true, message: '请输入标题' }]}><Input /></Form.Item><Form.Item name="description" label="说明"><TextArea rows={2} /></Form.Item><Form.Item name="expiresAt" label="截止时间"><DatePicker showTime style={{ width: '100%' }} /></Form.Item><Form.Item name="selectionMode" label="选题方式"><Radio.Group onChange={(e) => setMode(e.target.value)} options={[{ value: 'manual', label: '手动选择' }, { value: 'random', label: '随机抽取' }]} /></Form.Item>
    {mode === 'manual' ? <Form.Item label="选择题目"><div style={{ maxHeight: 220, overflow: 'auto' }}>{questions.map((q) => <label key={q.id} style={{ display: 'block', padding: 8 }}><Checkbox checked={selected.includes(q.id)} onChange={(e) => setSelected((prev) => e.target.checked ? [...prev, q.id] : prev.filter((id) => id !== q.id))} /> {q.title} <Typography.Text type="secondary">({labels[q.type]})</Typography.Text></label>)}</div></Form.Item> : <><Form.Item name="sourceGroupId" label="抽题分组"><Select onChange={setSourceGroup} options={groups.map((g) => ({ value: g.id, label: g.name + ' (' + g.questionCount + ')' }))} /></Form.Item><Row gutter={12}>{Object.keys(labels).map((type) => <Col span={12} key={type}><Form.Item name={['randomCounts', type]} label={labels[type] + '（最多 ' + (capacities[type] || 0) + '）'} initialValue={0}><InputNumber min={0} max={capacities[type] || 0} controls style={{ width: '100%' }} /></Form.Item></Col>)}</Row></>}
    {kind === 'exam' && (mode === 'manual' ? selectedQuestions.length > 0 : Object.keys(typeCounts).length > 0) && <ExamSettings scoringMode={scoringMode} setScoringMode={setScoringMode} typeCounts={typeCounts} questions={selectedQuestions} />}</Form>
  </Modal>;
}
