import { useGameStore } from '../../stores/gameStore';
import { GameBoard } from './GameBoard';
import { ColorPalette } from './ColorPalette';
import { Timer } from './Timer';
import { ErrorCounter } from './ErrorCounter';

export function GameScreen() {
  const { currentLevel, isCompleted, setScreen, resetLevel, errorCount, playerName, playerPhone, startTime, firstDrawTime, pauseTimes } = useGameStore();

  if (!currentLevel) return null;

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return m > 0 ? `${m}分${s}秒` : `${s}秒`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-4">
      <div className="max-w-2xl mx-auto overflow-hidden">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => setScreen('levelSelect')}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            ← 返回
          </button>
          <h1 className="text-2xl font-bold text-gray-800">
            {currentLevel.name}
          </h1>
          <button
            onClick={resetLevel}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            重置
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
            <h2 className="text-xl font-bold text-green-700 mb-4">
              關卡完成！
            </h2>
            <div className="bg-white rounded-lg p-4 mb-4 text-left space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">玩家：</span>
                <span className="font-medium text-gray-800">{playerName}</span>
              </div>
              {playerPhone && (
                <div className="flex justify-between">
                  <span className="text-gray-600">電話：</span>
                  <span className="font-medium text-gray-800">{playerPhone}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-600">完成時間：</span>
                <span className="font-medium text-gray-800">{formatTime(Math.floor((Date.now() - (startTime || Date.now())) / 1000))}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">錯誤次數：</span>
                <span className="font-medium text-gray-800">{errorCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">首次著色：</span>
                <span className="font-medium text-gray-800">
                  {firstDrawTime ? formatTime(Math.floor((firstDrawTime - (startTime || firstDrawTime)) / 1000)) : '0秒'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">平均停頓：</span>
                <span className="font-medium text-gray-800">
                  {pauseTimes.length > 0
                    ? formatTime(Math.round(pauseTimes.reduce((s, p) => s + p, 0) / pauseTimes.length / 1000))
                    : '0秒'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">最長停頓：</span>
                <span className="font-medium text-gray-800">
                  {pauseTimes.length > 0
                    ? formatTime(Math.round(Math.max(...pauseTimes) / 1000))
                    : '0秒'}
                </span>
              </div>
            </div>
            <button
              onClick={() => setScreen('levelSelect')}
              className="mt-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              繼續
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
