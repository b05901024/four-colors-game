import { useGameStore } from '../../stores/gameStore';

export function StatsScreen() {
  const { setScreen } = useGameStore();

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
          <h1 className="text-2xl font-bold text-gray-800">Game Stats</h1>
          <div className="w-20"></div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <p className="text-gray-500 text-lg">
            Stats will be available after deployment.
          </p>
        </div>
      </div>
    </div>
  );
}
