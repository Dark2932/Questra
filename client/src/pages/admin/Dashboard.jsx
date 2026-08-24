import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, FileText, Activity, BarChart3 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../../api';
import Card, { StatCard } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getDashboard()
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-40 bg-gray-200 rounded" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-28 bg-gray-100 rounded-xl" />
          ))}
        </div>
        <div className="h-64 bg-gray-100 rounded-xl" />
        <div className="h-48 bg-gray-100 rounded-xl" />
      </div>
    );
  }

  if (!data) return null;
  const { totals, trend } = data;
  const maxCount = Math.max(1, ...trend.map((t) => t.count));

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold tracking-widest text-accent uppercase">OVERVIEW</p>
          <h1 className="text-3xl font-bold text-gray-900 mt-1">仪表盘</h1>
        </div>
        <Link to="/admin/surveys">
          <Button variant="primary" size="lg">
            新建问卷
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="题库题目" value={totals.questions} icon={BookOpen} delay={0} />
        <StatCard label="实例总数" value={totals.surveys} icon={FileText} delay={0.08} />
        <StatCard label="回收中" value={totals.active_surveys} icon={Activity} delay={0.16} />
        <StatCard label="答卷总数" value={totals.responses} icon={BarChart3} delay={0.24} />
      </div>

      <Card hover={false}>
        <h2 className="text-lg font-bold text-gray-900">近 7 日回收</h2>
        <p className="text-sm text-gray-500 mb-6">按答卷提交日期统计</p>
        <div className="flex items-end gap-3 h-48 px-2">
          {trend.map((item, i) => {
            const pct = item.count / maxCount;
            return (
              <div key={item.day} className="flex-1 flex flex-col items-center gap-2 min-w-0">
                <span className="text-xs font-semibold text-gray-500">{item.count}</span>
                <div className="w-full flex-1 flex items-end">
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${Math.max(item.count ? 8 : 3, pct * 100)}%` }}
                    transition={{ duration: 0.5, delay: i * 0.08, ease: 'easeOut' }}
                    className="w-full rounded-t-lg bg-gradient-to-t from-accent to-emerald-400 min-h-[4px]"
                  />
                </div>
                <span className="text-[11px] text-gray-400">{item.day.slice(5)}</span>
              </div>
            );
          })}
        </div>
      </Card>

      <Card hover={false}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-bold text-gray-900">最近实例</h2>
            <p className="text-sm text-gray-500">查看当前问卷和考试的回收进度</p>
          </div>
          <Link to="/admin/surveys" className="text-sm font-medium text-accent hover:underline">
            查看全部
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 text-xs uppercase tracking-wide border-b border-gray-100">
                <th className="pb-3 pr-4">实例</th>
                <th className="pb-3 pr-4">状态</th>
                <th className="pb-3 pr-4">题目</th>
                <th className="pb-3 pr-4">提交</th>
                <th className="pb-3 pr-4">创建时间</th>
                <th className="pb-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {(data.recentSurveys || []).length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-400">
                    还没有问卷，请先从问题池创建题目。
                  </td>
                </tr>
              )}
              {(data.recentSurveys || []).map((s) => (
                <tr key={s.id} className="hover:bg-gray-50/60 transition-colors">
                  <td className="py-3.5 pr-4">
                    <div className="font-semibold text-gray-900">{s.title}</div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {s.kind === 'exam' ? `考试 · ${s.max_score} 分` : '普通问卷'}
                    </div>
                  </td>
                  <td className="py-3.5 pr-4">
                    <Badge variant={s.status}>{s.status === 'active' ? '回收中' : '已关闭'}</Badge>
                  </td>
                  <td className="py-3.5 pr-4 text-gray-600">{s.question_count}</td>
                  <td className="py-3.5 pr-4 text-gray-600">{s.response_count}</td>
                  <td className="py-3.5 pr-4 text-gray-400 text-xs">
                    {s.created_at.replace('T', ' ').slice(0, 16)}
                  </td>
                  <td className="py-3.5">
                    <Link to={`/admin/surveys/${s.id}/responses`} className="text-accent font-medium text-sm hover:underline">
                      数据
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
