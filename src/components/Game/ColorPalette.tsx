import { useGameStore } from '../../stores/gameStore';
import { GAME_COLORS, GameColor } from '../../types';

const colorNames: Record<GameColor, string> = {
  '#E74C3C': 'Red',
  '#3498DB': 'Blue',
  '#2ECC71': 'Green',
  '#F1C40F': 'Yellow',
};

export function ColorPalette() {
  const { selectedColor, selectColor, isCompleted } = useGameStore();

  return (
    <div className="flex gap-3 justify-center">
      {GAME_COLORS.map((color) => (
        <button
          key={color}
          onClick={() => selectColor(color)}
          disabled={isCompleted}
          className={`w-14 h-14 rounded-full transition-all ${
            selectedColor === color
              ? 'ring-4 ring-offset-2 ring-gray-400 scale-110'
              : 'hover:scale-105'
          } ${isCompleted ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          style={{ backgroundColor: color }}
          title={colorNames[color]}
        >
          <span className="sr-only">{colorNames[color]}</span>
        </button>
      ))}
    </div>
  );
}
