import { useState } from 'react';
import { Button, Input, Radio, Checkbox, Space, Typography, Alert } from 'antd';
import { SendOutlined } from '@ant-design/icons';

const { TextArea } = Input;
const { Text } = Typography;

export default function SurveyForm({ survey, onSubmit }) {
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const setAnswer = (qid, value) => setAnswers((prev) => ({ ...prev, [qid]: value }));

  const handleSubmit = async () => {
    setError('');
    for (const q of survey.questions) {
      if (q.required) {
        const v = answers[q.id];
        if (v === undefined || v === '' || (Array.isArray(v) && v.length === 0)) {
          setError(`请完成第 ${survey.questions.indexOf(q) + 1} 题：${q.title}`);
          return;
        }
      }
    }
    setSubmitting(true);
    try { await onSubmit(answers); } catch (err) { setError(err.message); }
    finally { setSubmitting(false); }
  };

  return (
    <div>
      {survey.questions.map((q, idx) => (
        <div key={q.id} style={{ padding: '20px 0', borderBottom: idx < survey.questions.length - 1 ? '1px solid var(--ant-color-border-secondary)' : 'none' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 12 }}>
            <Text type="secondary" style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 600, flexShrink: 0, marginTop: 2 }}>
              {String(idx + 1).padStart(2, '0')}
            </Text>
            <div>
              <Text strong style={{ display: 'block', lineHeight: 1.6 }}>{q.title}
                {q.required && <Text type="danger" style={{ fontSize: 12, fontWeight: 400, marginLeft: 6 }}>必填</Text>}
                {survey.kind === 'exam' && q.points != null && <Text type="secondary" style={{ fontSize: 12, marginLeft: 6 }}>{q.points.toFixed(2).replace(/\.00$/, '')} 分</Text>}
              </Text>
            </div>
          </div>
          {q.type === 'text' ? (
            <TextArea rows={3} maxLength={10000} placeholder="请输入你的回答" value={answers[q.id] || ''}
              onChange={(e) => setAnswer(q.id, e.target.value)} style={{ marginLeft: 24 }} />
          ) : q.type === 'single' ? (
            <Radio.Group value={answers[q.id]} onChange={(e) => setAnswer(q.id, e.target.value)} style={{ marginLeft: 24, width: 'calc(100% - 24px)' }}>
              <Space direction="vertical" size={6} style={{ width: '100%' }}>
                {q.options.map((opt) => (
                  <Radio key={opt} value={opt} style={{ padding: '8px 12px', borderRadius: 6,
                    border: '1px solid var(--ant-color-border)', width: '100%', marginInlineStart: 0,
                    transition: 'border-color 0.2s, background 0.2s' }}>{opt}</Radio>
                ))}
              </Space>
            </Radio.Group>
          ) : (
            <Checkbox.Group value={answers[q.id] || []} onChange={(v) => setAnswer(q.id, v)} style={{ marginLeft: 24, width: 'calc(100% - 24px)' }}>
              <Space direction="vertical" size={6} style={{ width: '100%' }}>
                {q.options.map((opt) => (
                  <Checkbox key={opt} value={opt} style={{ padding: '8px 12px', borderRadius: 6,
                    border: '1px solid var(--ant-color-border)', width: '100%', marginInlineStart: 0,
                    transition: 'border-color 0.2s, background 0.2s' }}>{opt}</Checkbox>
                ))}
              </Space>
            </Checkbox.Group>
          )}
        </div>
      ))}
      {error && <Alert message={error} type="error" showIcon style={{ marginTop: 16 }} />}
      <Button type="primary" icon={<SendOutlined />} size="large" block loading={submitting}
        onClick={handleSubmit} style={{ marginTop: 24, height: 44 }}>
        {submitting ? '正在提交...' : survey.kind === 'exam' ? '提交试卷' : '提交答卷'}
      </Button>
    </div>
  );
}