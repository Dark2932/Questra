import { useEffect } from 'react';
import { Modal, Form, Input, Select, Checkbox, Radio, Space, Typography, Button, Tooltip } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { QUESTION_TYPE_ORDER, QUESTION_TYPES } from '../../lib/questionTypes';

const letter = (i) => String.fromCharCode(65 + i);

export default function QuestionDialog({ open, onClose, editing, groups = [], onSuccess }) {
  const [form] = Form.useForm();
  const type = Form.useWatch('type', form);
  const options = Form.useWatch('options', form) || [];
  useEffect(() => {
    if (!open) return;
    form.resetFields();
    if (editing) form.setFieldsValue({ title: editing.title, type: editing.type, options: editing.options || [], correctSingle: editing.correctAnswer, correctMultiple: Array.isArray(editing.correctAnswer) ? editing.correctAnswer : [], acceptedAnswers: editing.type === 'text' && Array.isArray(editing.correctAnswer) ? editing.correctAnswer : [], groupIds: editing.groupIds || [] });
    else form.setFieldsValue({ title: '', type: 'single', options: ['', ''], groupIds: [] });
  }, [open, editing, form]);
  const changeType = (value) => {
    if (value === 'judgment') form.setFieldsValue({ options: ['正确', '错误'], correctSingle: undefined, correctMultiple: [] });
    else if (value === 'text' || value === 'open_text') form.setFieldsValue({ options: [], correctSingle: undefined, correctMultiple: [], acceptedAnswers: [] });
    else form.setFieldsValue({ options: ['', ''], correctSingle: undefined, correctMultiple: [] });
  };
  const handleOk = async () => {
    const values = await form.validateFields();
    const finalOptions = values.type === 'judgment' ? ['正确', '错误'] : (values.options || []).map((v) => String(v || '').trim()).filter(Boolean);
    let correctAnswer = null;
    if (values.type === 'single' || values.type === 'judgment') correctAnswer = values.correctSingle || null;
    if (values.type === 'multiple') correctAnswer = values.correctMultiple?.length ? values.correctMultiple : null;
    if (values.type === 'text') correctAnswer = values.acceptedAnswers?.map((v) => String(v || '').trim()).filter(Boolean) || null;
    await onSuccess({ title: values.title.trim(), type: values.type, options: finalOptions, required: false, correctAnswer, groupIds: values.groupIds || [] });
  };
  return <Modal open={open} title={editing ? '编辑题目' : '添加题目'} onCancel={onClose} onOk={handleOk} okText="保存" cancelText="取消" destroyOnHidden width={600}>
    <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
      <Form.Item name="title" label="题目" rules={[{ required: true, message: '请输入题目描述' }]}><Input maxLength={500} /></Form.Item>
      <Form.Item name="type" label="题目类型"><Select onChange={changeType} options={QUESTION_TYPE_ORDER.map((value) => ({ value, label: QUESTION_TYPES[value].label }))} /></Form.Item>
      {(type === 'single' || type === 'multiple') && <Form.List name="options" rules={[{ validator: async (_, values) => { if (!values || values.filter((v) => String(v || '').trim()).length < 2) throw new Error('至少需要两个选项'); } }]}>{(fields, { add, remove }, { errors }) => <Form.Item label="选项"><Space direction="vertical" style={{ width: '100%' }}>{fields.map((field, index) => <Space key={field.key} style={{ display: 'flex' }}><Typography.Text strong>{letter(index)}.</Typography.Text><Form.Item {...field} noStyle rules={[{ required: true, message: '请输入选项' }]}><Input placeholder={'选项 ' + letter(index)} /></Form.Item><Button type="text" danger icon={<DeleteOutlined />} disabled={fields.length <= 2} onClick={() => remove(field.name)} /></Space>)}<Button type="dashed" icon={<PlusOutlined />} onClick={() => add('')} block>添加选项</Button><Form.ErrorList errors={errors} /></Space></Form.Item>}</Form.List>}
      {type === 'judgment' && <Form.Item label="选项"><Tooltip title="判断题只有“正确”和“错误”选项，无需更改"><span className="question-judgment-options"><Radio.Group disabled options={['正确', '错误'].map((v) => ({ value: v, label: v }))} /></span></Tooltip></Form.Item>}
      {((type === 'single' && options.some((option) => String(option || '').trim())) || type === 'judgment') && <Form.Item name="correctSingle" label="标准答案（考试使用）"><Radio.Group><Space direction="vertical">{(type === 'judgment' ? ['正确', '错误'] : options).filter((value) => String(value || '').trim()).map((v, i) => <Radio key={`${v}-${i}`} value={v}>{type === 'single' ? letter(i) + '. ' : ''}{v}</Radio>)}</Space></Radio.Group></Form.Item>}
      {type === 'multiple' && options.some((option) => String(option || '').trim()) && <Form.Item name="correctMultiple" label="标准答案（考试使用）"><Checkbox.Group><Space direction="vertical">{options.filter((value) => String(value || '').trim()).map((v, i) => <Checkbox key={`${v}-${i}`} value={v}>{letter(i)}. {v}</Checkbox>)}</Space></Checkbox.Group></Form.Item>}
      {type === 'text' && <Form.List name="acceptedAnswers">{(fields, { add, remove }) => <Form.Item label="标准答案（考试使用，可设置多项）"><Space direction="vertical" style={{ width: '100%' }}>{fields.map((field) => <Space key={field.key} style={{ display: 'flex' }}><Form.Item {...field} noStyle><Input placeholder="..." /></Form.Item><Button type="text" danger icon={<DeleteOutlined />} onClick={() => remove(field.name)} /></Space>)}<Button type="dashed" icon={<PlusOutlined />} onClick={() => add('')} block>添加标准答案</Button></Space></Form.Item>}</Form.List>}
      {type !== 'open_text' && <Typography.Text type="secondary" style={{ fontSize: 12 }}>未设置标准答案的题目只能用于普通问卷。</Typography.Text>}
      {type === 'open_text' && <Typography.Text type="secondary" style={{ fontSize: 12 }}>开放文本不设置标准答案，在考试中不参与自动计分。</Typography.Text>}
      <Form.Item name="groupIds" label="所属分组"><Select mode="multiple" allowClear options={groups.map((g) => ({ value: g.id, label: g.name }))} /></Form.Item>
    </Form>
  </Modal>;
}
