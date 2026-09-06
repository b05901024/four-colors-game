import { useEffect, useState } from 'react';
import { useGameStore } from '../../stores/gameStore';

export function Timer() {
  const { startTime, isCompleted } = useGameStore();
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!startTime || isCompleted) return;

    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime, isCompleted]);

  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;

  return (
    <div className="text-center">
      <p className="text-sm text-gray-500">時間</p>
      <p className="text-2xl font-bold text-gray-800">
        {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
      </p>
    </div>
  );
}
