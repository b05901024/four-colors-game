import { useState, useEffect } from 'react';
import { useGameStore } from '../../stores/gameStore';
import { onAuthChange, isOwner } from '../../services/firebase';

const DIFFICULTY_LABELS: Record<number, string> = {
  1: '★',
  2: '★★',
  3: '★★★',
  4: '★★★★',
  5: '★★★★★',
};

export function LevelSelect() {
  const { levels, selectLevel, setScreen } = useGameStore();
  const [owner, setOwner] = useState(false);
  const [filterDifficulty, setFilterDifficulty] = useState<number>(0);

  useEffect(() => {
    const unsub = onAuthChange(async (u) => {
      setOwner(await isOwner(u));
    });
    return unsub;
  }, []);

  const filteredLevels = filterDifficulty === 0
    ? levels
    : levels.filter(l => (l.difficulty || 1) === filterDifficulty);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => setScreen('menu')}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            ← 返回
          </button>
          <h1 className="text-2xl font-bold text-gray-800">選擇關卡</h1>
          <div className="w-20"></div>
        </div>

        {/* Difficulty Filter */}
        {levels.length > 0 && (
          <div className="flex gap-2 mb-4 flex-wrap justify-center">
            <button
              onClick={() => setFilterDifficulty(0)}
              className={`px-3 py-1 rounded-full text-sm ${
                filterDifficulty === 0
                  ? 'bg-purple-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-purple-100'
              }`}
            >
              全部
            </button>
            {[1, 2, 3, 4, 5].map((d) => (
              <button
                key={d}
                onClick={() => setFilterDifficulty(d)}
                className={`px-3 py-1 rounded-full text-sm ${
                  filterDifficulty === d
                    ? 'bg-purple-600 text-white'
                    : 'bg-white text-gray-600 hover:bg-purple-100'
                }`}
              >
                {DIFFICULTY_LABELS[d]}
              </button>
            ))}
          </div>
        )}

        {levels.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p className="text-lg mb-2">尚未建立關卡</p>
            {owner && (
              <button
                onClick={() => setScreen('editor')}
                className="text-purple-600 hover:text-purple-800 underline"
              >
                建立第一個關卡
              </button>
            )}
          </div>
        ) : filteredLevels.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p className="text-lg">此難度沒有關卡</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filteredLevels.map((level, index) => (
              <button
                key={level.id}
                onClick={() => selectLevel(level)}
                className="p-6 bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow text-left"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                    <span className="text-xl font-bold text-purple-600">
                      {index + 1}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800">{level.name}</h3>
                    <p className="text-sm text-amber-500">
                      {DIFFICULTY_LABELS[level.difficulty || 1]}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {owner && (
          <div className="mt-6 text-center">
            <button
              onClick={() => setScreen('editor')}
              className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              建立新關卡
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
