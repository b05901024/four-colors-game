export interface Node {
  id: string;
  x: number;
  y: number;
  label: string;
  color?: string;
}

export interface Edge {
  id: string;
  source: string;
  target: string;
}

export interface Level {
  id: string;
  name: string;
  imageUrl: string;
  nodes: Node[];
  edges: Edge[];
  difficulty: number;
  createdAt: number;
}

export interface Attempt {
  levelId: string;
  completed: boolean;
  timeSpent: number;
  errorCount: number;
  timestamp: number;
  firstDrawTime?: number;
  avgPauseTime?: number;
  maxPauseTime?: number;
}

export interface PlayerData {
  deviceId: string;
  attempts: Attempt[];
}

export type GameColor = '#E74C3C' | '#3498DB' | '#2ECC71' | '#F1C40F';

export const GAME_COLORS: GameColor[] = [
  '#E74C3C', // Red
  '#3498DB', // Blue
  '#2ECC71', // Green
  '#F1C40F', // Yellow
];

export type GameScreen = 'menu' | 'levelSelect' | 'playing' | 'editor' | 'manageLevels' | 'stats';

export interface GameState {
  currentLevel: Level | null;
  selectedColor: GameColor | null;
  nodeColors: Record<string, string>;
  startTime: number | null;
  errorCount: number;
  isCompleted: boolean;
  violations: string[];
}
