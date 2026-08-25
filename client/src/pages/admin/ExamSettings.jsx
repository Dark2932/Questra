import { Form, InputNumber, Radio, Space, Typography, Row, Col } from 'antd';
const { Text } = Typography;
const labels = { single: '单选', multiple: '多选', text: '填空 / 文本', judgment: '判断' };
export default function ExamSettings({ scoringMode, setScoringMode, typeCounts, questions = [] }) {
  return <div style={{ border: '1px solid #f5d599', borderRadius: 8, padding: 16, background: '#fffbe6' }}>
    <Text strong style={{ display: 'block', marginBottom: 12 }}>考试设置</Text>
    <Form.Item name="scoringMode" label="计分模式"><Radio.Group onChange={(e) => setScoringMode(e.target.value)}><Space direction="vertical"><Radio value="weighted">满分与题型权重</Radio><Radio value="per_question">逐题分值累加</Radio></Space></Radio.Group></Form.Item>
    {scoringMode === 'weighted' ? <><Form.Item name="totalScore" label="考试满分"><InputNumber min={0.01} style={{ width: '100%' }} /></Form.Item><Text type="secondary">题型权重合计必须为 100%</Text><Row gutter={12}>{Object.keys(typeCounts).map((type) => <Col span={12} key={type}><Form.Item name={['typeWeights', type]} label={labels[type] + '（' + typeCounts[type] + '题）'}><InputNumber min={0.01} addonAfter="%" style={{ width: '100%' }} /></Form.Item></Col>)}</Row></> : <Row gutter={12}>{questions.map((question) => <Col span={24} key={question.id}><Form.Item name={['questionScores', question.id]} label={question.title} rules={[{ required: true, message: '请设置分值' }]}><InputNumber min={0.01} addonAfter="分" style={{ width: '100%' }} /></Form.Item></Col>)}</Row>}
  </div>;
}
