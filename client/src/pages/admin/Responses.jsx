import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { api } from '../../api';
import Card, { StatCard } from '../../components/ui/Card';
import Button from '../../components/ui/Button';

export default function Responses() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getSurveyResponses(id).then(setData).catch(() => {}).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="text-center py-20 text-gray-400 animate-pulse">正在加载…</div>;
  if (!data) return <div className="text-center py-20 text-gray-400">加载失败</div>;

  const { survey, responses } = data;
  const display = (v) => (Array.isArray(v) ? v.join('、') : v || '—');

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <Link to="/admin/surveys" className="inline-flex items-center gap-1 text-sm text-accent hover:underline mb-2">
            <ArrowLeft className="w-4 h-4" /> 返回问卷
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">{survey.title}</h1>
          <p className="text-gray-500 text-sm mt-1">回收数据</p>
        </div>
        <a href={`/s/${survey.id}`} target="_blank" rel="noopener noreferrer">
          <Button><ExternalLink className="w-4 h-4" /> 打开问卷</Button>
        </a>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatCard label={survey.kind === 'exam' ? '试卷总数' : '答卷总数'} value={responses.length} delay={0} />
        {survey.kind === 'exam' && (
          <StatCard
            label="平均分"
            value={
              responses.length
                ? (responses.reduce((s, r) => s + (r.score || 0), 0) / responses.length).toFixed(1)
                : '—'
            }
            delay={0.08}
          />
        )}
      </div>

      <Card hover={false}>
        <div className="mb-4">
          <h2 className="text-lg font-bold text-gray-900">
            {survey.kind === 'exam' ? '成绩明细' : '答卷明细'}
          </h2>
          <p className="text-sm text-gray-500">
            {survey.kind === 'exam'
              ? `满分 ${survey.maxScore} 分；多选题全对才得分。`
              : '多选答案使用顿号分隔展示。'}
          </p>
        </div>
        {responses.length === 0 ? (
          <div className="text-center py-12">
            <p className="font-semibold text-gray-500">暂时没有答卷</p>
            <p className="text-sm text-gray-400">分享问卷链接后，提交数据会出现在这里。</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 text-xs uppercase tracking-wide border-b border-gray-100">
                  <th className="pb-3 pr-4">提交时间</th>
                  {survey.questions.map((q) => (
                    <th key={q.id} className="pb-3 pr-4 max-w-[200px]">{q.title}</th>
                  ))}
                  {survey.kind === 'exam' && <th className="pb-3">得分</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {responses.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="py-3 pr-4 text-gray-400 text-xs whitespace-nowrap">
                      {r.submittedAt}
                    </td>
                    {survey.questions.map((q) => {
                      const ans = r.answers[q.id];
                      return (
                        <td key={q.id} className="py-3 pr-4 text-gray-600 max-w-[200px] truncate">
                          {ans ? display(ans.value) : '—'}
                        </td>
                      );
                    })}
                    {survey.kind === 'exam' && (
                      <td className="py-3 font-semibold text-gray-900">
                        {r.score != null ? `${r.score} / ${r.maxScore}` : '—'}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
