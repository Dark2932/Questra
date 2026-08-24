import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle2, Clock, FileQuestion } from 'lucide-react';
import { api } from '../api';
import Meteors from '../components/effects/Meteors';
import GridPattern from '../components/effects/GridPattern';
import GradientText from '../components/effects/GradientText';
import ShimmerButton from '../components/effects/ShimmerButton';
import SurveyForm from './SurveyForm';

export default function Survey() {
  const { id } = useParams();
  const [survey, setSurvey] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [examResult, setExamResult] = useState(null);

  useEffect(() => {
    api.getPublicSurvey(id).then(setSurvey).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }, [id]);

  const handleSubmit = async (answers) => {
    const result = await api.submitResponse(id, answers);
    if (result.score != null) setExamResult(result);
    setSubmitted(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading) return <div className="dark-gradient min-h-screen flex items-center justify-center"><div className="text-white/60 animate-pulse">正在加载…</div></div>;
  if (error) return (
    <div className="dark-gradient min-h-screen flex items-center justify-center p-6">
      <div className="text-center max-w-md"><div className="text-6xl mb-4">⚠️</div><h1 className="text-2xl font-bold text-white mb-2">无法加载问卷</h1><p className="text-white/60">{error}</p></div>
    </div>
  );

  return (
    <div className="dark-gradient min-h-screen relative overflow-hidden">
      <Meteors number={25} /><GridPattern />
      <div className="relative z-10 max-w-2xl mx-auto px-6 py-12 sm:py-20">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
          className="rounded-2xl border border-white/10 bg-white/[0.06] backdrop-blur-xl overflow-hidden">
          {!submitted ? (
            <>
              <header className="px-8 pt-8 pb-6 border-b border-white/10">
                <p className="text-emerald-400/80 text-xs font-bold tracking-widest uppercase mb-3">
                  {survey.siteName || 'Questra'} · {survey.kind === 'exam' ? '考试' : '问卷'}
                </p>
                <h1 className="text-2xl sm:text-3xl font-bold text-white leading-tight">{survey.title}</h1>
                {survey.description && <p className="text-white/50 mt-3 leading-relaxed whitespace-pre-wrap">{survey.description}</p>}
                <div className="flex items-center gap-5 mt-4 text-white/40 text-xs flex-wrap">
                  <span className="flex items-center gap-1.5"><FileQuestion className="w-3.5 h-3.5" /> {survey.questions.length} 道题</span>
                  {survey.kind === 'exam' && <span>满分 {survey.maxScore} 分</span>}
                  {survey.expiresAt && <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> 截止 {new Date(survey.expiresAt).toLocaleString('zh-CN', { hour12: false })}</span>}
                </div>
              </header>
              <SurveyForm survey={survey} onSubmit={handleSubmit} />
            </>
          ) : (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4 }}
              className="px-8 py-16 text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-400/10 flex items-center justify-center mx-auto mb-5">
                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
              </div>
              <GradientText className="text-3xl font-bold">{survey.kind === 'exam' ? '试卷已提交' : '感谢参与'}</GradientText>
              <p className="text-white/50 mt-3">{examResult ? `你的得分：${examResult.score} / ${examResult.maxScore} 分` : '你的答卷已成功提交。'}</p>
              {examResult && (
                <div className="mt-6 inline-flex items-baseline gap-2 bg-white/[0.06] rounded-xl px-8 py-4 border border-white/10">
                  <span className="text-4xl font-bold text-emerald-400">{examResult.score}</span>
                  <span className="text-white/40 text-lg">/ {examResult.maxScore} 分</span>
                </div>
              )}
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
