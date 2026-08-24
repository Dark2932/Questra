import { useState, useEffect, useMemo } from 'react';
import Dialog from '../../components/ui/Dialog';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Button from '../../components/ui/Button';
import ExamSettings from './ExamSettings';

const typeLabels = { single: '单选', multiple: '多选', text: '文本' };

export default function SurveyDialog({ open, onClose, questions, onSubmit, error, onErrorClear }) {
  const [kind, setKind] = useState('survey');
  const [selected, setSelected] = useState(new Set());
  const [scoringMode, setScoringMode] = useState('weighted');
  const [qScores, setQScores] = useState({});

  useEffect(() => {
    if (open) { setSelected(new Set()); setKind('survey'); setScoringMode('weighted'); setQScores({}); onErrorClear?.(); }
  }, [open, onErrorClear]);

  const toggle = (id) => setSelected((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const selQs = useMemo(() => questions.filter((q) => selected.has(q.id)), [questions, selected]);
  const typeCounts = useMemo(() => { const c = {}; selQs.forEach((q) => { c[q.type] = (c[q.type] || 0) + 1; }); return c; }, [selQs]);

  const batchScore = (type, val) => {
    const v = parseFloat(val); if (!v || v <= 0) return;
    const n = { ...qScores }; selQs.filter((q) => q.type === type).forEach((q) => { n[q.id] = v; }); setQScores(n);
  };

  const maxScore = scoringMode === 'per_question'
    ? selQs.reduce((s, q) => s + (parseFloat(qScores[q.id]) || 0), 0)
    : 0;

  const handleSubmit = (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const payload = {
      kind, title: fd.get('title').trim(), description: fd.get('description').trim(),
      expiresAt: fd.get('expiresAt') ? new Date(fd.get('expiresAt')).toISOString() : null,
      questionIds: [...selected],
    };
    if (kind === 'exam') {
      payload.scoringMode = scoringMode;
      if (scoringMode === 'weighted') {
        payload.totalScore = parseFloat(fd.get('totalScore')) || 100;
        const tw = {}; Object.keys(typeCounts).forEach((t) => { tw[t] = parseFloat(fd.get(`w_${t}`)) || 0; });
        payload.typeWeights = tw;
      } else {
        payload.questionScores = {}; selQs.forEach((q) => { payload.questionScores[q.id] = parseFloat(qScores[q.id]) || 0; });
      }
    }
    onSubmit(payload);
  };

  return (
    <Dialog open={open} onClose={onClose} title="生成问卷或考试" wide>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Select label="实例类型" value={kind} onChange={(e) => setKind(e.target.value)}>
          <option value="survey">普通问卷</option><option value="exam">考试 / 答题</option>
        </Select>
        <Input label="问卷标题" name="title" required maxLength={200} placeholder="例如：活动反馈问卷" />
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-gray-700">说明</label>
          <textarea name="description" rows={2} placeholder="选填"
            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all resize-none" />
        </div>
        <Input label="截止时间" name="expiresAt" type="datetime-local" />
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-gray-700">从问题池选择题目</legend>
          {questions.length === 0 ? <p className="text-sm text-gray-400 py-2">问题池为空。</p> : (
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {questions.map((q) => (
                <label key={q.id} className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${selected.has(q.id) ? 'border-accent/40 bg-accent/[0.04]' : 'border-gray-100 hover:border-gray-200'}`}>
                  <input type="checkbox" checked={selected.has(q.id)} onChange={() => toggle(q.id)} className="accent-[#187a55] w-4 h-4 rounded mt-0.5" />
                  <div className="min-w-0"><p className="font-semibold text-gray-900 text-sm">{q.title}</p>
                    <span className="text-xs text-gray-400">{typeLabels[q.type]} · {q.required ? '必填' : '选填'}</span></div>
                </label>
              ))}
            </div>
          )}
        </fieldset>
        {kind === 'exam' && selQs.length > 0 && (
          <ExamSettings scoringMode={scoringMode} setScoringMode={setScoringMode}
            typeCounts={typeCounts} qScores={qScores} batchScore={batchScore} maxScore={maxScore} />
        )}
        {error && <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
        <div className="flex justify-end gap-3 pt-3 border-t border-gray-100 -mb-1">
          <Button type="button" onClick={onClose}>取消</Button>
          <Button type="submit" variant="primary" disabled={selected.size === 0}>生成问卷</Button>
        </div>
      </form>
    </Dialog>
  );
}
