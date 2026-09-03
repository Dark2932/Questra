import { useEffect, useMemo, useState } from 'react';
import { App, Card, Checkbox, Col, DatePicker, Empty, Form, Input, InputNumber, Modal, Pagination, Radio, Row, Select, Space, Tabs, Tag, Typography } from 'antd';
import dayjs from 'dayjs';
import ExamSettings from './ExamSettings';
import { QUESTION_TYPE_ORDER, QUESTION_TYPES, questionsInGroup, typeFilterOptions } from '../../lib/questionTypes';

const { TextArea } = Input;
const { Text } = Typography;
const PAGE_SIZE = 5;

export default function SurveyDialog({ open, onClose, questions, groups = [], editing, onSubmit }) {
  const [form] = Form.useForm();
  const [activeTab, setActiveTab] = useState('basic');
  const [kind, setKind] = useState('survey');
  const [mode, setMode] = useState('manual');
  const [selected, setSelected] = useState([]);
  const [requiredByQuestion, setRequiredByQuestion] = useState({});
  const [sourceGroup, setSourceGroup] = useState('all');
  const [manualGroup, setManualGroup] = useState('all');
  const [manualType, setManualType] = useState('all');
  const [questionPage, setQuestionPage] = useState(1);
  const [scoringMode, setScoringMode] = useState('weighted');
  const { message } = App.useApp();
  const watchedRandomCounts = Form.useWatch('randomCounts', form);
  const randomCounts = useMemo(() => watchedRandomCounts || {}, [watchedRandomCounts]);

  useEffect(() => {
    if (!open) return;
    const editingQuestions = editing?.questions || [];
    form.resetFields();
    setActiveTab('basic');
    setKind(editing?.kind || 'survey');
    setMode(editing?.selectionMode || 'manual');
    setSelected(editingQuestions.map((question) => question.poolQuestionId).filter(Boolean));
    setRequiredByQuestion(Object.fromEntries(editingQuestions.filter((question) => question.poolQuestionId).map((question) => [question.poolQuestionId, question.required])));
    setSourceGroup(editing?.sourceGroupId ?? 'all');
    setManualGroup('all');
    setManualType('all');
    setQuestionPage(1);
    setScoringMode(editing?.scoringMode || 'weighted');
    form.setFieldsValue({
      title: editing?.title || '', description: editing?.description || '', expiresAt: editing?.expiresAt ? dayjs(editing.expiresAt) : null,
      kind: editing?.kind || 'survey', selectionMode: editing?.selectionMode || 'manual', sourceGroupId: editing?.sourceGroupId ?? 'all',
      randomCounts: editing?.selectionConfig?.randomCounts || {}, scoringMode: editing?.scoringMode || 'weighted', totalScore: editing?.maxScore || 100,
      typeWeights: editing?.scoringConfig?.typeWeights || {}, questionScores: editing?.scoringConfig?.questionScores || {},
      accessPolicy: { accessMode: 'anonymous', requireLoginToView: false, maxSubmissionsPerUser: null, maxSubmissionsTotal: null, cooldownSeconds: null, ...(editing?.accessPolicy || {}) }
    });
  }, [open, editing, form]);

  const manualGroupQuestions = useMemo(() => questionsInGroup(questions, manualGroup), [questions, manualGroup]);
  const sourceQuestions = useMemo(() => questionsInGroup(questions, sourceGroup), [questions, sourceGroup]);
  const pickerQuestions = mode === 'manual' ? manualGroupQuestions : sourceQuestions;
  const pickerAvailable = useMemo(() => pickerQuestions.filter((question) => manualType === 'all' || question.type === manualType), [pickerQuestions, manualType]);
  const pageItems = pickerAvailable.slice((questionPage - 1) * PAGE_SIZE, questionPage * PAGE_SIZE);
  const selectedQuestions = useMemo(() => mode === 'manual' ? questions.filter((question) => selected.includes(question.id)) : sourceQuestions.filter((question) => Number(randomCounts[question.type] || 0) > 0), [mode, questions, selected, sourceQuestions, randomCounts]);
  const scoreQuestions = useMemo(() => selectedQuestions.filter((question) => question.type !== 'open_text'), [selectedQuestions]);
  const typeCounts = useMemo(() => mode === 'manual' ? selectedQuestions.reduce((result, question) => ({ ...result, [question.type]: (result[question.type] || 0) + 1 }), {}) : Object.fromEntries(QUESTION_TYPE_ORDER.map((type) => [type, Number(randomCounts[type] || 0)])), [mode, selectedQuestions, randomCounts]);
  const capacities = useMemo(() => sourceQuestions.reduce((result, question) => ({ ...result, [question.type]: (result[question.type] || 0) + 1 }), {}), [sourceQuestions]);
  const requiredValue = (question) => Object.prototype.hasOwnProperty.call(requiredByQuestion, question.id) ? requiredByQuestion[question.id] : true;

  useEffect(() => { setQuestionPage((current) => Math.min(current, Math.max(1, Math.ceil(pickerAvailable.length / PAGE_SIZE)))); }, [pickerAvailable.length]);

  const toggleQuestion = (question, checked) => {
    setSelected((current) => checked ? [...new Set([...current, question.id])] : current.filter((id) => id !== question.id));
    if (checked && !Object.prototype.hasOwnProperty.call(requiredByQuestion, question.id)) setRequiredByQuestion((current) => ({ ...current, [question.id]: true }));
  };

  const submit = async () => {
    try {
      const values = await form.validateFields();
      if (mode === 'manual' && !selected.length) { setActiveTab('questions'); return message.warning('请至少选择一道题目'); }
      if (mode === 'random' && !QUESTION_TYPE_ORDER.some((type) => Number(values.randomCounts?.[type] || 0) > 0)) { setActiveTab('questions'); return message.warning('请至少设置一种抽题数量'); }
      const candidateQuestions = mode === 'manual' ? selectedQuestions : sourceQuestions;
      const payload = {
        kind, title: values.title.trim(), description: (values.description || '').trim(), expiresAt: values.expiresAt ? values.expiresAt.toISOString() : null,
        selectionMode: mode, accessPolicy: values.accessPolicy || {}, questionRequired: Object.fromEntries(candidateQuestions.map((question) => [question.id, requiredValue(question)]))
      };
      if (mode === 'manual') payload.questionIds = selected;
      else { payload.sourceGroupId = sourceGroup; payload.randomCounts = values.randomCounts || {}; }
      if (kind === 'exam') {
        payload.scoringMode = scoringMode;
        if (scoringMode === 'weighted') { payload.totalScore = values.totalScore || 100; payload.typeWeights = values.typeWeights || {}; }
        else { payload.questionScores = {}; scoreQuestions.forEach((question) => { payload.questionScores[question.id] = values.questionScores?.[question.id] || 1; }); }
      }
      await onSubmit(payload);
    } catch (error) {
      if (error?.errorFields) {
        const firstName = error.errorFields[0]?.name?.[0];
        setActiveTab(['title', 'description', 'expiresAt', 'kind', 'accessPolicy'].includes(firstName) ? 'basic' : (['scoringMode', 'totalScore', 'typeWeights', 'questionScores'].includes(firstName) ? 'scoring' : 'questions'));
        return;
      }
      throw error;
    }
  };

  const basicTab = <div className="survey-dialog-section"><Form.Item name="kind" label="实例类型"><Select onChange={setKind} options={[{ value: 'survey', label: '普通问卷' }, { value: 'exam', label: '考试 / 答题' }]} /></Form.Item><Form.Item name="title" label="标题" rules={[{ required: true, message: '请输入标题' }]}><Input /></Form.Item><Form.Item name="description" label="说明"><TextArea rows={3} /></Form.Item><Form.Item name="expiresAt" label="截止时间"><DatePicker showTime style={{ width: '100%' }} /></Form.Item><div className="settings-section"><Text strong>访问与限制</Text><Form.Item name={['accessPolicy', 'accessMode']} label="填写身份" extra="匿名问卷不支持按用户限制次数"><Select options={[{ value: 'anonymous', label: '公开匿名' }, { value: 'account', label: '登录后填写' }, { value: 'verified_email', label: '验证邮箱后填写' }]} /></Form.Item><Row gutter={12}><Col xs={24} sm={8}><Form.Item name={['accessPolicy', 'maxSubmissionsPerUser']} label="每用户最多次数"><InputNumber min={1} style={{ width: '100%' }} placeholder="不限" /></Form.Item></Col><Col xs={24} sm={8}><Form.Item name={['accessPolicy', 'maxSubmissionsTotal']} label="总回收上限"><InputNumber min={1} style={{ width: '100%' }} placeholder="不限" /></Form.Item></Col><Col xs={24} sm={8}><Form.Item name={['accessPolicy', 'cooldownSeconds']} label="提交间隔（秒）"><InputNumber min={0} style={{ width: '100%' }} placeholder="不限" /></Form.Item></Col></Row></div></div>;

  const questionRows = pageItems.map((question) => { const checked = selected.includes(question.id); return <div className="survey-picker-row" key={question.id}>{mode === 'manual' ? <Checkbox checked={checked} onChange={(event) => toggleQuestion(question, event.target.checked)}><Text strong>{question.title}</Text></Checkbox> : <Text strong>{question.title}</Text>}<Tag color={QUESTION_TYPES[question.type]?.color}>{QUESTION_TYPES[question.type]?.label}</Tag>{(mode === 'random' || checked) && <Checkbox checked={requiredValue(question)} onChange={(event) => setRequiredByQuestion((current) => ({ ...current, [question.id]: event.target.checked }))}>必填</Checkbox>}</div>; });

  const pickerExtra = <Space><Select size="small" aria-label="按题型显示" value={manualType} onChange={(value) => { setManualType(value); setQuestionPage(1); }} options={typeFilterOptions()} /><Pagination size="small" current={questionPage} pageSize={PAGE_SIZE} total={pickerAvailable.length} hideOnSinglePage onChange={setQuestionPage} showSizeChanger={false} /></Space>;
  const questionsTab = <div className="survey-dialog-section"><Form.Item name="selectionMode" label="选题方式"><Radio.Group onChange={(event) => { setMode(event.target.value); setManualType('all'); setQuestionPage(1); }} options={[{ value: 'manual', label: '手动选择' }, { value: 'random', label: '随机抽取' }]} /></Form.Item>{mode === 'manual' ? <><Form.Item label="选择题目分组" required><Select value={manualGroup} onChange={(value) => { setManualGroup(value); setManualType('all'); setQuestionPage(1); }} options={groups.map((group) => ({ value: group.id, label: `${group.name} (${group.questionCount})` }))} /></Form.Item><Card size="small" title="分组内题目" className="survey-question-picker" extra={pickerExtra}>{questionRows.length ? questionRows : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="当前筛选暂无题目" />}</Card></> : <><Form.Item name="sourceGroupId" label="抽题分组"><Select onChange={(value) => { setSourceGroup(value); setManualType('all'); setQuestionPage(1); form.setFieldValue('randomCounts', {}); }} options={groups.map((group) => ({ value: group.id, label: `${group.name} (${group.questionCount})` }))} /></Form.Item><Row gutter={12}>{QUESTION_TYPE_ORDER.map((type) => { const capacity = capacities[type] || 0; return <Col xs={24} sm={12} key={type}><Form.Item name={['randomCounts', type]} label={`${QUESTION_TYPES[type].label}（最多 ${capacity}）`} initialValue={0}><InputNumber min={0} max={capacity} disabled={!capacity} controls style={{ width: '100%' }} /></Form.Item></Col>; })}</Row><Card size="small" title="候选题目必填设置" className="survey-question-picker" extra={pickerExtra}>{questionRows.length ? questionRows : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="当前筛选暂无题目" />}</Card></>}</div>;

  const tabs = [{ key: 'basic', label: '基本信息', children: basicTab }, { key: 'questions', label: '题目设置', children: questionsTab }];
  if (kind === 'exam') tabs.push({ key: 'scoring', label: '分数设置', children: <ExamSettings scoringMode={scoringMode} setScoringMode={setScoringMode} typeCounts={typeCounts} questions={selectedQuestions} /> });

  return <Modal open={open} title={editing ? '编辑实例' : '生成问卷或考试'} onCancel={onClose} onOk={submit} okText="保存" cancelText="取消" destroyOnHidden width={860}><Form form={form} layout="vertical"><Tabs activeKey={activeTab} onChange={setActiveTab} items={tabs} /></Form></Modal>;
}
