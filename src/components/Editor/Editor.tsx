import { useState, useRef, useEffect, useCallback } from 'react';
import { useGameStore } from '../../stores/gameStore';
import { Node, Edge, Level } from '../../types';
import {
  detectRegions,
  drawDetectedRegions,
  DetectedRegion,
  DetectedEdge,
} from '../../utils/regionDetection';

interface EditorProps {
  editingLevel?: Level | null;
  onClose?: () => void;
}

type EditorMode = 'edit' | 'detect';
type EditTool = 'node' | 'edge' | 'deleteEdge' | 'select';

export function Editor({ editingLevel, onClose }: EditorProps) {
  const { setScreen, createLevel, editLevel } = useGameStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const originalImageRef = useRef<HTMLImageElement | null>(null);

  const [mode, setMode] = useState<EditorMode>(editingLevel ? 'edit' : 'detect');
  const [levelName, setLevelName] = useState(editingLevel?.name || 'New Level');
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');
  const [saveProgress, setSaveProgress] = useState(0);

  // Track if detection has been confirmed (to show edit tools)
  const [hasConfirmedDetection, setHasConfirmedDetection] = useState(!!editingLevel);

  // Track image load for triggering redraws
  const [imageLoaded, setImageLoaded] = useState(0);

  // Manual edit state
  const [nodes, setNodes] = useState<Node[]>(editingLevel?.nodes || []);
  const [edges, setEdges] = useState<Edge[]>(editingLevel?.edges || []);
  const [tool, setTool] = useState<EditTool>('select');
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<string | null>(null);
  const [nextNodeId, setNextNodeId] = useState(
    editingLevel ? editingLevel.nodes.length + 1 : 1
  );
  const [nextEdgeId, setNextEdgeId] = useState(
    editingLevel ? editingLevel.edges.length + 1 : 1
  );
  const [edgeStart, setEdgeStart] = useState<string | null>(null);
  const [hasImage, setHasImage] = useState<boolean>(!!editingLevel?.imageUrl);

  // Crop state
  const [isCropping, setIsCropping] = useState(false);
  const [cropStart, setCropStart] = useState<{ x: number; y: number } | null>(null);
  const [cropEnd, setCropEnd] = useState<{ x: number; y: number } | null>(null);
  const [isDraggingCrop, setIsDraggingCrop] = useState(false);

  // Detection state
  const [detectedRegions, setDetectedRegions] = useState<DetectedRegion[]>([]);
  const [detectedEdges, setDetectedEdges] = useState<DetectedEdge[]>([]);
  const [selectedRegionIds, setSelectedRegionIds] = useState<Set<string>>(new Set());
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectionStatus, setDetectionStatus] = useState('');

  const CANVAS_WIDTH = 500;
  const CANVAS_HEIGHT = 400;

  // Draw main canvas - ONLY for edit mode
  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !originalImageRef.current) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw background
    ctx.fillStyle = '#F3F4F6';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw background image
    const img = originalImageRef.current;
    const ratio = Math.min(CANVAS_WIDTH / img.width, CANVAS_HEIGHT / img.height);
    const newWidth = img.width * ratio;
    const newHeight = img.height * ratio;
    const x = (CANVAS_WIDTH - newWidth) / 2;
    const y = (CANVAS_HEIGHT - newHeight) / 2;
    ctx.drawImage(img, x, y, newWidth, newHeight);

    // Draw edges
    edges.forEach((edge) => {
      const source = nodes.find((n) => n.id === edge.source);
      const target = nodes.find((n) => n.id === edge.target);
      if (!source || !target) return;

      ctx.beginPath();
      ctx.moveTo(source.x, source.y);
      ctx.lineTo(target.x, target.y);
      ctx.strokeStyle = edge.id === selectedEdge ? '#EF4444' : '#8B5CF6';
      ctx.lineWidth = edge.id === selectedEdge ? 4 : 2;
      ctx.stroke();
    });

    // Draw nodes
    nodes.forEach((node) => {
      ctx.beginPath();
      ctx.arc(node.x, node.y, 15, 0, Math.PI * 2);
      if (node.id === selectedNode || node.id === edgeStart) {
        ctx.fillStyle = '#8B5CF6';
      } else {
        ctx.fillStyle = 'rgba(139, 92, 246, 0.7)';
      }
      ctx.fill();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2;
      ctx.stroke();
    });

    // Draw crop overlay ONLY if actively cropping
    if (isCropping && cropStart && cropEnd) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      const cropX = Math.min(cropStart.x, cropEnd.x);
      const cropY = Math.min(cropStart.y, cropEnd.y);
      const cropW = Math.abs(cropEnd.x - cropStart.x);
      const cropH = Math.abs(cropEnd.y - cropStart.y);

      // Draw the clear area
      ctx.drawImage(img, x, y, newWidth, newHeight);

      // Draw crop border
      ctx.strokeStyle = '#8B5CF6';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(cropX, cropY, cropW, cropH);
      ctx.setLineDash([]);
    }
  }, [nodes, edges, selectedNode, selectedEdge, edgeStart, isCropping, cropStart, cropEnd, imageLoaded]);

  useEffect(() => {
    if (mode === 'edit' || isCropping) {
      redraw();
    } else if (mode === 'detect' && originalImageRef.current) {
      // Draw image on previewCanvasRef for detect mode
      const canvas = previewCanvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.fillStyle = '#F3F4F6';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          const img = originalImageRef.current;
          const ratio = Math.min(CANVAS_WIDTH / img.width, CANVAS_HEIGHT / img.height);
          const newWidth = img.width * ratio;
          const newHeight = img.height * ratio;
          const x = (CANVAS_WIDTH - newWidth) / 2;
          const y = (CANVAS_HEIGHT - newHeight) / 2;
          ctx.drawImage(img, x, y, newWidth, newHeight);
        }
      }
    }
  }, [redraw, mode, isCropping, imageLoaded]);

  // Load editing level image
  useEffect(() => {
    if (editingLevel?.imageUrl) {
      const img = new Image();
      img.onload = () => {
        originalImageRef.current = img;
        setHasImage(true);
        setImageLoaded(prev => prev + 1);
      };
      img.src = editingLevel.imageUrl;
    }
  }, [editingLevel]);

  // Draw detection preview
  useEffect(() => {
    if (mode === 'detect' && previewCanvasRef.current) {
      if (detectedRegions.length > 0) {
        drawDetectedRegions(previewCanvasRef.current, detectedRegions, selectedRegionIds, detectedEdges);
      } else if (originalImageRef.current) {
        const ctx = previewCanvasRef.current.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
          ctx.fillStyle = '#F3F4F6';
          ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
          const img = originalImageRef.current;
          const ratio = Math.min(CANVAS_WIDTH / img.width, CANVAS_HEIGHT / img.height);
          const newWidth = img.width * ratio;
          const newHeight = img.height * ratio;
          const x = (CANVAS_WIDTH - newWidth) / 2;
          const y = (CANVAS_HEIGHT - newHeight) / 2;
          ctx.drawImage(img, x, y, newWidth, newHeight);
        }
      }
    }
  }, [mode, detectedRegions, selectedRegionIds, detectedEdges]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isCropping) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (tool === 'node') {
      const label = String.fromCharCode(64 + nextNodeId);
      setNodes([...nodes, { id: `n${nextNodeId}`, x, y, label }]);
      setNextNodeId(nextNodeId + 1);
    } else if (tool === 'edge') {
      const clickedNode = nodes.find((node) => {
        const dist = Math.sqrt((x - node.x) ** 2 + (y - node.y) ** 2);
        return dist <= 15;
      });

      if (clickedNode) {
        if (!edgeStart) {
          setEdgeStart(clickedNode.id);
        } else if (edgeStart !== clickedNode.id) {
          const exists = edges.some(
            (e) =>
              (e.source === edgeStart && e.target === clickedNode.id) ||
              (e.source === clickedNode.id && e.target === edgeStart)
          );
          if (!exists) {
            setEdges([
              ...edges,
              { id: `e${nextEdgeId}`, source: edgeStart, target: clickedNode.id },
            ]);
            setNextEdgeId(nextEdgeId + 1);
          }
          setEdgeStart(null);
        }
      }
    } else if (tool === 'deleteEdge') {
      // Find closest edge to click point
      let closestEdge: Edge | null = null;
      let minDist = 15; // Max distance to select edge

      for (const edge of edges) {
        const source = nodes.find((n) => n.id === edge.source);
        const target = nodes.find((n) => n.id === edge.target);
        if (!source || !target) continue;

        // Calculate distance from point to line segment
        const dx = target.x - source.x;
        const dy = target.y - source.y;
        const len2 = dx * dx + dy * dy;
        let t = ((x - source.x) * dx + (y - source.y) * dy) / len2;
        t = Math.max(0, Math.min(1, t));
        const projX = source.x + t * dx;
        const projY = source.y + t * dy;
        const dist = Math.sqrt((x - projX) ** 2 + (y - projY) ** 2);

        if (dist < minDist) {
          minDist = dist;
          closestEdge = edge;
        }
      }

      if (closestEdge) {
        setEdges(edges.filter((e) => e.id !== closestEdge!.id));
        setSelectedEdge(null);
      }
    } else if (tool === 'select') {
      // Check if clicked on a node
      const clickedNode = nodes.find((node) => {
        const dist = Math.sqrt((x - node.x) ** 2 + (y - node.y) ** 2);
        return dist <= 15;
      });

      if (clickedNode) {
        setSelectedNode(clickedNode.id);
        setSelectedEdge(null);
        return;
      }

      // Check if clicked on an edge
      let clickedEdge: Edge | null = null;
      let minDist = 10;

      for (const edge of edges) {
        const source = nodes.find((n) => n.id === edge.source);
        const target = nodes.find((n) => n.id === edge.target);
        if (!source || !target) continue;

        const dx = target.x - source.x;
        const dy = target.y - source.y;
        const len2 = dx * dx + dy * dy;
        let t = ((x - source.x) * dx + (y - source.y) * dy) / len2;
        t = Math.max(0, Math.min(1, t));
        const projX = source.x + t * dx;
        const projY = source.y + t * dy;
        const dist = Math.sqrt((x - projX) ** 2 + (y - projY) ** 2);

        if (dist < minDist) {
          minDist = dist;
          clickedEdge = edge;
        }
      }

      setSelectedNode(null);
      setSelectedEdge(clickedEdge?.id || null);
    }
  };

  // Crop handling
  const handleCropMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isCropping) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setCropStart({ x, y });
    setCropEnd({ x, y });
    setIsDraggingCrop(true);
  };

  const handleCropMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDraggingCrop || !isCropping) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = Math.max(0, Math.min(CANVAS_WIDTH, e.clientX - rect.left));
    const y = Math.max(0, Math.min(CANVAS_HEIGHT, e.clientY - rect.top));

    setCropEnd({ x, y });
  };

  const handleCropMouseUp = () => {
    setIsDraggingCrop(false);
  };

  const handleStartCrop = () => {
    setIsCropping(true);
    setCropStart(null);
    setCropEnd(null);
  };

  const handleApplyCrop = () => {
    if (!cropStart || !cropEnd || !originalImageRef.current) {
      setIsCropping(false);
      setCropStart(null);
      setCropEnd(null);
      return;
    }

    const img = originalImageRef.current;
    const imgRatio = Math.min(CANVAS_WIDTH / img.width, CANVAS_HEIGHT / img.height);
    const drawnWidth = img.width * imgRatio;
    const drawnHeight = img.height * imgRatio;
    const imgOffsetX = (CANVAS_WIDTH - drawnWidth) / 2;
    const imgOffsetY = (CANVAS_HEIGHT - drawnHeight) / 2;

    const cropX = Math.min(cropStart.x, cropEnd.x);
    const cropY = Math.min(cropStart.y, cropEnd.y);
    const cropW = Math.abs(cropEnd.x - cropStart.x);
    const cropH = Math.abs(cropEnd.y - cropStart.y);

    const srcX = (cropX - imgOffsetX) / imgRatio;
    const srcY = (cropY - imgOffsetY) / imgRatio;
    const srcW = cropW / imgRatio;
    const srcH = cropH / imgRatio;

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = CANVAS_WIDTH;
    tempCanvas.height = CANVAS_HEIGHT;
    const tempCtx = tempCanvas.getContext('2d');
    if (tempCtx) {
      tempCtx.fillStyle = '#FFFFFF';
      tempCtx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      tempCtx.drawImage(
        img,
        Math.max(0, srcX), Math.max(0, srcY), srcW, srcH,
        0, 0, CANVAS_WIDTH, CANVAS_HEIGHT
      );

      const croppedImage = new Image();
      croppedImage.onload = () => {
        originalImageRef.current = croppedImage;
        setIsCropping(false);
        setCropStart(null);
        setCropEnd(null);
        setImageLoaded(prev => prev + 1);
      };
      croppedImage.src = tempCanvas.toDataURL('image/png');
    }
  };

  const handleCancelCrop = () => {
    setIsCropping(false);
    setCropStart(null);
    setCropEnd(null);
    redraw();
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        originalImageRef.current = img;
        setHasImage(true);
        setIsCropping(false);
        setCropStart(null);
        setCropEnd(null);
        // Switch to detect mode when new image uploaded
        setMode('detect');
        setHasConfirmedDetection(false);
        setImageLoaded(prev => prev + 1);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Region detection
  const handleDetectRegions = async () => {
    if (!originalImageRef.current) {
      setDetectionStatus('No image loaded');
      return;
    }

    setIsDetecting(true);
    setDetectionStatus('Loading image for detection...');
    setDetectedRegions([]);
    setDetectedEdges([]);

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = CANVAS_WIDTH;
    tempCanvas.height = CANVAS_HEIGHT;
    const tempCtx = tempCanvas.getContext('2d');
    
    if (!tempCtx) {
      setDetectionStatus('Failed to create canvas');
      setIsDetecting(false);
      return;
    }

    tempCtx.fillStyle = '#FFFFFF';
    tempCtx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    const img = originalImageRef.current;
    const ratio = Math.min(CANVAS_WIDTH / img.width, CANVAS_HEIGHT / img.height);
    const newWidth = img.width * ratio;
    const newHeight = img.height * ratio;
    const x = (CANVAS_WIDTH - newWidth) / 2;
    const y = (CANVAS_HEIGHT - newHeight) / 2;
    tempCtx.drawImage(img, x, y, newWidth, newHeight);

    setDetectionStatus('Analyzing image...');

    await new Promise((r) => setTimeout(r, 100));

    try {
      const { regions, edges } = detectRegions(tempCanvas);
      
      setDetectedRegions(regions);
      setDetectedEdges(edges);
      setSelectedRegionIds(new Set(regions.map((r) => r.id)));
      
      if (regions.length === 0) {
        setDetectionStatus('No white regions found. The image needs clear dark borders separating white areas.');
      } else {
        setDetectionStatus(`Found ${regions.length} regions with ${edges.length} connections`);
      }
    } catch (error) {
      console.error('Detection failed:', error);
      setDetectionStatus('Detection failed. Error: ' + (error as Error).message);
    }
    
    setIsDetecting(false);
  };

  const handleToggleRegion = (regionId: string) => {
    setSelectedRegionIds((prev) => {
      const next = new Set(prev);
      if (next.has(regionId)) {
        next.delete(regionId);
      } else {
        next.add(regionId);
      }
      return next;
    });
  };

  const handleSelectAllRegions = () => {
    setSelectedRegionIds(new Set(detectedRegions.map((r) => r.id)));
  };

  const handleDeselectAllRegions = () => {
    setSelectedRegionIds(new Set());
  };

  const handleConfirmDetection = () => {
    const selectedRegions = detectedRegions.filter((r) => selectedRegionIds.has(r.id));
    const regionIdMap = new Map<string, string>();

    const newNodes: Node[] = selectedRegions.map((region, index) => {
      const nodeId = `n${index + 1}`;
      regionIdMap.set(region.id, nodeId);
      return {
        id: nodeId,
        x: region.centroid.x,
        y: region.centroid.y,
        label: `${index + 1}`,
      };
    });

    const newEdges: Edge[] = detectedEdges
      .filter(
        (e) => selectedRegionIds.has(e.source) && selectedRegionIds.has(e.target)
      )
      .map((e, index) => ({
        id: `e${index + 1}`,
        source: regionIdMap.get(e.source) || '',
        target: regionIdMap.get(e.target) || '',
      }))
      .filter((e) => e.source && e.target);

    setNodes(newNodes);
    setEdges(newEdges);
    setNextNodeId(newNodes.length + 1);
    setNextEdgeId(newEdges.length + 1);
    setHasConfirmedDetection(true);
    setMode('edit');
    setTool('select');
    setSelectedNode(null);
    setSelectedEdge(null);
  };

  const handleSave = async () => {
    if (!levelName.trim()) {
      alert('Please enter a level name');
      return;
    }

    setSaving(true);
    setSaveProgress(5);
    setSaveStatus('Preparing image...');

    let imageUrl = '';
    if (originalImageRef.current && hasImage) {
      // Draw ONLY the image to a clean canvas (no nodes/edges)
      const cleanCanvas = document.createElement('canvas');
      cleanCanvas.width = CANVAS_WIDTH;
      cleanCanvas.height = CANVAS_HEIGHT;
      const cleanCtx = cleanCanvas.getContext('2d');
      if (cleanCtx) {
        cleanCtx.fillStyle = '#FFFFFF';
        cleanCtx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        const img = originalImageRef.current;
        const ratio = Math.min(CANVAS_WIDTH / img.width, CANVAS_HEIGHT / img.height);
        const newWidth = img.width * ratio;
        const newHeight = img.height * ratio;
        const x = (CANVAS_WIDTH - newWidth) / 2;
        const y = (CANVAS_HEIGHT - newHeight) / 2;
        cleanCtx.drawImage(img, x, y, newWidth, newHeight);
        imageUrl = cleanCanvas.toDataURL('image/png');
      }
    }

    setSaveProgress(30);
    setSaveStatus('Building level data...');
    await new Promise(r => setTimeout(r, 30));

    const levelData = {
      name: levelName,
      imageUrl,
      nodes,
      edges,
      createdAt: editingLevel?.createdAt || Date.now(),
    };

    setSaveProgress(50);
    setSaveStatus('Serializing data...');
    await new Promise(r => setTimeout(r, 30));

    const dataSize = JSON.stringify(levelData).length;
    console.log('Level data size:', (dataSize / 1024).toFixed(1), 'KB');

    setSaveProgress(70);
    setSaveStatus('Writing to storage...');
    await new Promise(r => setTimeout(r, 30));

    try {
      if (editingLevel) {
        await editLevel(editingLevel.id, levelData);
      } else {
        await createLevel(levelData);
      }
      
      setSaveProgress(95);
      setSaveStatus('Verifying...');
      await new Promise(r => setTimeout(r, 50));
      
      setSaveProgress(100);
      setSaveStatus(`Done! (${(dataSize / 1024).toFixed(1)}KB)`);
    } catch (error) {
      console.error('Save failed:', error);
      setSaveProgress(0);
      setSaveStatus('Error: ' + (error as Error).message);
    }

    setSaving(false);
    setTimeout(() => {
      if (onClose) {
        onClose();
      } else {
        setScreen('levelSelect');
      }
    }, 800);
  };

  const handleDeleteNode = () => {
    if (!selectedNode) return;
    // Remove edges connected to this node
    setEdges(edges.filter((e) => e.source !== selectedNode && e.target !== selectedNode));
    setNodes(nodes.filter((n) => n.id !== selectedNode));
    setSelectedNode(null);
  };

  const handleDeleteEdge = () => {
    if (!selectedEdge) return;
    setEdges(edges.filter((e) => e.id !== selectedEdge));
    setSelectedEdge(null);
  };

  const handleClearAll = () => {
    setNodes([]);
    setEdges([]);
    setNextNodeId(1);
    setNextEdgeId(1);
    originalImageRef.current = null;
    setHasImage(false);
    setSelectedNode(null);
    setSelectedEdge(null);
    setEdgeStart(null);
    setIsCropping(false);
    setCropStart(null);
    setCropEnd(null);
    setDetectedRegions([]);
    setDetectedEdges([]);
    setSelectedRegionIds(new Set());
    setDetectionStatus('');
    setHasConfirmedDetection(false);
    setMode('detect');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => (onClose ? onClose() : setScreen('levelSelect'))}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            ← Back
          </button>
          <h1 className="text-2xl font-bold text-gray-800">
            {editingLevel ? 'Edit Level' : 'Level Editor'}
          </h1>
          <div className="w-20"></div>
        </div>

        {/* Mode Tabs - only show after detection confirmed */}
        {hasConfirmedDetection && (
          <div className="flex justify-center gap-4 mb-6">
            <button
              onClick={() => setMode('edit')}
              className={`px-6 py-2 rounded-lg font-medium ${
                mode === 'edit'
                  ? 'bg-purple-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}
            >
              Edit Graph
            </button>
            <button
              onClick={() => {
                setMode('detect');
                setDetectedRegions([]);
                setDetectedEdges([]);
                setDetectionStatus('');
              }}
              className={`px-6 py-2 rounded-lg font-medium ${
                mode === 'detect'
                  ? 'bg-purple-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}
            >
              Detect Again
            </button>
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Canvas Area */}
          <div className="flex-1">
            {(mode === 'edit' || isCropping) ? (
              <canvas
                ref={canvasRef}
                width={CANVAS_WIDTH}
                height={CANVAS_HEIGHT}
                onClick={handleCanvasClick}
                onMouseDown={isCropping ? handleCropMouseDown : undefined}
                onMouseMove={isCropping ? handleCropMouseMove : undefined}
                onMouseUp={isCropping ? handleCropMouseUp : undefined}
                onMouseLeave={isCropping ? handleCropMouseUp : undefined}
                className={`bg-white rounded-lg shadow-lg ${
                  tool === 'deleteEdge' ? 'cursor-not-allowed' : 'cursor-crosshair'
                }`}
              />
            ) : (
              <canvas
                ref={previewCanvasRef}
                width={CANVAS_WIDTH}
                height={CANVAS_HEIGHT}
                className="bg-white rounded-lg shadow-lg"
              />
            )}
          </div>

          {/* Right Panel */}
          <div className="lg:w-80 space-y-4">
            <div className="bg-white rounded-lg shadow-md p-4">
              <h3 className="font-semibold text-gray-800 mb-3">Level Name</h3>
              <input
                type="text"
                value={levelName}
                onChange={(e) => setLevelName(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div className="bg-white rounded-lg shadow-md p-4">
              <h3 className="font-semibold text-gray-800 mb-3">Background Image</h3>
              <input
                type="file"
                ref={imageInputRef}
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
              <div className="flex gap-2 mb-2">
                <button
                  onClick={() => imageInputRef.current?.click()}
                  className="flex-1 px-4 py-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200"
                >
                  Upload Image
                </button>
                {hasImage && (
                  <button
                    onClick={() => {
                      originalImageRef.current = null;
                      setHasImage(false);
                      setIsCropping(false);
                      setCropStart(null);
                      setCropEnd(null);
                      setDetectedRegions([]);
                      setDetectedEdges([]);
                      setHasConfirmedDetection(false);
                      setMode('detect');
                    }}
                    className="px-4 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200"
                  >
                    Remove
                  </button>
                )}
              </div>
              {hasImage && !isCropping && (
                <button
                  onClick={handleStartCrop}
                  className="w-full px-4 py-2 bg-purple-100 text-purple-600 rounded-lg hover:bg-purple-200"
                >
                  Crop Image
                </button>
              )}
              {isCropping && (
                <div className="flex gap-2">
                  <button
                    onClick={handleApplyCrop}
                    disabled={!cropStart || !cropEnd}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                  >
                    Apply Crop
                  </button>
                  <button
                    onClick={handleCancelCrop}
                    className="flex-1 px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>

            {/* Detection Panel */}
            {mode === 'detect' && (
              <div className="bg-white rounded-lg shadow-md p-4">
                <h3 className="font-semibold text-gray-800 mb-3">Region Detection</h3>
                <p className="text-xs text-gray-500 mb-3">
                  Detects white blocks separated by dark borders
                </p>
                <button
                  onClick={handleDetectRegions}
                  disabled={isDetecting || !hasImage}
                  className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isDetecting ? (
                    <>
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Detecting...
                    </>
                  ) : (
                    'Detect Regions'
                  )}
                </button>
                
                {/* Status Bar */}
                {detectionStatus && (
                  <div className={`mt-3 p-2 rounded text-sm ${
                    detectedRegions.length > 0 
                      ? 'bg-green-50 text-green-700 border border-green-200' 
                      : isDetecting
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}>
                    {isDetecting && (
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                        Processing...
                      </div>
                    )}
                    {!isDetecting && detectionStatus}
                  </div>
                )}
              </div>
            )}

            {/* Region Selection */}
            {mode === 'detect' && detectedRegions.length > 0 && (
              <div className="bg-white rounded-lg shadow-md p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-800">
                    Regions ({selectedRegionIds.size}/{detectedRegions.length})
                  </h3>
                  <div className="flex gap-1">
                    <button
                      onClick={handleSelectAllRegions}
                      className="text-xs px-2 py-1 bg-gray-100 rounded hover:bg-gray-200"
                    >
                      All
                    </button>
                    <button
                      onClick={handleDeselectAllRegions}
                      className="text-xs px-2 py-1 bg-gray-100 rounded hover:bg-gray-200"
                    >
                      None
                    </button>
                  </div>
                </div>
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {detectedRegions.map((region) => (
                    <label
                      key={region.id}
                      className="flex items-center gap-2 p-1 rounded hover:bg-gray-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedRegionIds.has(region.id)}
                        onChange={() => handleToggleRegion(region.id)}
                        className="rounded text-purple-600"
                      />
                      <div className="w-4 h-4 rounded bg-white border" />
                      <span className="text-sm text-gray-600">
                        Region {region.id.replace('region-', '')}
                      </span>
                    </label>
                  ))}
                </div>
                <button
                  onClick={handleConfirmDetection}
                  className="w-full mt-3 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Confirm & Edit Graph
                </button>
              </div>
            )}

            {/* Edit Tools - only show after detection confirmed */}
            {mode === 'edit' && hasConfirmedDetection && (
              <div className="bg-white rounded-lg shadow-md p-4">
                <h3 className="font-semibold text-gray-800 mb-3">Tools</h3>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => setTool('select')}
                    className={`px-4 py-2 rounded-lg ${
                      tool === 'select'
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-100 hover:bg-gray-200'
                    }`}
                  >
                    Select
                  </button>
                  <button
                    onClick={() => setTool('node')}
                    className={`px-4 py-2 rounded-lg ${
                      tool === 'node'
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-100 hover:bg-gray-200'
                    }`}
                  >
                    Add Node
                  </button>
                  <button
                    onClick={() => {
                      setTool('edge');
                      setEdgeStart(null);
                    }}
                    className={`px-4 py-2 rounded-lg ${
                      tool === 'edge'
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-100 hover:bg-gray-200'
                    }`}
                  >
                    Add Edge
                  </button>
                  <button
                    onClick={() => setTool('deleteEdge')}
                    className={`px-4 py-2 rounded-lg ${
                      tool === 'deleteEdge'
                        ? 'bg-red-600 text-white'
                        : 'bg-gray-100 hover:bg-gray-200'
                    }`}
                  >
                    Delete Edge
                  </button>
                </div>
                {tool === 'edge' && edgeStart && (
                  <p className="text-xs text-purple-600 mt-2">Click second node to finish edge</p>
                )}
                {tool === 'deleteEdge' && (
                  <p className="text-xs text-red-600 mt-2">Click on an edge to delete it</p>
                )}
              </div>
            )}

            <div className="bg-white rounded-lg shadow-md p-4">
              <h3 className="font-semibold text-gray-800 mb-3">Actions</h3>
              <div className="flex flex-col gap-2">
                {mode === 'edit' && hasConfirmedDetection && (
                  <>
                    <button
                      onClick={handleDeleteNode}
                      disabled={!selectedNode}
                      className="px-4 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 disabled:opacity-50"
                    >
                      Delete Selected Node
                    </button>
                    <button
                      onClick={handleDeleteEdge}
                      disabled={!selectedEdge}
                      className="px-4 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 disabled:opacity-50"
                    >
                      Delete Selected Edge
                    </button>
                  </>
                )}
                <button
                  onClick={handleClearAll}
                  className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Clear All
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || !levelName.trim()}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <>
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Saving...
                    </>
                  ) : (
                    editingLevel ? 'Update Level' : 'Save Level'
                  )}
                </button>
                {saving && (
                  <div className="mt-2">
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div 
                        className="bg-green-500 h-2.5 rounded-full transition-all duration-200"
                        style={{ width: `${saveProgress}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-600 mt-1 text-center">{saveStatus}</p>
                  </div>
                )}
                {!saving && saveStatus && (
                  <div className={`mt-2 p-2 rounded text-xs text-center ${
                    saveStatus.includes('Error')
                      ? 'bg-red-50 text-red-600 border border-red-200'
                      : 'bg-green-50 text-green-600 border border-green-200'
                  }`}>
                    {saveStatus}
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-4">
              <h3 className="font-semibold text-gray-800 mb-2">Stats</h3>
              <p className="text-sm text-gray-600">Nodes: {nodes.length}</p>
              <p className="text-sm text-gray-600">Edges: {edges.length}</p>
              {tool === 'edge' && edgeStart && (
                <p className="text-sm text-purple-600">
                  Click second node to create edge
                </p>
              )}
              {tool === 'select' && selectedNode && (
                <p className="text-sm text-purple-600">
                  Selected: Node {nodes.find(n => n.id === selectedNode)?.label}
                </p>
              )}
              {tool === 'select' && selectedEdge && (
                <p className="text-sm text-red-600">
                  Selected: Edge {selectedEdge}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
