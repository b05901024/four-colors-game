import { useEffect } from 'react';
import { useGameStore } from './stores/gameStore';
import { MainMenu } from './components/UI/MainMenu';
import { LevelSelect } from './components/Game/LevelSelect';
import { GameScreen } from './components/Game/GameScreen';
import { LevelManager } from './components/Game/LevelManager';
import { StatsScreen } from './components/Game/StatsScreen';
import { Editor } from './components/Editor/Editor';

function App() {
  const { screen, loadLevels } = useGameStore();

  useEffect(() => {
    loadLevels();
  }, [loadLevels]);

  switch (screen) {
    case 'menu':
      return <MainMenu />;
    case 'levelSelect':
      return <LevelSelect />;
    case 'playing':
      return <GameScreen />;
    case 'editor':
      return <Editor />;
    case 'manageLevels':
      return <LevelManager />;
    case 'stats':
      return <StatsScreen />;
    default:
      return <MainMenu />;
  }
}

export default App;
