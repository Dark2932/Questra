import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Copy, ToggleLeft, ToggleRight, Trash2, Eye, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../../api';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { useToast } from '../../components/ui/Toast';
import SurveyDialog from './SurveyDialog';

export default function Surveys() {
  const [surveys, setSurveys] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formError, setFormError] = useState('');
  const { toast } = useToast();

  const load = useCallback(async () => {
    try {
      const [s, q] = await Promise.all([api.getSurveys(), api.getQuestions()]);
      setSurveys(s); setQuestions(q);
    } catch (e) { toast(e.message, 'error'); }
    finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const copyLink = async (id) => {
    await navigator.clipboard.writeText(`${window.location.origin}/s/${id}`);
    toast('公开链接已复制');
  };

  const toggleStatus = async (s) => {
    try {
      await api.updateSurvey(s.id, { status: s.status === 'active' ? 'closed' : 'active' });
      toast('问卷状态已更新'); load();
    } catch (e) { toast(e.message, 'error'); }
  };

  const deleteSurvey = async (id) => {
    if (!window.confirm('删除问卷会同时删除所有答卷，且无法恢复。确定继续吗？')) return;
    try { await api.deleteSurvey(id); toast('问卷已删除'); load(); }
    catch (e) { toast(e.message, 'error'); }
  };

  const handleCreate = async (payload) => {
    try { await api.createSurvey(payload); toast('问卷已生成'); setDialogOpen(false); load(); }
    catch (err) { setFormError(err.message); }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold tracking-widest text-accent uppercase">SURVEYS &amp; EXAMS</p>
          <h1 className="text-3xl font-bold text-gray-900 mt-1">问卷与考试</h1>
        </div>
        <Button variant="primary" onClick={() => { setFormError(''); setDialogOpen(true); }}>
          <Plus className="w-4 h-4" /> 生成实例
        </Button>
      </div>
      <Card hover={false}>
        <div className="mb-4">
          <h2 className="text-lg font-bold text-gray-900">实例列表</h2>
          <p className="text-sm text-gray-500">分享公开链接，管理问卷或考试并查看提交数据。</p>
        </div>
        {loading ? <div className="text-center py-12 text-gray-400">正在加载…</div>
        : surveys.length === 0 ? (
          <div className="text-center py-14">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="font-semibold text-gray-500">还没有问卷实例</p>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {surveys.map((s, i) => (
                <motion.div key={s.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }} transition={{ delay: i * 0.04 }}
                  className="p-4 rounded-xl border border-gray-100 hover:border-accent/20 hover:bg-accent/[0.02] transition-all">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <Badge variant={s.kind === 'exam' ? 'exam' : 'survey'}>{s.kind === 'exam' ? '考试' : '问卷'}</Badge>
                        <Badge variant={s.status}>{s.status === 'active' ? '回收中' : '已关闭'}</Badge>
                      </div>
                      <p className="font-semibold text-gray-900 text-base">{s.title}</p>
                      {s.description && <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{s.description}</p>}
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-4 text-xs text-gray-400">
                      <span>{s.question_count} 题</span>
                      <span>{s.response_count} 份答卷</span>
                      {s.kind === 'exam' && <span>满分 {s.maxScore} 分</span>}
                      {s.expiresAt && <span>截止 {new Date(s.expiresAt).toLocaleString('zh-CN', { hour12: false })}</span>}
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <Button size="sm" onClick={() => copyLink(s.id)}><Copy className="w-3.5 h-3.5" /> 链接</Button>
                      <Link to={`/admin/surveys/${s.id}/responses`}><Button size="sm"><Eye className="w-3.5 h-3.5" /> 数据</Button></Link>
                      <Button size="sm" onClick={() => toggleStatus(s)}>
                        {s.status === 'active' ? <><ToggleRight className="w-3.5 h-3.5" /> 关闭</> : <><ToggleLeft className="w-3.5 h-3.5" /> 开启</>}
                      </Button>
                      <Button size="sm" variant="danger" onClick={() => deleteSurvey(s.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </Card>
      <SurveyDialog open={dialogOpen} onClose={() => setDialogOpen(false)} questions={questions}
        onSubmit={handleCreate} error={formError} onErrorClear={() => setFormError('')} />
    </div>
  );
}
