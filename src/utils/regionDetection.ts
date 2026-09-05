export interface DetectedRegion {
  id: string;
  pixels: { x: number; y: number }[];
  centroid: { x: number; y: number };
  color: string;
  boundingBox: { x: number; y: number; width: number; height: number };
}

export interface DetectedEdge {
  source: string;
  target: string;
}

// Get pixel brightness (0-255)
function getBrightness(imageData: ImageData, x: number, y: number): number {
  const i = (y * imageData.width + x) * 4;
  return (imageData.data[i] + imageData.data[i + 1] + imageData.data[i + 2]) / 3;
}

// Check if pixel is dark (border/line)
function isDark(imageData: ImageData, x: number, y: number, threshold: number = 120): boolean {
  return getBrightness(imageData, x, y) < threshold;
}

// Check if pixel is light (white/near-white region)
function isLight(imageData: ImageData, x: number, y: number, threshold: number = 180): boolean {
  return getBrightness(imageData, x, y) > threshold;
}

// Flood fill to find white region
function floodFillWhite(
  imageData: ImageData,
  visited: boolean[],
  startX: number,
  startY: number
): { pixels: { x: number; y: number }[]; touchesEdge: boolean } {
  const width = imageData.width;
  const height = imageData.height;
  const pixels: { x: number; y: number }[] = [];
  const stack: { x: number; y: number }[] = [{ x: startX, y: startY }];
  let touchesEdge = false;

  while (stack.length > 0) {
    const { x, y } = stack.pop()!;
    const idx = y * width + x;

    if (x < 0 || x >= width || y < 0 || y >= height) continue;
    if (visited[idx]) continue;

    // Check if this pixel is dark (border)
    if (isDark(imageData, x, y, 120)) continue;

    // Check if pixel is light enough
    if (!isLight(imageData, x, y, 140)) continue;

    visited[idx] = true;
    pixels.push({ x, y });

    // Check if touches edge
    if (x <= 1 || x >= width - 2 || y <= 1 || y >= height - 2) {
      touchesEdge = true;
    }

    // 4-directional fill
    stack.push({ x: x + 1, y });
    stack.push({ x: x - 1, y });
    stack.push({ x, y: y + 1 });
    stack.push({ x, y: y - 1 });
  }

  return { pixels, touchesEdge };
}

// Find centroid of a region
function findCentroid(pixels: { x: number; y: number }[]): { x: number; y: number } {
  if (pixels.length === 0) return { x: 0, y: 0 };
  
  const sum = pixels.reduce(
    (acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }),
    { x: 0, y: 0 }
  );
  
  return {
    x: Math.round(sum.x / pixels.length),
    y: Math.round(sum.y / pixels.length),
  };
}

// Find bounding box
function findBoundingBox(pixels: { x: number; y: number }[]): {
  x: number;
  y: number;
  width: number;
  height: number;
} {
  if (pixels.length === 0) return { x: 0, y: 0, width: 0, height: 0 };
  
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  
  for (const p of pixels) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  
  return {
    x: minX,
    y: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  };
}

// Find boundary pixels of a region (pixels adjacent to dark/border pixels)
function findBoundaryPixels(
  pixels: { x: number; y: number }[],
  width: number,
  height: number,
  imageData: ImageData
): { x: number; y: number }[] {
  const boundary: { x: number; y: number }[] = [];
  
  for (const p of pixels) {
    // Check 4 neighbors
    const neighbors = [
      { x: p.x + 1, y: p.y },
      { x: p.x - 1, y: p.y },
      { x: p.x, y: p.y + 1 },
      { x: p.x, y: p.y - 1 },
    ];
    
    for (const n of neighbors) {
      // If neighbor is outside image or is a dark pixel, this is a boundary pixel
      if (n.x < 0 || n.x >= width || n.y < 0 || n.y >= height) {
        boundary.push(p);
        break;
      }
      if (isDark(imageData, n.x, n.y, 120)) {
        boundary.push(p);
        break;
      }
    }
  }
  
  return boundary;
}

// Check if two regions are adjacent by checking boundary proximity
function areRegionsAdjacent(
  r1: DetectedRegion,
  r2: DetectedRegion,
  boundary1: { x: number; y: number }[],
  boundary2: { x: number; y: number }[],
  threshold: number = 15
): boolean {
  // Quick bounding box check first
  const bb1 = r1.boundingBox;
  const bb2 = r2.boundingBox;
  
  // If bounding boxes don't overlap (with threshold), not adjacent
  if (bb1.x + bb1.width + threshold < bb2.x ||
      bb2.x + bb2.width + threshold < bb1.x ||
      bb1.y + bb1.height + threshold < bb2.y ||
      bb2.y + bb2.height + threshold < bb1.y) {
    return false;
  }
  
  // Check boundary pixels - more efficient than checking all pixels
  const b1 = boundary1.length > 200 ? boundary1.filter((_, i) => i % 4 === 0) : boundary1;
  const b2 = boundary2.length > 200 ? boundary2.filter((_, i) => i % 4 === 0) : boundary2;
  
  for (const p1 of b1) {
    for (const p2 of b2) {
      const dx = p1.x - p2.x;
      const dy = p1.y - p2.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < threshold) {
        return true;
      }
    }
  }
  
  return false;
}

