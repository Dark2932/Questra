import { Form, InputNumber, Radio, Space, Typography, Row, Col } from 'antd';

const { Text } = Typography;
const typeLabels = { single: '单选', multiple: '多选', text: '文本' };

export default function ExamSettings({ scoringMode, setScoringMode, typeCounts }) {
  return (
    <div style={{ border: '1px solid var(--ant-color-warning-border, #f5d599)', borderRadius: 8, padding: 16, background: 'var(--ant-color-warning-bg, #fffbe6)' }}>
      <Text strong style={{ color: 'var(--ant-color-warning-text, #ad6800)', marginBottom: 16, display: 'block' }}>考试设置</Text>
      <Form.Item name="scoringMode" label="计分模式" initialValue="weighted">
        <Radio.Group onChange={(e) => setScoringMode(e.target.value)}>
          <Space direction="vertical">
            <Radio value="weighted">满分与题型权重</Radio>
            <Radio value="per_question">逐题分值累加</Radio>
          </Space>
        </Radio.Group>
      </Form.Item>
      {scoringMode === 'weighted' && (
        <>
          <Form.Item name="totalScore" label="考试满分" initialValue={100}>
            <InputNumber min={0.01} step={0.01} style={{ width: '100%' }} />
          </Form.Item>
          <Text type="secondary" style={{ fontSize: 12, marginBottom: 8, display: 'block' }}>题型权重（合计 100%）</Text>
          <Row gutter={[12, 12]}>
            {Object.keys(typeCounts).map((t) => (
              <Col key={t} xs={24} sm={8}>
                <Form.Item name={['typeWeights', t]} label={`${typeLabels[t]}（${typeCounts[t]} 题）`} style={{ marginBottom: 0 }}>
                  <InputNumber min={0.01} step={0.01} addonAfter="%" style={{ width: '100%' }} />
                </Form.Item>
              </Col>
            ))}
          </Row>
        </>
      )}
    </div>
  );
}