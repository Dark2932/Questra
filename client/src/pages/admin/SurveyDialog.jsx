import { useEffect, useMemo, useState } from 'react';
import { Modal, Form, Input, Select, DatePicker, Checkbox, Typography, Radio, InputNumber, Row, Col, App, Card, Empty } from 'antd';
import dayjs from 'dayjs';
import ExamSettings from './ExamSettings';
const { TextArea } = Input;
const labels = { single: '单选', multiple: '多选', text: '填空 / 文本', judgment: '判断' };

export default function SurveyDialog({ open, onClose, questions, groups = [], editing, onSubmit }) {
  const [form] = Form.useForm();
  const [kind, setKind] = useState('survey');
  const [mode, setMode] = useState('manual');
  const [selected, setSelected] = useState([]);
  const [sourceGroup, setSourceGroup] = useState('all');
  const [manualGroup, setManualGroup] = useState('all');
  const [scoringMode, setScoringMode] = useState('weighted');
  const { message } = App.useApp();
  const expiresAt = Form.useWatch('expiresAt', form);
  const expired = Boolean(expiresAt && expiresAt.valueOf() <= Date.now());
  useEffect(() => { if (!open) return; form.resetFields(); setKind(editing?.kind || 'survey'); setMode(editing?.selectionMode || 'manual'); setSelected(editing?.questions?.map((q) => q.poolQuestionId).filter(Boolean) || []); setSourceGroup(editing?.sourceGroupId ?? 'all'); setManualGroup('all'); setScoringMode(editing?.scoringMode || 'weighted'); const initialExpiresAt = editing?.expiresAt ? dayjs(editing.expiresAt) : null; form.setFieldsValue({ title: editing?.title || '', description: editing?.description || '', status: initialExpiresAt && initialExpiresAt.valueOf() <= Date.now() ? 'closed' : (editing?.status || 'active'), expiresAt: initialExpiresAt, kind: editing?.kind || 'survey', selectionMode: editing?.selectionMode || 'manual', sourceGroupId: editing?.sourceGroupId ?? 'all', randomCounts: editing?.selectionConfig?.randomCounts || {}, scoringMode: editing?.scoringMode || 'weighted', totalScore: editing?.maxScore || 100, typeWeights: editing?.scoringConfig?.typeWeights || {}, questionScores: editing?.scoringConfig?.questionScores || {}, accessPolicy: { accessMode: 'anonymous', requireLoginToView: false, maxSubmissionsPerUser: null, maxSubmissionsTotal: null, cooldownSeconds: null, ...(editing?.accessPolicy || {}) } }); }, [open, editing, form]);
  useEffect(() => { if (editing && expired && form.getFieldValue('status') !== 'closed') form.setFieldValue('status', 'closed'); }, [editing, expired, expiresAt, form]);
  const available = useMemo(() => sourceGroup === 'all' ? questions : questions.filter((q) => q.groupIds?.map(String).includes(String(sourceGroup))), [questions, sourceGroup]);
  const manualAvailable = useMemo(() => manualGroup === 'all' ? questions : questions.filter((q) => q.groupIds?.map(String).includes(String(manualGroup))), [questions, manualGroup]);
  const selectedQuestions = useMemo(() => mode === 'manual' ? questions.filter((q) => selected.includes(q.id)) : available, [mode, questions, selected, available]);
  const typeCounts = useMemo(() => selectedQuestions.reduce((out, q) => ({ ...out, [q.type]: (out[q.type] || 0) + 1 }), {}), [selectedQuestions]);
  const capacities = useMemo(() => available.reduce((out, q) => ({ ...out, [q.type]: (out[q.type] || 0) + 1 }), {}), [available]);
  const submit = async () => {
    try {
      const values = await form.validateFields();
      if (mode === 'manual' && !selected.length) return message.warning('请至少选择一道题目');
      const payload = { kind, title: values.title.trim(), description: (values.description || '').trim(), status: expired ? 'closed' : (values.status || 'active'), expiresAt: values.expiresAt ? values.expiresAt.toISOString() : null, selectionMode: mode, accessPolicy: values.accessPolicy || {} };
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
    <Form form={form} layout="vertical"><Form.Item name="kind" label="实例类型"><Select onChange={setKind} options={[{ value: 'survey', label: '普通问卷' }, { value: 'exam', label: '考试 / 答题' }]} /></Form.Item><Form.Item name="title" label="标题" rules={[{ required: true, message: '请输入标题' }]}><Input /></Form.Item><Form.Item name="description" label="说明"><TextArea rows={2} /></Form.Item>{editing && <Form.Item name="status" label="回收状态" extra={expired ? '截止时间已过，实例已强制关闭；请先将截止时间改为未来时间。' : undefined}><Select disabled={expired} options={[{ value: 'active', label: '回收中' }, { value: 'closed', label: '已关闭' }]} /></Form.Item>}<Form.Item name="expiresAt" label="截止时间"><DatePicker showTime style={{ width: '100%' }} /></Form.Item>
    <Card size="small" title="访问与限制" style={{ marginBottom: 16 }}><Form.Item name={['accessPolicy', 'accessMode']} label="填写身份" extra="匿名问卷不支持按用户限制次数"><Select options={[{ value: 'anonymous', label: '公开匿名' }, { value: 'account', label: '登录后填写' }, { value: 'verified_email', label: '验证邮箱后填写' }]} /></Form.Item><Row gutter={12}><Col span={8}><Form.Item name={['accessPolicy', 'maxSubmissionsPerUser']} label="每用户最多次数"><InputNumber min={1} style={{ width: '100%' }} placeholder="不限" /></Form.Item></Col><Col span={8}><Form.Item name={['accessPolicy', 'maxSubmissionsTotal']} label="总回收上限"><InputNumber min={1} style={{ width: '100%' }} placeholder="不限" /></Form.Item></Col><Col span={8}><Form.Item name={['accessPolicy', 'cooldownSeconds']} label="提交间隔(秒)"><InputNumber min={0} style={{ width: '100%' }} placeholder="不限" /></Form.Item></Col></Row></Card><Form.Item name="selectionMode" label="选题方式"><Radio.Group onChange={(e) => setMode(e.target.value)} options={[{ value: 'manual', label: '手动选择' }, { value: 'random', label: '随机抽取' }]} /></Form.Item>
    {mode === 'manual' ? <Form.Item label="选择题目分组" required><Select placeholder="选择题目分组" value={manualGroup} onChange={setManualGroup} options={groups.map((g) => ({ value: g.id, label: `${g.name} (${g.questionCount})` }))} />{<Card size="small" title="分组内题目" className="survey-question-picker" style={{ marginTop: 12, maxHeight: 260, overflowY: 'auto' }}>{manualAvailable.length ? manualAvailable.map((q) => <label key={q.id} style={{ display: 'block', padding: '7px 4px', cursor: 'pointer' }}><Checkbox checked={selected.includes(q.id)} onChange={(e) => setSelected((prev) => e.target.checked ? [...prev, q.id] : prev.filter((id) => id !== q.id))} /> {q.title} <Typography.Text type="secondary">({labels[q.type]})</Typography.Text></label>) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="当前分组暂无题目" />} </Card>}</Form.Item> : <><Form.Item name="sourceGroupId" label="抽题分组"><Select onChange={setSourceGroup} options={groups.map((g) => ({ value: g.id, label: g.name + ' (' + g.questionCount + ')' }))} /></Form.Item><Row gutter={12}>{Object.keys(labels).map((type) => <Col span={12} key={type}><Form.Item name={['randomCounts', type]} label={labels[type] + '（最多 ' + (capacities[type] || 0) + '）'} initialValue={0}><InputNumber min={0} max={capacities[type] || 0} controls style={{ width: '100%' }} /></Form.Item></Col>)}</Row></>}
    {kind === 'exam' && <ExamSettings scoringMode={scoringMode} setScoringMode={setScoringMode} typeCounts={typeCounts} questions={selectedQuestions} />}</Form>
  </Modal>;
}