// Main detection function - finds white blocks inside shapes
export function detectRegions(
  canvas: HTMLCanvasElement
): { regions: DetectedRegion[]; edges: DetectedEdge[] } {
  const ctx = canvas.getContext('2d');
  if (!ctx) return { regions: [], edges: [] };

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const width = canvas.width;
  const height = canvas.height;

  // Step 1: Find white regions using flood fill
  const visited = new Array(width * height).fill(false);
  const allRegions: DetectedRegion[] = [];
  let regionId = 0;

  // Scan every pixel to find white regions
  for (let y = 0; y < height; y += 2) {
    for (let x = 0; x < width; x += 2) {
      const idx = y * width + x;
      if (visited[idx]) continue;

      // Skip dark pixels (borders)
      if (isDark(imageData, x, y, 120)) continue;

      // Skip non-white pixels
      if (!isLight(imageData, x, y, 140)) continue;

      const result = floodFillWhite(imageData, visited, x, y);
      
      // Store all regions (including edge-touching ones)
      if (result.pixels.length >= 30) {
        allRegions.push({
          id: `region-${regionId++}`,
          pixels: result.pixels,
          centroid: findCentroid(result.pixels),
          color: 'white',
          boundingBox: findBoundingBox(result.pixels),
          touchesEdge: result.touchesEdge,
        } as DetectedRegion & { touchesEdge: boolean });
      }
    }
  }

  // Step 2: Filter out regions that touch the edge OR are too large (background)
  const regions: DetectedRegion[] = [];
  let newId = 0;
  
  // Find the largest region (likely background/outside)
  const largestRegion = allRegions.reduce((max, r) => 
    r.pixels.length > max.pixels.length ? r : max
  , allRegions[0]);
  
  // Calculate average region size
  const avgSize = allRegions.reduce((sum, r) => sum + r.pixels.length, 0) / allRegions.length;
  
  for (const region of allRegions) {
    // Skip if touches edge
    if ((region as any).touchesEdge) continue;
    
    // Skip if this is the largest region (likely background)
    if (region === largestRegion && region.pixels.length > avgSize * 5) continue;
    
    // Skip if region is way too large (background leaking through)
    if (region.pixels.length > 100000) continue;
    
    regions.push({
      ...region,
      id: `region-${newId++}`,
    });
  }

  // Step 3: Also find the main enclosed area and split it
  // If we didn't find enough regions, try a different approach
  if (regions.length < 3) {
    // Try to find regions by scanning for white areas not connected to edges
    const visited2 = new Array(width * height).fill(false);
    regions.length = 0;
    newId = 0;
    
    // First, mark all dark pixels as visited
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (isDark(imageData, x, y, 130)) {
          visited2[y * width + x] = true;
        }
      }
    }
    
    // Then find white regions
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const idx = y * width + x;
        if (visited2[idx]) continue;
        if (!isLight(imageData, x, y, 150)) continue;

        const result = floodFillWhite(imageData, visited2, x, y);
        
        if (result.pixels.length >= 20 && !result.touchesEdge) {
          regions.push({
            id: `region-${newId++}`,
            pixels: result.pixels,
            centroid: findCentroid(result.pixels),
            color: 'white',
            boundingBox: findBoundingBox(result.pixels),
          });
        }
      }
    }
  }

  // Step 4: Find boundary pixels for each region
  const regionBoundaries = regions.map(region => 
    findBoundaryPixels(region.pixels, width, height, imageData)
  );

  // Step 5: Detect adjacency between regions using boundary pixels
  const detectedEdges: DetectedEdge[] = [];
  
  for (let i = 0; i < regions.length; i++) {
    for (let j = i + 1; j < regions.length; j++) {
      if (areRegionsAdjacent(regions[i], regions[j], regionBoundaries[i], regionBoundaries[j], 15)) {
        detectedEdges.push({
          source: regions[i].id,
          target: regions[j].id,
        });
      }
    }
  }

  return { regions, edges: detectedEdges };
}

// Draw detected regions on canvas for preview
export function drawDetectedRegions(
  canvas: HTMLCanvasElement,
  regions: DetectedRegion[],
  selectedIds: Set<string>,
  edges: DetectedEdge[]
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw each region
  regions.forEach((region) => {
    const isSelected = selectedIds.has(region.id);
    
    // Draw region pixels
    ctx.fillStyle = isSelected ? 'rgba(139, 92, 246, 0.5)' : 'rgba(200, 200, 200, 0.3)';
    region.pixels.forEach((p) => {
      ctx.fillRect(p.x, p.y, 2, 2);
    });

    // Draw region number at centroid if selected
    if (isSelected) {
      const num = region.id.replace('region-', '');
      
      // Background circle
      ctx.beginPath();
      ctx.arc(region.centroid.x, region.centroid.y, 12, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(139, 92, 246, 0.9)';
      ctx.fill();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // Number
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 10px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(num, region.centroid.x, region.centroid.y);
    }
  });

  // Draw edges between selected regions
  ctx.strokeStyle = 'rgba(139, 92, 246, 0.6)';
  ctx.lineWidth = 2;
  
  edges.forEach((edge) => {
    if (!selectedIds.has(edge.source) || !selectedIds.has(edge.target)) return;
    
    const r1 = regions.find(r => r.id === edge.source);
    const r2 = regions.find(r => r.id === edge.target);
    if (!r1 || !r2) return;
    
    ctx.beginPath();
    ctx.moveTo(r1.centroid.x, r1.centroid.y);
    ctx.lineTo(r2.centroid.x, r2.centroid.y);
    ctx.stroke();
  });
}
