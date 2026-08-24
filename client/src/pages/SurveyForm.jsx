import { useState } from 'react';
import { Button, Input, Radio, Checkbox, Space, Typography, Alert } from 'antd';
import { SendOutlined } from '@ant-design/icons';

const { TextArea } = Input;
const { Text, Title } = Typography;

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
          setError(`请完成第 ${survey.questions.indexOf(q) + 1} 题`);
          return;
        }
      }
    }
    setSubmitting(true);
    try { await onSubmit(answers); } catch (err) { setError(err.message); }
    finally { setSubmitting(false); }
  };

  return (
    <div style={{ padding: '0 32px 32px' }}>
      {survey.questions.map((q, idx) => (
        <div key={q.id} style={{ padding: '24px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 16 }}>
            <Text style={{ color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace', fontSize: 12, fontWeight: 700, marginTop: 2 }}>
              {String(idx + 1).padStart(2, '0')}
            </Text>
            <div>
              <Text style={{ color: '#fff', fontWeight: 600, display: 'block' }}>{q.title}
                {q.required && <Text type="danger" style={{ fontSize: 12, marginLeft: 8 }}>必填</Text>}
                {survey.kind === 'exam' && q.points != null && <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginLeft: 8 }}>{q.points.toFixed(2).replace(/\.00$/, '')} 分</Text>}
              </Text>
            </div>
          </div>
          {q.type === 'text' ? (
            <TextArea rows={3} maxLength={10000} placeholder="请输入你的回答" value={answers[q.id] || ''}
              onChange={(e) => setAnswer(q.id, e.target.value)} style={{ marginLeft: 24, background: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.1)', color: '#fff' }} />
          ) : q.type === 'single' ? (
            <Radio.Group value={answers[q.id]} onChange={(e) => setAnswer(q.id, e.target.value)} style={{ marginLeft: 24 }}>
              <Space direction="vertical" size={8} style={{ width: '100%' }}>
                {q.options.map((opt) => (
                  <Radio key={opt} value={opt} style={{ color: 'rgba(255,255,255,0.8)', padding: '10px 16px', borderRadius: 12,
                    border: '1px solid rgba(255,255,255,0.1)', width: '100%', marginInlineStart: 0 }}>{opt}</Radio>
                ))}
              </Space>
            </Radio.Group>
          ) : (
            <Checkbox.Group value={answers[q.id] || []} onChange={(v) => setAnswer(q.id, v)} style={{ marginLeft: 24 }}>
              <Space direction="vertical" size={8} style={{ width: '100%' }}>
                {q.options.map((opt) => (
                  <Checkbox key={opt} value={opt} style={{ color: 'rgba(255,255,255,0.8)', padding: '10px 16px', borderRadius: 12,
                    border: '1px solid rgba(255,255,255,0.1)', width: '100%', marginInlineStart: 0 }}>{opt}</Checkbox>
                ))}
              </Space>
            </Checkbox.Group>
          )}
        </div>
      ))}
      {error && <Alert message={error} type="error" showIcon style={{ marginTop: 16 }} />}
      <Button type="primary" icon={<SendOutlined />} size="large" block loading={submitting}
        onClick={handleSubmit} style={{ marginTop: 20 }}>
        {submitting ? '正在提交...' : survey.kind === 'exam' ? '提交试卷' : '提交答卷'}
      </Button>
    </div>
  );
}