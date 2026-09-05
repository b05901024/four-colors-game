import { useGameStore } from '../../stores/gameStore';

export function ErrorCounter() {
  const { errorCount } = useGameStore();

  return (
    <div className="text-center">
      <p className="text-sm text-gray-500">Errors</p>
      <p className="text-2xl font-bold text-red-500">{errorCount}</p>
    </div>
  );
}
