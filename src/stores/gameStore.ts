import { create } from 'zustand';
import { Level, GameColor, GameScreen, GAME_COLORS } from '../types';
import { findViolations, isLevelComplete } from '../utils/graphUtils';
import { getAllLevels, addLevel, updateLevel, deleteLevel, saveAttempt } from '../services/firebase';

interface GameStore {
  screen: GameScreen;
  levels: Level[];
  currentLevel: Level | null;
  selectedColor: GameColor;
  nodeColors: Record<string, string>;
  startTime: number | null;
  errorCount: number;
  isCompleted: boolean;
  violations: string[];
  loading: boolean;
  // Player info
  playerName: string;
  playerPhone: string;
  // Metrics
  firstDrawTime: number | null;
  lastDrawTime: number | null;
  pauseTimes: number[];
  setScreen: (screen: GameScreen) => void;
  setPlayerInfo: (name: string, phone: string) => void;
  loadLevels: () => Promise<void>;
  selectLevel: (level: Level) => void;
  selectColor: (color: GameColor) => void;
  colorNode: (nodeId: string) => void;
  resetLevel: () => void;
  completeLevel: () => void;
  createLevel: (level: Omit<Level, 'id'>) => Promise<string>;
  editLevel: (levelId: string, updates: Partial<Level>) => Promise<boolean>;
  removeLevel: (levelId: string) => Promise<boolean>;
}

export const useGameStore = create<GameStore>((set, get) => ({
  screen: 'menu',
  levels: [],
  currentLevel: null,
  selectedColor: GAME_COLORS[0],
  nodeColors: {},
  startTime: null,
  errorCount: 0,
  isCompleted: false,
  violations: [],
  loading: false,
  playerName: '',
  playerPhone: '',
  firstDrawTime: null,
  lastDrawTime: null,
  pauseTimes: [],

  setScreen: (screen) => set({ screen }),

  setPlayerInfo: (name, phone) => set({ playerName: name, playerPhone: phone }),

  loadLevels: async () => {
    set({ loading: true });
    const levels = await getAllLevels();
    set({ levels, loading: false });
  },

  selectLevel: (level) =>
    set({
      currentLevel: level,
      screen: 'playing',
      nodeColors: {},
      startTime: Date.now(),
      errorCount: 0,
      isCompleted: false,
      violations: [],
      firstDrawTime: null,
      lastDrawTime: null,
      pauseTimes: [],
    }),

  selectColor: (color) => set({ selectedColor: color }),

  colorNode: (nodeId) => {
    const state = get();
    const { currentLevel, selectedColor, nodeColors, violations } = state;
    if (!currentLevel || state.isCompleted) return;

    const newNodeColors = { ...nodeColors, [nodeId]: selectedColor };
    const newViolations = findViolations(
      currentLevel.edges,
      newNodeColors
    );

    // Count error if this action creates a violation
    const hasNewViolation = newViolations.length > violations.length;
    const errorCount = hasNewViolation ? state.errorCount + 1 : state.errorCount;

    // Track timing metrics
    const now = Date.now();
    let firstDrawTime = state.firstDrawTime;
    let lastDrawTime = state.lastDrawTime;
    const pauseTimes = [...state.pauseTimes];

    if (!firstDrawTime) {
      firstDrawTime = now;
    } else if (lastDrawTime) {
      const pause = now - lastDrawTime;
      if (pause > 500) {
        pauseTimes.push(pause);
      }
    }
    lastDrawTime = now;

    const completed = isLevelComplete(currentLevel.nodes, newNodeColors);

    set({
      nodeColors: newNodeColors,
      violations: newViolations,
      errorCount,
      isCompleted: completed,
      firstDrawTime,
      lastDrawTime,
      pauseTimes,
    });

    if (completed) {
      const timeSpent = Math.floor((now - (state.startTime || now)) / 1000);
      const totalPause = pauseTimes.reduce((sum, p) => sum + p, 0);
      const avgPause = pauseTimes.length > 0 ? Math.round(totalPause / pauseTimes.length / 1000) : 0;
      const maxPause = pauseTimes.length > 0 ? Math.round(Math.max(...pauseTimes) / 1000) : 0;
      const firstDrawSec = firstDrawTime ? Math.round((firstDrawTime - (state.startTime || firstDrawTime)) / 1000) : 0;

      saveAttempt({
        levelId: currentLevel.id,
        completed: true,
        timeSpent,
        errorCount,
        playerName: state.playerName,
        playerPhone: state.playerPhone || undefined,
        firstDrawTime: firstDrawSec,
        avgPauseTime: avgPause,
        maxPauseTime: maxPause,
      }).catch(err => console.error('Failed to save attempt:', err));
    }
  },

  resetLevel: () =>
    set({
      nodeColors: {},
      startTime: Date.now(),
      errorCount: 0,
      isCompleted: false,
      violations: [],
      firstDrawTime: null,
      lastDrawTime: null,
      pauseTimes: [],
    }),

  completeLevel: () => {
    set({ isCompleted: true });
  },

  createLevel: async (level) => {
    const id = await addLevel(level);
    await get().loadLevels();
    return id;
  },

  editLevel: async (levelId, updates) => {
    const success = await updateLevel(levelId, updates);
    if (success) {
      await get().loadLevels();
    }
    return success;
  },

  removeLevel: async (levelId) => {
    const success = await deleteLevel(levelId);
    if (success) {
      await get().loadLevels();
    }
    return success;
  },
}));
