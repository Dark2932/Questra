import Input from '../../components/ui/Input';

const typeLabels = { single: '单选', multiple: '多选', text: '文本' };

export default function ExamSettings({ scoringMode, setScoringMode, typeCounts, qScores, batchScore, maxScore }) {
  return (
    <div className="space-y-4 rounded-xl border border-orange-200 bg-orange-50/30 p-4">
      <h3 className="text-sm font-bold text-orange-700">考试设置</h3>
      <div className="space-y-2">
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input type="radio" name="scoringMode" value="weighted" checked={scoringMode === 'weighted'}
            onChange={() => setScoringMode('weighted')} className="accent-[#187a55]" /><span>满分与题型权重</span>
        </label>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input type="radio" name="scoringMode" value="per_question" checked={scoringMode === 'per_question'}
            onChange={() => setScoringMode('per_question')} className="accent-[#187a55]" /><span>逐题分值累加</span>
        </label>
      </div>
      {scoringMode === 'weighted' && (
        <div className="space-y-3">
          <Input label="考试满分" name="totalScore" type="number" min="0.01" step="0.01" defaultValue="100" />
          <fieldset className="space-y-2">
            <legend className="text-xs font-medium text-gray-600">题型权重（合计 100%）</legend>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {Object.keys(typeCounts).map((t) => (
                <div key={t} className="space-y-1">
                  <label className="text-xs text-gray-500">{typeLabels[t]}（{typeCounts[t]} 题）</label>
                  <div className="flex items-center gap-1">
                    <input name={`w_${t}`} type="number" min="0.01" step="0.01"
                      className="w-full h-8 px-2 rounded border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent" />
                    <span className="text-xs text-gray-400">%</span>
                  </div>
                </div>
              ))}
            </div>
          </fieldset>
        </div>
      )}
      {scoringMode === 'per_question' && (
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            {Object.keys(typeCounts).map((t) => (
              <div key={t} className="flex items-center gap-2 bg-white rounded-lg border border-gray-200 px-3 py-1.5">
                <span className="text-xs text-gray-500">{typeLabels[t]}</span>
                <input type="number" min="0.01" step="0.01" placeholder="分" id={`batch_${t}`}
                  className="w-16 h-7 px-2 rounded border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent" />
                <button type="button" className="text-xs text-accent font-medium hover:underline"
                  onClick={() => batchScore(t, document.getElementById(`batch_${t}`).value)}>应用</button>
              </div>
            ))}
          </div>
          <p className="text-sm text-gray-600">当前满分：<strong className="text-gray-900">{maxScore.toFixed(2).replace(/\.00$/, '')}</strong> 分</p>
        </div>
      )}
    </div>
  );
}
