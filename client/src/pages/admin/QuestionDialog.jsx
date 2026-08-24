import { useEffect } from 'react';
import { Modal, Form, Input, Select, Checkbox, Radio, Space, Typography } from 'antd';

const { TextArea } = Input;

export default function QuestionDialog({ open, onClose, editing, onSuccess }) {
  const [form] = Form.useForm();
  const type = Form.useWatch('type', form);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      form.setFieldsValue({
        title: editing.title,
        type: editing.type,
        options: editing.options?.join('\n') || '',
        required: editing.required,
        correctSingle: editing.correctAnswer,
        correctMultiple: Array.isArray(editing.correctAnswer) ? editing.correctAnswer : [],
        correctText: Array.isArray(editing.correctAnswer) ? editing.correctAnswer.join('\n') : editing.correctAnswer || '',
      });
    } else {
      form.resetFields();
      form.setFieldsValue({ type: 'single', required: true });
    }
  }, [open, editing, form]);

  const handleOk = async () => {
    const values = await form.validateFields();
    const options = values.type === 'text' ? [] : (values.options || '').split('\n').map((s) => s.trim()).filter(Boolean);
    let correctAnswer = null;
    if (values.type === 'single' && values.correctSingle) correctAnswer = values.correctSingle;
    else if (values.type === 'multiple' && values.correctMultiple?.length) correctAnswer = values.correctMultiple;
    else if (values.type === 'text' && values.correctText?.trim()) correctAnswer = values.correctText.split('\n').map((s) => s.trim()).filter(Boolean);
    onSuccess({ title: values.title.trim(), type: values.type, options, required: !!values.required, correctAnswer: correctAnswer || null });
  };

  return (
    <Modal open={open} title={editing ? '编辑题目' : '添加题目'} onCancel={onClose} onOk={handleOk}
      okText="保存" cancelText="取消" destroyOnHidden width={520}>
      <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
        <Form.Item name="title" label="题目标题" rules={[{ required: true, message: '请输入题目标题' }]}>
          <Input maxLength={500} placeholder="请输入题目内容" />
        </Form.Item>
        <Form.Item name="type" label="题目类型">
          <Select options={[{ value: 'single', label: '单选' }, { value: 'multiple', label: '多选' }, { value: 'text', label: '填空 / 开放文本' }]} />
        </Form.Item>
        {type !== 'text' && (
          <Form.Item name="options" label="选项（每行一个）" rules={[{ required: true, message: '请输入至少两个选项' }]}>
            <TextArea rows={4} placeholder={'选项 A\n选项 B'} />
          </Form.Item>
        )}
        {type === 'single' && (
          <Form.Item name="correctSingle" label="标准答案（考试使用）">
            <Radio.Group>
              <Space direction="vertical">
                {(form.getFieldValue('options') || '').split('\n').filter(Boolean).map((o) => <Radio key={o} value={o.trim()}>{o.trim()}</Radio>)}
              </Space>
            </Radio.Group>
          </Form.Item>
        )}
        {type === 'multiple' && (
          <Form.Item name="correctMultiple" label="标准答案（考试使用）">
            <Checkbox.Group options={(form.getFieldValue('options') || '').split('\n').filter(Boolean).map((o) => o.trim())} />
          </Form.Item>
        )}
        {type === 'text' && (
          <Form.Item name="correctText" label="可接受的标准答案（每行一个）">
            <TextArea rows={3} placeholder="允许配置多个等价答案" />
          </Form.Item>
        )}
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>不设置标准答案的题目仍可用于普通问卷，但不能加入考试。</Typography.Text>
        <Form.Item name="required" valuePropName="checked" style={{ marginTop: 12 }}>
          <Checkbox>设为必填题</Checkbox>
        </Form.Item>
      </Form>
    </Modal>
  );
}