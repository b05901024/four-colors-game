import { useEffect, useState } from 'react';
import { useGameStore } from '../../stores/gameStore';
import { getAttempts } from '../../services/firebase';

interface Attempt {
  id: string;
  levelId: string;
  completed: boolean;
  timeSpent: number;
  errorCount: number;
  firstDrawTime?: number;
  avgPauseTime?: number;
  maxPauseTime?: number;
  timestamp?: any;
}

export function StatsScreen() {
  const { setScreen, levels } = useGameStore();
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAttempts();
  }, []);

  const loadAttempts = async () => {
    setLoading(true);
    const data = await getAttempts();
    setAttempts(data);
    setLoading(false);
  };

  const completedAttempts = attempts.filter(a => a.completed);

  const getLevelName = (levelId: string) => {
    const level = levels.find(l => l.id === levelId);
    return level?.name || levelId;
  };

  const avgTime = completedAttempts.length > 0
    ? Math.round(completedAttempts.reduce((s, a) => s + a.timeSpent, 0) / completedAttempts.length)
    : 0;

  const avgErrors = completedAttempts.length > 0
    ? (completedAttempts.reduce((s, a) => s + a.errorCount, 0) / completedAttempts.length).toFixed(1)
    : '0';

  const avgFirstDraw = completedAttempts.length > 0
    ? Math.round(completedAttempts.reduce((s, a) => s + (a.firstDrawTime || 0), 0) / completedAttempts.length)
    : 0;

  const avgPause = completedAttempts.length > 0
    ? Math.round(completedAttempts.reduce((s, a) => s + (a.avgPauseTime || 0), 0) / completedAttempts.length)
    : 0;

  const maxPause = completedAttempts.length > 0
    ? Math.round(Math.max(...completedAttempts.map(a => a.maxPauseTime || 0)))
    : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-4">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <button onClick={() => setScreen('menu')} className="px-4 py-2 text-gray-600 hover:text-gray-800">← 返回</button>
            <h1 className="text-2xl font-bold text-gray-800">遊戲統計</h1>
            <div className="w-20"></div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <p className="text-gray-500">載入中...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => setScreen('menu')} className="px-4 py-2 text-gray-600 hover:text-gray-800">← 返回</button>
          <h1 className="text-2xl font-bold text-gray-800">遊戲統計</h1>
          <button onClick={loadAttempts} className="px-4 py-2 text-purple-600 hover:text-purple-800">重新整理</button>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-md p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">{completedAttempts.length}</div>
            <div className="text-xs text-gray-500">已完成</div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{avgTime}秒</div>
            <div className="text-xs text-gray-500">平均時間</div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4 text-center">
            <div className="text-2xl font-bold text-red-600">{avgErrors}</div>
            <div className="text-xs text-gray-500">平均錯誤</div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{avgFirstDraw}秒</div>
            <div className="text-xs text-gray-500">首次著色</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-md p-4 text-center">
            <div className="text-2xl font-bold text-amber-600">{avgPause}秒</div>
            <div className="text-xs text-gray-500">平均停頓</div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4 text-center">
            <div className="text-2xl font-bold text-red-600">{maxPause}秒</div>
            <div className="text-xs text-gray-500">最長停頓</div>
          </div>
        </div>

        {/* Attempt History */}
        <div className="bg-white rounded-lg shadow-md p-4">
          <h3 className="font-semibold text-gray-800 mb-3">最近遊玩紀錄</h3>
          {completedAttempts.length === 0 ? (
            <p className="text-gray-500 text-sm">尚無完成紀錄。</p>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b">
                    <th className="pb-2">關卡</th>
                    <th className="pb-2">時間</th>
                    <th className="pb-2">錯誤</th>
                    <th className="pb-2">首次著色</th>
                    <th className="pb-2">平均停頓</th>
                    <th className="pb-2">最長停頓</th>
                  </tr>
                </thead>
                <tbody>
                  {completedAttempts.map((attempt) => (
                    <tr key={attempt.id} className="border-b last:border-b-0">
                      <td className="py-2 text-gray-700">{getLevelName(attempt.levelId)}</td>
                      <td className="py-2">{attempt.timeSpent}秒</td>
                      <td className="py-2">{attempt.errorCount}</td>
                      <td className="py-2">{attempt.firstDrawTime || 0}秒</td>
                      <td className="py-2">{attempt.avgPauseTime || 0}秒</td>
                      <td className="py-2">{attempt.maxPauseTime || 0}秒</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Export */}
        <div className="mt-4">
          <button
            onClick={() => {
              const data = JSON.stringify(completedAttempts, null, 2);
              const blob = new Blob([data], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'four-colors-stats.json';
              a.click();
              URL.revokeObjectURL(url);
            }}
            className="w-full px-4 py-2 bg-purple-100 text-purple-600 rounded-lg hover:bg-purple-200"
          >
            匯出資料 (JSON)
          </button>
        </div>
      </div>
    </div>
  );
}
