# Four Colors Game

A graph coloring game based on the Four Color Theorem, built as a Progressive Web App (PWA).

## Features

- **Game Player**: Color graph nodes with 4 colors, ensuring no adjacent nodes share the same color
- **Level Editor**: Create custom levels with visual node and edge placement
- **Data Collection**: Track time and errors per level
- **PWA**: Installable on mobile devices, works offline

## Tech Stack

- React + TypeScript
- Vite
- Tailwind CSS
- Zustand (state management)
- Firebase (data collection)

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. (Optional) Set up Firebase for data collection:
   - Create a Firebase project at https://console.firebase.google.com/
   - Copy your config to `.env` (see `.env.example`)

3. Start development server:
   ```bash
   npm run dev
   ```

4. Build for production:
   ```bash
   npm run build
   ```

## Deployment to GitHub Pages

1. Build the project:
   ```bash
   npm run build
   ```

2. Deploy using GitHub Actions or manually push the `dist` folder

## Game Rules

1. Select a color from the palette (Red, Blue, Green, Yellow)
2. Click on nodes to apply the color
3. Ensure no adjacent nodes (connected by an edge) have the same color
4. Complete the level with 0 violations

## Level Editor

1. Click "Add Node" and click on the canvas to place nodes
2. Click "Add Edge" and click two nodes to connect them
3. Export your level as JSON

## License

MIT
