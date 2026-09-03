import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Col, Form, InputNumber, Pagination, Radio, Row, Select, Space, Tag, Typography } from 'antd';
import { QUESTION_TYPES, typeFilterOptions } from '../../lib/questionTypes';

const { Text } = Typography;
const PAGE_SIZE = 5;

export default function ExamSettings({ scoringMode, setScoringMode, typeCounts, questions = [] }) {
  const form = Form.useFormInstance();
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState('all');
  const [batchType, setBatchType] = useState('single');
  const [batchScore, setBatchScore] = useState(null);
  const scorableQuestions = useMemo(() => questions.filter((question) => question.type !== 'open_text'), [questions]);
  const visibleQuestions = useMemo(() => scorableQuestions.filter((question) => typeFilter === 'all' || question.type === typeFilter), [scorableQuestions, typeFilter]);
  const availableTypes = useMemo(() => [...new Set(scorableQuestions.map((question) => question.type))], [scorableQuestions]);
  const pageItems = visibleQuestions.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => { setPage((current) => Math.min(current, Math.max(1, Math.ceil(visibleQuestions.length / PAGE_SIZE)))); }, [visibleQuestions.length]);
  useEffect(() => { if (availableTypes.length && !availableTypes.includes(batchType)) setBatchType(availableTypes[0]); }, [availableTypes, batchType]);

  const applyBatchScore = () => {
    if (!batchType || !Number.isFinite(Number(batchScore)) || Number(batchScore) <= 0) return;
    const nextScores = { ...(form.getFieldValue('questionScores') || {}) };
    scorableQuestions.filter((question) => question.type === batchType).forEach((question) => { nextScores[question.id] = Number(batchScore); });
    form.setFieldValue('questionScores', nextScores);
  };

  return <div className="exam-settings-panel">
    <Form.Item name="scoringMode" label="计分模式"><Radio.Group onChange={(event) => setScoringMode(event.target.value)}><Space direction="vertical"><Radio value="weighted">满分与题型权重</Radio><Radio value="per_question">逐题分值累加</Radio></Space></Radio.Group></Form.Item>
    {questions.some((question) => question.type === 'open_text') && <Alert type="info" showIcon message="开放文本不参与自动计分" description="开放文本仍会出现在试卷中，但不会计入自动评分和考试总分。" />}
    {scoringMode === 'weighted' ? <>
      <Form.Item name="totalScore" label="考试满分"><InputNumber min={0.01} style={{ width: '100%' }} /></Form.Item>
      <Text type="secondary">题型权重合计必须为 100%</Text>
      <Row gutter={12}>{Object.keys(typeCounts).filter((type) => type !== 'open_text' && typeCounts[type] > 0).map((type) => <Col xs={24} sm={12} key={type}><Form.Item name={['typeWeights', type]} label={`${QUESTION_TYPES[type]?.label || type}（${typeCounts[type]} 题）`}><InputNumber min={0.01} addonAfter="%" style={{ width: '100%' }} /></Form.Item></Col>)}</Row>
    </> : <div className="exam-score-layout">
      <div className="exam-score-list"><div className="compact-list-toolbar"><Select aria-label="按题型筛选分值" value={typeFilter} onChange={(value) => { setTypeFilter(value); setPage(1); }} options={typeFilterOptions()} /><Pagination size="small" current={page} pageSize={PAGE_SIZE} total={visibleQuestions.length} hideOnSinglePage onChange={setPage} showSizeChanger={false} /></div>
        {pageItems.map((question) => <div className="exam-score-row" key={question.id}><div><Text strong ellipsis={{ tooltip: question.title }}>{question.title}</Text><Tag color={QUESTION_TYPES[question.type]?.color}>{QUESTION_TYPES[question.type]?.label}</Tag></div><Form.Item name={['questionScores', question.id]} rules={[{ required: true, message: '请设置分值' }]}><InputNumber min={0.01} addonAfter="分" /></Form.Item></div>)}
      </div>
      <div className="exam-score-batch"><Text strong>批量设置</Text><Text type="secondary">按题型为当前实例中的每道题设置相同分值。</Text><Select value={batchType} onChange={setBatchType} options={availableTypes.map((type) => ({ value: type, label: QUESTION_TYPES[type]?.label || type }))} /><InputNumber min={0.01} addonAfter="分" value={batchScore} onChange={setBatchScore} placeholder="每题分值" /><Button type="primary" onClick={applyBatchScore} disabled={!availableTypes.length || !batchScore}>应用到该题型</Button></div>
    </div>}
  </div>;
}
