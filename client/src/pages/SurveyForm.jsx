import { useState } from 'react';
import ShimmerButton from '../components/effects/ShimmerButton';

export default function SurveyForm({ survey, onSubmit }) {
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');
    const form = e.target;
    const answers = {};

    survey.questions.forEach((q) => {
      const block = form.querySelector(`[data-qid="${q.id}"]`);
      if (q.type === 'multiple') {
        answers[q.id] = [...block.querySelectorAll('input:checked')].map((el) => el.value);
      } else if (q.type === 'single') {
        answers[q.id] = block.querySelector('input:checked')?.value || '';
      } else {
        answers[q.id] = block.querySelector('textarea')?.value || '';
      }
    });

    setSubmitting(true);
    try { await onSubmit(answers); }
    catch (err) { setSubmitError(err.message); }
    finally { setSubmitting(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="px-8 py-6">
      {survey.questions.map((q, idx) => (
        <div key={q.id} data-qid={q.id} className="py-6 border-b border-white/[0.06] last:border-0">
          <div className="flex items-start gap-3 mb-4">
            <span className="text-emerald-400 font-mono text-xs font-bold mt-1">{String(idx + 1).padStart(2, '0')}</span>
            <p className="font-semibold text-white leading-relaxed">
              {q.title}
              {q.required && <span className="text-red-400 text-xs ml-2">必填</span>}
              {survey.kind === 'exam' && q.points != null && <span className="text-white/40 text-xs ml-2">{q.points.toFixed(2).replace(/\.00$/, '')} 分</span>}
            </p>
          </div>
          {q.type === 'text' ? (
            <textarea rows={3} maxLength={10000} placeholder="请输入你的回答" required={q.required}
              className="w-full px-4 py-3 rounded-xl bg-white/[0.06] border border-white/10 text-white placeholder:text-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/30 focus:border-emerald-400/40 transition-all resize-none ml-6" />
          ) : (
            <div className="space-y-2 ml-6">
              {q.options.map((opt) => (
                <label key={opt} className="flex items-center gap-3 px-4 py-3 rounded-xl border border-white/10 hover:border-emerald-400/30 hover:bg-emerald-400/[0.06] cursor-pointer transition-all group">
                  <input type={q.type === 'single' ? 'radio' : 'checkbox'} name={`q_${q.id}`} value={opt}
                    required={q.required && q.type === 'single'} className="accent-emerald-400 w-4 h-4" />
                  <span className="text-white/80 text-sm group-hover:text-white transition-colors">{opt}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      ))}
      {submitError && <p className="text-red-400 text-sm bg-red-400/10 rounded-lg px-4 py-2 mt-2">{submitError}</p>}
      <div className="pt-5">
        <ShimmerButton type="submit" disabled={submitting} className="w-full">
          {submitting ? '正在提交…' : survey.kind === 'exam' ? '提交试卷' : '提交答卷'}
        </ShimmerButton>
      </div>
    </form>
  );
}
