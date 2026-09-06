import { useState } from 'react';
import { useGameStore } from '../../stores/gameStore';
import { Level } from '../../types';
import { Editor } from '../Editor/Editor';

const DIFFICULTY_LABELS: Record<number, string> = {
  1: '★',
  2: '★★',
  3: '★★★',
  4: '★★★★',
  5: '★★★★★',
};

export function LevelManager() {
  const { levels, setScreen, removeLevel, loadLevels } = useGameStore();
  const [editingLevel, setEditingLevel] = useState<Level | null>(null);
  const [showEditor, setShowEditor] = useState(false);

  if (showEditor || editingLevel) {
    return (
      <Editor
        editingLevel={editingLevel}
        onClose={() => {
          setShowEditor(false);
          setEditingLevel(null);
          loadLevels();
        }}
      />
    );
  }

  const handleDelete = async (levelId: string, levelName: string) => {
    if (confirm(`確定要刪除「${levelName}」嗎？`)) {
      await removeLevel(levelId);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => setScreen('menu')}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            ← 返回
          </button>
          <h1 className="text-2xl font-bold text-gray-800">管理關卡</h1>
          <button
            onClick={() => setShowEditor(true)}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            + 新增關卡
          </button>
        </div>

        {levels.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl shadow-md">
            <p className="text-gray-500 text-lg mb-4">尚未建立關卡</p>
            <button
              onClick={() => setShowEditor(true)}
              className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              建立第一個關卡
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {levels.map((level) => (
              <div
                key={level.id}
                className="bg-white rounded-xl shadow-md p-4 flex items-center gap-4"
              >
                {level.imageUrl && (
                  <img
                    src={level.imageUrl}
                    alt={level.name}
                    className="w-20 h-16 object-cover rounded-lg"
                  />
                )}
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-800">{level.name}</h3>
                  <p className="text-sm text-gray-500">
                    {level.nodes.length} 區域 • {level.edges.length} 邊界
                  </p>
                  <p className="text-sm text-amber-500">
                    {DIFFICULTY_LABELS[level.difficulty || 1]}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditingLevel(level)}
                    className="px-4 py-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200"
                  >
                    編輯
                  </button>
                  <button
                    onClick={() => handleDelete(level.id, level.name)}
                    className="px-4 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200"
                  >
                    刪除
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
