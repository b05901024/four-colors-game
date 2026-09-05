import { useEffect, useRef, useCallback, useState } from 'react';
import { useGameStore } from '../../stores/gameStore';

export function GameBoard() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const regionMapRef = useRef<Map<number, string>>(new Map());
  const [regionMapReady, setRegionMapReady] = useState(false);

  const {
    currentLevel,
    nodeColors,
    colorNode,
  } = useGameStore();

  const CANVAS_WIDTH = 500;
  const CANVAS_HEIGHT = 400;

  const buildRegionMap = useCallback(() => {
    if (!currentLevel || !imageRef.current) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = imageRef.current;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.drawImage(img, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    const imageData = ctx.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    function isBorder(x: number, y: number): boolean {
      const i = (y * CANVAS_WIDTH + x) * 4;
      const brightness = (imageData.data[i] + imageData.data[i + 1] + imageData.data[i + 2]) / 3;
      return brightness < 140;
    }

    const pixelMap = new Map<number, string>();
    const assigned = new Set<number>();

    for (const node of currentLevel.nodes) {
      const startX = Math.round(node.x);
      const startY = Math.round(node.y);

      if (startX < 0 || startX >= CANVAS_WIDTH || startY < 0 || startY >= CANVAS_HEIGHT) continue;

      const startIdx = startY * CANVAS_WIDTH + startX;
      if (assigned.has(startIdx)) continue;

      // Find nearest non-border pixel from centroid
      let sx = startX;
      let sy = startY;
      if (isBorder(sx, sy)) {
        let found = false;
        for (let r = 1; r <= 20 && !found; r++) {
          for (let dy = -r; dy <= r && !found; dy++) {
            for (let dx = -r; dx <= r && !found; dx++) {
              const nx = startX + dx;
              const ny = startY + dy;
              if (nx >= 0 && nx < CANVAS_WIDTH && ny >= 0 && ny < CANVAS_HEIGHT && !isBorder(nx, ny)) {
                sx = nx;
                sy = ny;
                found = true;
              }
            }
          }
        }
        if (!found) continue;
      }

      const stack = [{ x: sx, y: sy }];

      while (stack.length > 0) {
        const { x, y } = stack.pop()!;
        const idx = y * CANVAS_WIDTH + x;

        if (x < 0 || x >= CANVAS_WIDTH || y < 0 || y >= CANVAS_HEIGHT) continue;
        if (assigned.has(idx)) continue;
        if (isBorder(x, y)) continue;

        assigned.add(idx);
        pixelMap.set(idx, node.id);

        stack.push({ x: x + 1, y }, { x: x - 1, y }, { x, y: y + 1 }, { x, y: y - 1 });
      }
    }

    regionMapRef.current = pixelMap;
    console.log(`Region map: ${pixelMap.size} pixels, ${new Set(pixelMap.values()).size} regions`);
    setRegionMapReady(true);
  }, [currentLevel]);

  useEffect(() => {
    if (currentLevel?.imageUrl) {
      const img = new Image();
      img.onload = () => {
        imageRef.current = img;
        setTimeout(buildRegionMap, 100);
      };
      img.src = currentLevel.imageUrl;
    } else {
      imageRef.current = null;
      regionMapRef.current.clear();
      setRegionMapReady(false);
    }
  }, [currentLevel, buildRegionMap]);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !currentLevel) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (imageRef.current) {
      ctx.drawImage(imageRef.current, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    }

    if (regionMapReady && regionMapRef.current.size > 0) {
      const overlay = document.createElement('canvas');
      overlay.width = CANVAS_WIDTH;
      overlay.height = CANVAS_HEIGHT;
      const overlayCtx = overlay.getContext('2d');
      if (overlayCtx) {
        const imageData = overlayCtx.createImageData(CANVAS_WIDTH, CANVAS_HEIGHT);

        regionMapRef.current.forEach((nodeId, pixelIdx) => {
          const color = nodeColors[nodeId];
          if (color) {
            const i = pixelIdx * 4;
            const r = parseInt(color.slice(1, 3), 16);
            const g = parseInt(color.slice(3, 5), 16);
            const b = parseInt(color.slice(5, 7), 16);
            imageData.data[i] = r;
            imageData.data[i + 1] = g;
            imageData.data[i + 2] = b;
            imageData.data[i + 3] = 255;
          }
        });

        overlayCtx.putImageData(imageData, 0, 0);
        ctx.drawImage(overlay, 0, 0);
      }
    }
  }, [currentLevel, nodeColors, regionMapReady]);

  useEffect(() => {
    redraw();
  }, [redraw]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!currentLevel) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_WIDTH / rect.width;
    const scaleY = CANVAS_HEIGHT / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    const pixelIdx = Math.round(y) * CANVAS_WIDTH + Math.round(x);

    if (regionMapRef.current.has(pixelIdx)) {
      colorNode(regionMapRef.current.get(pixelIdx)!);
    }
  };

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_WIDTH}
      height={CANVAS_HEIGHT}
      onClick={handleCanvasClick}
      className="bg-white rounded-lg shadow-lg cursor-pointer max-w-full h-auto"
    />
  );
}
