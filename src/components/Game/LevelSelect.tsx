import { useState, useEffect } from 'react';
import { useGameStore } from '../../stores/gameStore';
import { onAuthChange, isOwner } from '../../services/firebase';

export function LevelSelect() {
  const { levels, selectLevel, setScreen } = useGameStore();
  const [owner, setOwner] = useState(false);

  useEffect(() => {
    const unsub = onAuthChange(async (u) => {
      setOwner(await isOwner(u));
    });
    return unsub;
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => setScreen('menu')}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            ← Back
          </button>
          <h1 className="text-2xl font-bold text-gray-800">Select Level</h1>
          <div className="w-20"></div>
        </div>

        {levels.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p className="text-lg mb-2">No levels yet</p>
            {owner && (
              <button
                onClick={() => setScreen('editor')}
                className="text-purple-600 hover:text-purple-800 underline"
              >
                Create the first level
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {levels.map((level, index) => (
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
              Create New Level
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
