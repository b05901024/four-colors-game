import { useGameStore } from '../../stores/gameStore';
import { GameBoard } from './GameBoard';
import { ColorPalette } from './ColorPalette';
import { Timer } from './Timer';
import { ErrorCounter } from './ErrorCounter';

export function GameScreen() {
  const { currentLevel, isCompleted, setScreen, resetLevel } = useGameStore();

  if (!currentLevel) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => setScreen('levelSelect')}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            ← Back
          </button>
          <h1 className="text-2xl font-bold text-gray-800">
            {currentLevel.name}
          </h1>
          <button
            onClick={resetLevel}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            Reset
          </button>
        </div>

        <div className="flex justify-center gap-8 mb-6">
          <Timer />
          <ErrorCounter />
        </div>

        <div className="flex justify-center mb-6">
          <GameBoard />
        </div>

        <div className="flex justify-center mb-6">
          <ColorPalette />
        </div>

        {isCompleted && (
          <div className="text-center p-6 bg-green-50 rounded-lg border-2 border-green-200">
            <h2 className="text-xl font-bold text-green-700 mb-2">
              Level Complete!
            </h2>
            <p className="text-green-600">
              You solved it with {useGameStore.getState().errorCount} errors
            </p>
            <button
              onClick={() => setScreen('levelSelect')}
              className="mt-4 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Continue
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
