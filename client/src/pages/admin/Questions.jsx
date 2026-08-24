import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Pencil, Trash2, HelpCircle } from 'lucide-react';
import { api } from '../../api';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { useToast } from '../../components/ui/Toast';
import QuestionDialog from './QuestionDialog';

const typeLabels = { single: '单选', multiple: '多选', text: '文本' };

export default function Questions() {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formError, setFormError] = useState('');
  const { toast } = useToast();

  const load = useCallback(async () => {
    try {
      setQuestions(await api.getQuestions());
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => { setEditing(null); setFormError(''); setDialogOpen(true); };
  const openEdit = (q) => { setEditing(q); setFormError(''); setDialogOpen(true); };

  const handleDelete = async (id) => {
    if (!window.confirm('确定要删除这道题目吗？')) return;
    try { await api.deleteQuestion(id); toast('题目已删除'); load(); }
    catch (e) { toast(e.message, 'error'); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const type = fd.get('type');
    const options = type === 'text'
      ? []
      : fd.get('options').split('\n').map((s) => s.trim()).filter(Boolean);

    let correctAnswer = null;
    if (type === 'single') {
      const sel = e.target.querySelector('[name="correctSingle"]:checked');
      if (sel) correctAnswer = sel.value;
    } else if (type === 'multiple') {
      const checked = [...e.target.querySelectorAll('[name="correctMultiple"]:checked')].map((el) => el.value);
      if (checked.length) correctAnswer = checked;
    } else {
      const text = (fd.get('correctText') || '').trim();
      if (text) correctAnswer = text.split('\n').map((s) => s.trim()).filter(Boolean);
    }

    try {
      const payload = { title: fd.get('title').trim(), type, options, required: fd.has('required'), correctAnswer };
      if (editing) { await api.updateQuestion(editing.id, payload); toast('题目已更新'); }
      else { await api.createQuestion(payload); toast('题目已添加'); }
      setDialogOpen(false);
      load();
    } catch (err) { setFormError(err.message); }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold tracking-widest text-accent uppercase">QUESTION POOL</p>
          <h1 className="text-3xl font-bold text-gray-900 mt-1">问题池</h1>
        </div>
        <Button variant="primary" onClick={openAdd}><Plus className="w-4 h-4" /> 添加题目</Button>
      </div>

      <Card hover={false}>
        <div className="mb-4">
          <h2 className="text-lg font-bold text-gray-900">公共题目模板</h2>
          <p className="text-sm text-gray-500">问卷生成时会复制题目，之后修改不会影响已有问卷。</p>
        </div>
        {loading ? (
          <div className="text-center py-12 text-gray-400">正在加载…</div>
        ) : questions.length === 0 ? (
          <div className="text-center py-14">
            <HelpCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="font-semibold text-gray-500">问题池还是空的</p>
            <p className="text-sm text-gray-400">添加第一道题目后即可生成问卷。</p>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {questions.map((q, i) => (
                <motion.div key={q.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }} transition={{ delay: i * 0.04 }}
                  className="flex items-start justify-between gap-4 p-4 rounded-xl border border-gray-100 hover:border-accent/20 hover:bg-accent/[0.02] transition-all group">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <Badge variant={q.type}>{typeLabels[q.type]}</Badge>
                      <Badge variant={q.required ? 'required' : 'optional'}>{q.required ? '必填' : '选填'}</Badge>
                    </div>
                    <p className="font-semibold text-gray-900 leading-snug">{q.title}</p>
                    {q.options?.length > 0 && <p className="text-sm text-gray-500 mt-1 truncate">{q.options.join(' / ')}</p>}
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 pt-1">
                    <Button size="sm" onClick={() => openEdit(q)}><Pencil className="w-3.5 h-3.5" /> 编辑</Button>
                    <Button size="sm" variant="danger" onClick={() => handleDelete(q.id)}><Trash2 className="w-3.5 h-3.5" /> 删除</Button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </Card>

      <QuestionDialog open={dialogOpen} onClose={() => setDialogOpen(false)} editing={editing}
        onSubmit={handleSubmit} error={formError} onErrorClear={() => setFormError('')} />
    </div>
  );
}
