import { useState, useEffect } from 'react';
import Dialog from '../../components/ui/Dialog';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Button from '../../components/ui/Button';

export default function QuestionDialog({ open, onClose, editing, onSubmit, error, onErrorClear }) {
  const [type, setType] = useState('single');
  const [optionsText, setOptionsText] = useState('');

  useEffect(() => {
    if (open) {
      setType(editing?.type || 'single');
      setOptionsText(editing?.options?.join('\n') || '');
      onErrorClear?.();
    }
  }, [open, editing, onErrorClear]);

  const options = optionsText.split('\n').map((s) => s.trim()).filter(Boolean);

  return (
    <Dialog open={open} onClose={onClose} title={editing ? '编辑题目' : '添加题目'}>
      <form onSubmit={onSubmit} className="space-y-4">
        <input type="hidden" name="id" defaultValue={editing?.id || ''} />
        <Input label="题目标题" name="title" required maxLength={500}
          placeholder="请输入题目内容" defaultValue={editing?.title || ''} />

        <Select label="题目类型" name="type" value={type} onChange={(e) => setType(e.target.value)}>
          <option value="single">单选</option>
          <option value="multiple">多选</option>
          <option value="text">填空 / 开放文本</option>
        </Select>

        {type !== 'text' && (
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700">选项（每行一个）</label>
            <textarea name="options" rows={4} value={optionsText}
              onChange={(e) => setOptionsText(e.target.value)}
              placeholder={'选项 A\n选项 B'}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all resize-none" />
          </div>
        )}

        {type === 'single' && options.length > 0 && (
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-gray-700">标准答案（考试使用）</legend>
            <div className="space-y-1.5 pl-1">
              {options.map((opt) => (
                <label key={opt} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="radio" name="correctSingle" value={opt}
                    defaultChecked={editing?.correctAnswer === opt} className="accent-[#187a55] w-4 h-4" />
                  <span>{opt}</span>
                </label>
              ))}
            </div>
          </fieldset>
        )}

        {type === 'multiple' && options.length > 0 && (
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-gray-700">标准答案（考试使用）</legend>
            <div className="space-y-1.5 pl-1">
              {options.map((opt) => (
                <label key={opt} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" name="correctMultiple" value={opt}
                    defaultChecked={Array.isArray(editing?.correctAnswer) && editing.correctAnswer.includes(opt)}
                    className="accent-[#187a55] w-4 h-4 rounded" />
                  <span>{opt}</span>
                </label>
              ))}
            </div>
          </fieldset>
        )}

        {type === 'text' && (
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700">可接受的标准答案（每行一个）</label>
            <textarea name="correctText" rows={3}
              defaultValue={Array.isArray(editing?.correctAnswer) ? editing.correctAnswer.join('\n') : editing?.correctAnswer || ''}
              placeholder="允许配置多个等价答案"
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all resize-none" />
          </div>
        )}

        <p className="text-xs text-gray-400">不设置标准答案的题目仍可用于普通问卷，但不能加入考试。</p>

        <label className="flex items-center gap-2.5 cursor-pointer">
          <input type="checkbox" name="required" defaultChecked={editing?.required ?? true}
            className="accent-[#187a55] w-4 h-4 rounded" />
          <span className="text-sm text-gray-700">设为必填题</span>
        </label>

        {error && <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

        <div className="flex justify-end gap-3 pt-3 border-t border-gray-100 -mb-1">
          <Button type="button" onClick={onClose}>取消</Button>
          <Button type="submit" variant="primary">保存</Button>
        </div>
      </form>
    </Dialog>
  );
}
