
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { LayoutMode, ImageState, TextLayer, WatermarkState, BackgroundState, BackgroundType, WatermarkPosition, SerializableImageState, WorkerMessageData } from './types';
import { FONT_FACES } from './constants';

// HELPER & UI COMPONENTS

/**
 * A hook that debounces a value.
 * @param value The value to debounce.
 * @param delay The debounce delay in milliseconds.
 * @returns The debounced value.
 */
function useDebouncedValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  return debouncedValue;
}

interface IconProps {
  name: string;
  className?: string;
}

const Icon: React.FC<IconProps> = ({ name, className = 'w-4 h-4' }) => (
  <i data-lucide={name} className={className}></i>
);

interface SliderProps {
  label: string;
  icon: string;
  value: number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  disabled?: boolean;
}

const Slider: React.FC<SliderProps> = ({ label, icon, value, onChange, min = 0, max = 100, step = 1, unit = '', disabled = false }) => (
  <div className="flex flex-col space-y-2">
    <label className={`flex items-center space-x-2 text-sm font-medium ${disabled ? 'text-gray-400' : 'text-gray-600'}`}>
      <Icon name={icon} />
      <span>{label}</span>
    </label>
    <div className="flex items-center space-x-3">
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={onChange}
        disabled={disabled}
        className={`w-full h-2 bg-gray-300 rounded-lg appearance-none ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'} disabled:bg-gray-200`}
      />
      <span className={`text-sm font-mono bg-gray-200 text-gray-800 px-2 py-1 rounded-md w-16 text-center ${disabled ? 'text-gray-400' : ''}`}>{value}{unit}</span>
    </div>
  </div>
);

interface ToggleProps {
  label: string;
  icon: string;
  checked: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
}

const Toggle: React.FC<ToggleProps> = ({ label, icon, checked, onChange, disabled = false }) => (
    <label className={`flex items-center justify-between ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
        <div className="flex items-center space-x-2">
            <Icon name={icon} className={`w-5 h-5 ${disabled ? 'text-gray-400' : 'text-gray-500'}`} />
            <span className={`font-medium ${disabled ? 'text-gray-400' : 'text-gray-700'}`}>{label}</span>
        </div>
        <div className="relative">
            <input type="checkbox" className="sr-only" checked={checked} onChange={onChange} disabled={disabled}/>
            <div className={`block w-12 h-6 rounded-full ${disabled ? 'bg-gray-200' : (checked ? 'bg-lime-500' : 'bg-gray-300')}`}></div>
            <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${checked ? `transform translate-x-6` : ''}`}></div>
        </div>
    </label>
);

type InteractionState = {
  mode: 'idle' | 'dragging' | 'resizing-br';
  target: 'text' | 'image' | null;
  id?: string;
  offsetX?: number;
  offsetY?: number;
};

// MAIN APPLICATION COMPONENT
export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const exportWorkerRef = useRef<Worker>();
  
  // Image & Layout State
  const [images, setImages] = useState<ImageState[]>([]);
  const [globalZoom, setGlobalZoom] = useState(1);
  const [gap, setGap] = useState(16);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('grid');
  const [imageFit, setImageFit] = useState<'contain' | 'cover'>('cover');
  const [mainZoom, setMainZoom] = useState(1);
  const [bgBlur, setBgBlur] = useState(10);
  const [bgOpacity, setBgOpacity] = useState(0.3);

  // Debounced states for performance
  const debouncedGlobalZoom = useDebouncedValue(globalZoom, 150);
  const debouncedGap = useDebouncedValue(gap, 150);
  const debouncedMainZoom = useDebouncedValue(mainZoom, 150);
  const debouncedBgBlur = useDebouncedValue(bgBlur, 150);
  const debouncedBgOpacity = useDebouncedValue(bgOpacity, 150);

  // New State
  const [background, setBackground] = useState<BackgroundState>({ type: 'color', value: '#F3F4F6' });
  const [watermark, setWatermark] = useState<WatermarkState | null>(null);
  const [textLayers, setTextLayers] = useState<TextLayer[]>([]);
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);

  const debouncedWatermark = useDebouncedValue(watermark, 150);
  const debouncedTextLayers = useDebouncedValue(textLayers, 150);
  
  // Interaction State
  const [interactionState, setInteractionState] = useState<InteractionState>({ mode: 'idle', target: null});
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [exportName, setExportName] = useState('mockup.png');
  const [isExporting, setIsExporting] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  
  // Preloaded image elements
  const [loadedGridImages, setLoadedGridImages] = useState<HTMLImageElement[]>([]);
  const [loadedWatermark, setLoadedWatermark] = useState<HTMLImageElement | null>(null);
  const [loadedBackgroundImage, setLoadedBackgroundImage] = useState<HTMLImageElement | null>(null);

  // Image & File Handling
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const newImages = Array.from(event.target.files).map((file, index) => ({
        id: self.crypto.randomUUID(),
        url: URL.createObjectURL(file),
        file,
        // Freeform props
        x: 50 + index * 30,
        y: 50 + index * 30,
        width: 300,
        height: 200,
        zIndex: (images.length > 0 ? Math.max(...images.map(i => i.zIndex || 0)) : 0) + index + 1,
      }));
      setImages(prev => [...prev, ...newImages]);
    }
  };

  const handleWatermarkUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      setWatermark({
        id: self.crypto.randomUUID(),
        url: URL.createObjectURL(file),
        file,
        opacity: 0.5,
        size: 20,
        position: 'bottom-right',
      });
    }
  };

  const handleBackgroundUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
        const file = event.target.files[0];
        setBackground({
            type: 'image',
            value: {
                id: self.crypto.randomUUID(),
                url: URL.createObjectURL(file),
                file,
            },
        });
    }
  };

  // Preload all images needed for the canvas
  useEffect(() => {
    Promise.all(images.map(imgState => new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.src = imgState.url;
      img.onload = () => resolve(img);
      img.onerror = reject;
    }))).then(setLoadedGridImages);
  }, [images]);

  useEffect(() => {
    if (watermark) {
      const img = new Image();
      img.src = watermark.url;
      img.onload = () => setLoadedWatermark(img);
    } else {
      setLoadedWatermark(null);
    }
  }, [watermark?.url]);

  useEffect(() => {
    if (background.type === 'image' && background.value && typeof background.value === 'object') {
      const img = new Image();
      img.src = background.value.url;
      img.onload = () => setLoadedBackgroundImage(img);
    } else {
      setLoadedBackgroundImage(null);
    }
  }, [background]);

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const container = canvas.parentElement;
    if (container) {
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
    }

    // 1. Draw Background
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (background.type === 'image' && loadedBackgroundImage) {
        ctx.drawImage(loadedBackgroundImage, 0, 0, canvas.width, canvas.height);
    } else {
        ctx.fillStyle = background.type === 'color' && background.value ? background.value as string : '#F3F4F6';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    if (images.length === 0 && debouncedTextLayers.length === 0 && !debouncedWatermark) {
      ctx.fillStyle = '#6b7280'; // gray-500
      ctx.textAlign = 'center';
      ctx.font = '24px Montserrat';
      ctx.fillText('Upload images to begin', canvas.width / 2, canvas.height / 2);
      return;
    }

    // 2. Draw Image Grid/Layout
    const drawImage = (img: HTMLImageElement, x: number, y: number, w: number, h: number, extraZoom: number = 1) => {
        const zoom = debouncedGlobalZoom * extraZoom;
        
        ctx.save();
        ctx.beginPath();
        ctx.rect(x, y, w, h);
        ctx.clip();

        const imgRatio = img.width / img.height;
        const cellRatio = w / h;
        
        let renderW, renderH, renderX, renderY;

        if (imageFit === 'cover' ? (imgRatio > cellRatio) : (imgRatio < cellRatio)) {
            renderH = h * zoom;
            renderW = renderH * imgRatio;
        } else {
            renderW = w * zoom;
            renderH = renderW / imgRatio;
        }

        renderX = x + (w - renderW) / 2;
        renderY = y + (h - renderH) / 2;

        ctx.drawImage(img, renderX, renderY, renderW, renderH);

        ctx.restore();
    };

    ctx.save();
    switch (layoutMode) {
      case 'grid': {
        const cols = Math.ceil(Math.sqrt(loadedGridImages.length));
        const rows = Math.ceil(loadedGridImages.length / cols);
        const cellWidth = (canvas.width - (cols + 1) * debouncedGap) / cols;
        const cellHeight = (canvas.height - (rows + 1) * debouncedGap) / rows;
        loadedGridImages.forEach((img, i) => {
          const col = i % cols;
          const row = Math.floor(i / cols);
          const x = debouncedGap + col * (cellWidth + debouncedGap);
          const y = debouncedGap + row * (cellHeight + debouncedGap);
          drawImage(img, x, y, cellWidth, cellHeight);
        });
        break;
      }
      case 'left-big':
      case 'right-big': {
        if (loadedGridImages.length > 0) {
            const isLeftBig = layoutMode === 'left-big';
            const bigX = isLeftBig ? debouncedGap : canvas.width / 2 + debouncedGap / 2;
            const bigW = canvas.width / 2 - debouncedGap * 1.5;
            const bigH = canvas.height - debouncedGap * 2;
            drawImage(loadedGridImages[0], bigX, debouncedGap, bigW, bigH);
        }
        if (loadedGridImages.length > 1) {
            const isLeftBig = layoutMode === 'left-big';
            const gridImages = loadedGridImages.slice(1);
            const cols = Math.max(1, Math.ceil(Math.sqrt(gridImages.length)));
            const rows = Math.max(1, Math.ceil(gridImages.length / cols));
            const startX = isLeftBig ? canvas.width / 2 + debouncedGap / 2 : debouncedGap;
            const availableWidth = canvas.width / 2 - debouncedGap * 1.5;
            const cellWidth = (availableWidth - (cols - 1) * debouncedGap) / cols;
            const cellHeight = (canvas.height - (rows + 1) * debouncedGap) / rows;

            gridImages.forEach((img, i) => {
                const col = i % cols;
                const row = Math.floor(i / cols);
                const x = startX + col * (cellWidth + debouncedGap);
                const y = debouncedGap + row * (cellHeight + debouncedGap);
                drawImage(img, x, y, cellWidth, cellHeight);
            });
        }
        break;
      }
      case 'top-big':
      case 'bottom-big': {
        if (loadedGridImages.length > 0) {
            const isTopBig = layoutMode === 'top-big';
            const bigY = isTopBig ? debouncedGap : canvas.height / 2 + debouncedGap / 2;
            const bigW = canvas.width - debouncedGap * 2;
            const bigH = canvas.height / 2 - debouncedGap * 1.5;
            drawImage(loadedGridImages[0], debouncedGap, bigY, bigW, bigH);
        }
        if (loadedGridImages.length > 1) {
            const isTopBig = layoutMode === 'top-big';
            const gridImages = loadedGridImages.slice(1);
            const startY = isTopBig ? canvas.height / 2 + debouncedGap / 2 : debouncedGap;
            const gridHeight = canvas.height / 2 - debouncedGap * 1.5;
            const cols = Math.max(1, Math.ceil(Math.sqrt(gridImages.length)));
            const rows = Math.max(1, Math.ceil(gridImages.length / cols));
            const cellWidth = (canvas.width - (cols + 1) * debouncedGap) / cols;
            const cellHeight = (gridHeight - (rows - 1) * debouncedGap) / rows;

            gridImages.forEach((img, i) => {
                const col = i % cols;
                const row = Math.floor(i / cols);
                const x = debouncedGap + col * (cellWidth + debouncedGap);
                const y = startY + row * (cellHeight + debouncedGap);
                drawImage(img, x, y, cellWidth, cellHeight);
            });
        }
        break;
      }
      case 'single-blur': {
        const bgImages = loadedGridImages.slice(1);
        if (bgImages.length > 0) {
            ctx.save();
            ctx.filter = `blur(${debouncedBgBlur}px)`;
            ctx.globalAlpha = debouncedBgOpacity;
            const cols = Math.ceil(Math.sqrt(bgImages.length));
            const rows = Math.ceil(bgImages.length / cols);
            const cellWidth = canvas.width / cols;
            const cellHeight = canvas.height / rows;
            bgImages.forEach((img, i) => {
                const col = i % cols;
                const row = Math.floor(i / cols);
                const x = col * cellWidth;
                const y = row * cellHeight;
                ctx.drawImage(img, x, y, cellWidth, cellHeight);
            });
            ctx.restore();
        }

        if (loadedGridImages.length > 0) {
            const maxW = canvas.width * 0.8;
            const maxH = canvas.height * 0.9;
            const cellX = (canvas.width - maxW) / 2;
            const cellY = (canvas.height - maxH) / 2;
            drawImage(loadedGridImages[0], cellX, cellY, maxW, maxH, debouncedMainZoom);
        }
        break;
      }
      case 'freeform': {
        const sortedImageStates = [...images].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
        sortedImageStates.forEach(imgState => {
          const loadedImg = loadedGridImages.find(li => li.src === imgState.url);
          if (loadedImg && imgState.x != null && imgState.y != null && imgState.width != null && imgState.height != null) {
              ctx.drawImage(loadedImg, imgState.x, imgState.y, imgState.width, imgState.height);

              if (imgState.id === selectedImageId) {
                  const handleSize = 10;
                  ctx.strokeStyle = '#84cc16'; // lime-500
                  ctx.lineWidth = 2;
                  ctx.strokeRect(imgState.x, imgState.y, imgState.width, imgState.height);
                  ctx.fillStyle = '#84cc16';
                  ctx.fillRect(imgState.x + imgState.width - handleSize / 2, imgState.y + imgState.height - handleSize / 2, handleSize, handleSize);
              }
          }
        });
        break;
      }
    }
    ctx.restore();

    // 3. Draw Watermark
    if (debouncedWatermark && loadedWatermark) {
        ctx.save();
        ctx.globalAlpha = debouncedWatermark.opacity;
        const aspect = loadedWatermark.width / loadedWatermark.height;
        const w = (canvas.width / 100) * debouncedWatermark.size;
        const h = w / aspect;
        const margin = debouncedGap;

        let x = 0, y = 0;
        switch (debouncedWatermark.position) {
            case 'top-left': x = margin; y = margin; break;
            case 'top-right': x = canvas.width - w - margin; y = margin; break;
            case 'bottom-left': x = margin; y = canvas.height - h - margin; break;
            case 'bottom-right': x = canvas.width - w - margin; y = canvas.height - h - margin; break;
            case 'center': x = (canvas.width - w) / 2; y = (canvas.height - h) / 2; break;
        }
        ctx.drawImage(loadedWatermark, x, y, w, h);
        ctx.restore();
    }

    // 4. Draw Text Layers
    textLayers.forEach(layer => {
        ctx.save();
        ctx.translate(layer.x, layer.y);
        ctx.rotate(layer.rotation * Math.PI / 180);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = `${layer.fontSize}px ${layer.fontFamily}`;

        if (layer.backgroundOpacity > 0) {
            const metrics = ctx.measureText(layer.text);
            const rectW = metrics.width + layer.padding * 2;
            const rectH = layer.fontSize + layer.padding * 2;
            const rectX = -rectW / 2;
            const rectY = -rectH / 2;
            
            ctx.globalAlpha = layer.backgroundOpacity;
            ctx.fillStyle = layer.backgroundColor;
            ctx.fillRect(rectX, rectY, rectW, rectH);
            ctx.globalAlpha = 1;
        }
        
        if (layer.shadow) {
            ctx.shadowColor = 'rgba(0, 0, 0, 0.75)';
            ctx.shadowBlur = 10;
            ctx.shadowOffsetX = 5;
            ctx.shadowOffsetY = 5;
        }

        ctx.fillStyle = layer.color;
        ctx.fillText(layer.text, 0, 0);
        ctx.restore();
    });

  }, [images, loadedGridImages, debouncedGlobalZoom, debouncedGap, layoutMode, imageFit, debouncedMainZoom, debouncedBgBlur, debouncedBgOpacity, textLayers, background, loadedBackgroundImage, debouncedWatermark, loadedWatermark, selectedImageId]);

  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);
  
  useEffect(() => {
    if (window.lucide) window.lucide.createIcons();
  });

  useEffect(() => {
    const handleResize = () => drawCanvas();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [drawCanvas]);

  // Terminate worker on unmount
  useEffect(() => {
    return () => {
      exportWorkerRef.current?.terminate();
    };
  }, []);
  
  // Text Layer Management
  const addTextLayer = () => {
    const newLayer: TextLayer = {
      id: self.crypto.randomUUID(),
      text: 'New Text',
      x: canvasRef.current ? canvasRef.current.width / 2 : 400,
      y: canvasRef.current ? canvasRef.current.height / 2 : 300,
      fontSize: 48,
      fontFamily: 'Montserrat',
      color: '#FFFFFF',
      rotation: 0,
      shadow: true,
      backgroundColor: '#000000',
      backgroundOpacity: 0.5,
      padding: 10,
    };
    setTextLayers(prev => [...prev, newLayer]);
    setSelectedTextId(newLayer.id);
  };

  const updateSelectedLayer = (props: Partial<TextLayer>) => {
    if (!selectedTextId) return;
    setTextLayers(prev => prev.map(layer => 
      layer.id === selectedTextId ? { ...layer, ...props } : layer
    ));
  };
  
  const deleteTextLayer = (id: string) => {
    setTextLayers(prev => prev.filter(layer => layer.id !== id));
    if (selectedTextId === id) {
      setSelectedTextId(null);
    }
  }

  const selectedLayer = useMemo(() => {
    if (!selectedTextId) return null;
    return textLayers.find(layer => layer.id === selectedTextId);
  }, [selectedTextId, textLayers]);

  // Freeform Image Layer Management
  const bringToFront = (id: string) => {
    setImages(prev => {
        const maxZ = Math.max(0, ...prev.map(i => i.zIndex || 0));
        return prev.map(img => img.id === id ? {...img, zIndex: maxZ + 1} : img);
    });
  };
  const sendToBack = (id: string) => {
    setImages(prev => {
        const minZ = Math.min(0, ...prev.map(i => i.zIndex || 0));
        return prev.map(img => img.id === id ? {...img, zIndex: minZ - 1} : img);
    });
  };

  // Mouse Handlers for Canvas Interaction
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const ctx = canvas.getContext('2d');
    if(!ctx) return;

    // Check for text layer click first
    for (let i = textLayers.length - 1; i >= 0; i--) {
      const layer = textLayers[i];
      ctx.font = `${layer.fontSize}px ${layer.fontFamily}`;
      const textMetrics = ctx.measureText(layer.text);
      const textWidth = textMetrics.width + layer.padding * 2;
      const textHeight = layer.fontSize + layer.padding * 2;
      
      const angle = layer.rotation * Math.PI / 180;
      const cos = Math.cos(-angle);
      const sin = Math.sin(-angle);
      const dx = mouseX - layer.x;
      const dy = mouseY - layer.y;
      const rotatedX = dx * cos - dy * sin;
      const rotatedY = dx * sin + dy * cos;

      if (Math.abs(rotatedX) < textWidth / 2 && Math.abs(rotatedY) < textHeight / 2) {
          setSelectedTextId(layer.id);
          setSelectedImageId(null);
          setInteractionState({
            mode: 'dragging',
            target: 'text',
            id: layer.id,
            offsetX: mouseX - layer.x,
            offsetY: mouseY - layer.y,
          });
          return;
      }
    }

    // Check for image click in freeform mode
    if (layoutMode === 'freeform') {
      const sortedImages = [...images].sort((a, b) => (b.zIndex || 0) - (a.zIndex || 0));
      let clickedImage = null;
      let clickMode: InteractionState['mode'] = 'idle';

      for (const img of sortedImages) {
        if (img.x === undefined || img.y === undefined || img.width === undefined || img.height === undefined) continue;
        
        // Check for click on resize handle of the currently selected image
        if (img.id === selectedImageId) {
          const handleSize = 12; // Larger click area
          const brHandleX = img.x + img.width;
          const brHandleY = img.y + img.height;
          if (mouseX >= brHandleX - handleSize && mouseX <= brHandleX + handleSize &&
              mouseY >= brHandleY - handleSize && mouseY <= brHandleY + handleSize) {
            clickedImage = img;
            clickMode = 'resizing-br';
            break;
          }
        }
        
        // Check for click on image body
        if (mouseX > img.x && mouseX < img.x + img.width && mouseY > img.y && mouseY < img.y + img.height) {
            clickedImage = img;
            clickMode = 'dragging';
            break;
        }
      }
      
      setSelectedTextId(null);
      if (clickedImage) {
        if (clickedImage.id !== selectedImageId) {
          setSelectedImageId(clickedImage.id);
        }
        if(clickMode === 'dragging') {
          bringToFront(clickedImage.id);
        }
        setInteractionState({
            mode: clickMode,
            target: 'image',
            id: clickedImage.id,
            offsetX: mouseX - clickedImage.x,
            offsetY: mouseY - clickedImage.y,
        });
      } else {
        setSelectedImageId(null);
        setInteractionState({ mode: 'idle', target: null });
      }
    } else {
      setSelectedImageId(null);
      setSelectedTextId(null);
    }
  }, [textLayers, images, layoutMode, selectedImageId]);
  
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Use pageX and pageY to handle movements outside the canvas during a drag.
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // --- Performance Optimization ---
    // Instead of updating state on every mouse move, we use requestAnimationFrame
    // to throttle the updates. This prevents lag and makes dragging feel smooth.
    if (rafRef.current) {
        window.cancelAnimationFrame(rafRef.current);
    }

    rafRef.current = window.requestAnimationFrame(() => {
        // Update cursor style inside the animation frame to ensure it's responsive.
        if (interactionState.mode === 'idle' && layoutMode === 'freeform') {
            let onHandle = false;
            if (selectedImageId) {
                const img = images.find(i => i.id === selectedImageId);
                if (img && img.x !== undefined && img.y !== undefined && img.width !== undefined && img.height !== undefined) {
                    const handleSize = 12;
                    const brHandleX = img.x + img.width;
                    const brHandleY = img.y + img.height;
                    if (mouseX >= brHandleX - handleSize && mouseX <= brHandleX + handleSize && mouseY >= brHandleY - handleSize && mouseY <= brHandleY + handleSize) {
                        onHandle = true;
                    }
                }
            }
            canvas.style.cursor = onHandle ? 'nwse-resize' : 'grab';
        } else if (interactionState.mode !== 'idle') {
            canvas.style.cursor = interactionState.mode.startsWith('resizing') ? 'nwse-resize' : 'grabbing';
        } else {
            canvas.style.cursor = 'default';
        }
        
        if (interactionState.mode === 'idle') return;

        if (interactionState.target === 'text' && interactionState.id) {
            setTextLayers(prev => prev.map(layer =>
                layer.id === interactionState.id ? { ...layer, x: mouseX - (interactionState.offsetX || 0), y: mouseY - (interactionState.offsetY || 0) } : layer
            ));
        } else if (interactionState.target === 'image' && interactionState.id) {
            setImages(prev => prev.map(img => {
                if (img.id !== interactionState.id) return img;
                if (interactionState.mode === 'dragging') {
                    return { ...img, x: mouseX - (interactionState.offsetX || 0), y: mouseY - (interactionState.offsetY || 0) };
                }
                if (interactionState.mode === 'resizing-br' && img.x !== undefined && img.y !== undefined) {
                    const newWidth = Math.max(20, mouseX - img.x);
                    const newHeight = Math.max(20, mouseY - img.y);
                    return { ...img, width: newWidth, height: newHeight };
                }
                return img;
            }));
        }
    });
  }, [interactionState, layoutMode, selectedImageId, images]);


  const handleMouseUp = useCallback(() => {
    // Cancel any pending animation frame to stop updates.
    if (rafRef.current) {
        window.cancelAnimationFrame(rafRef.current);
    }
    const canvas = canvasRef.current;
    if(canvas) canvas.style.cursor = layoutMode === 'freeform' ? 'grab' : 'default';
    setInteractionState({ mode: 'idle', target: null });
  }, [layoutMode]);

  // Export & DnD
  const handleExport = async () => {
    const sourceCanvas = canvasRef.current;
    if (!sourceCanvas) return;

    setIsExporting(true);

    try {
      // Initialize worker if it doesn't exist
      if (!exportWorkerRef.current) {
        exportWorkerRef.current = new Worker(new URL('./export.worker.ts', import.meta.url), { type: 'module' });
      }
      const worker = exportWorkerRef.current;

      const transferableObjects: Transferable[] = [];

      // 1. Prepare ImageBitmaps for all images
      const imageBitmaps = await Promise.all(images.map(img => createImageBitmap(img.file)));
      transferableObjects.push(...imageBitmaps);

      let watermarkBitmap: ImageBitmap | null = null;
      if (watermark?.file) {
        watermarkBitmap = await createImageBitmap(watermark.file);
        transferableObjects.push(watermarkBitmap);
      }
      
      let backgroundBitmap: ImageBitmap | null = null;
      if (background.type === 'image' && background.value && (background.value as ImageState).file) {
        backgroundBitmap = await createImageBitmap((background.value as ImageState).file);
        transferableObjects.push(backgroundBitmap);
      }

      // 2. Create OffscreenCanvas and add to transfer list
      const offscreenCanvas = new OffscreenCanvas(2000, 1500);
      transferableObjects.push(offscreenCanvas);

      // 3. Define message handler for worker responses
      worker.onmessage = (event) => {
        const { type, blob, error } = event.data;
        if (type === 'success' && blob) {
          const link = document.createElement('a');
          link.download = exportName || 'mockup.png';
          link.href = URL.createObjectURL(blob);
          link.click();
          URL.revokeObjectURL(link.href);
        } else {
          console.error("Worker export failed:", error);
          alert("An error occurred during export. Please check the console for details.");
        }
        setIsExporting(false);
      };
      
      worker.onerror = (e) => {
        console.error('Error in worker:', e);
        alert(`An error occurred in the export worker: ${e.message}`);
        setIsExporting(false);
      };

      // 4. Create serializable state (remove non-transferable properties)
      const serializableImages = images.map(({ file, url, ...rest }) => rest);
      let serializableBackground: WorkerMessageData['state']['background'];
      if(background.type === 'image' && background.value && typeof background.value === 'object') {
        const { file, url, ...rest } = background.value;
        serializableBackground = { type: 'image', value: rest };
      } else {
        serializableBackground = { type: 'color', value: background.value as string };
      }
      const serializableWatermark = watermark ? (({ file, url, ...rest }) => rest)(watermark) : null;

      // 5. Post message to worker with all data and transferables
      const message: WorkerMessageData = {
        canvas: offscreenCanvas,
        sourceDimensions: { width: sourceCanvas.width, height: sourceCanvas.height },
        state: {
          layoutMode,
          images: serializableImages,
          textLayers,
          watermark: serializableWatermark,
          background: serializableBackground,
          gap,
          globalZoom,
          imageFit,
          mainZoom,
          bgBlur,
          bgOpacity,
        },
        bitmaps: {
          grid: imageBitmaps,
          watermark: watermarkBitmap,
          background: backgroundBitmap,
        }
      };
      worker.postMessage(message, transferableObjects);

    } catch (error) {
      console.error("Failed to prepare data for export worker:", error);
      alert("An error occurred while preparing the export. Please check the console for details.");
      setIsExporting(false);
    }
  };


  const handleDragStart = (id: string) => setDraggedId(id);
  
  const handleDrop = (targetId: string) => {
    if (!draggedId) return;
    const draggedIndex = images.findIndex(img => img.id === draggedId);
    const targetIndex = images.findIndex(img => img.id === targetId);
    if (draggedIndex !== -1 && targetIndex !== -1) {
        const newImages = [...images];
        const [draggedItem] = newImages.splice(draggedIndex, 1);
        newImages.splice(targetIndex, 0, draggedItem);
        setImages(newImages);
    }
    setDraggedId(null);
  };
  
  const selectedImage = useMemo(() => {
    if (!selectedImageId) return null;
    return images.find(img => img.id === selectedImageId);
  }, [selectedImageId, images]);

  return (
    <div className="flex h-screen bg-gray-100 font-sans text-gray-800">
      {/* Controls Panel */}
      <aside className="w-[380px] h-full bg-white p-6 overflow-y-auto flex flex-col space-y-6 scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200">
        <div className="flex items-center space-x-3 border-b border-gray-200 pb-4">
            <Icon name="layout-grid" className="w-8 h-8 text-lime-500" />
            <h1 className="text-xl font-bold text-gray-900">LavenderDragonDesign's Grid Mockup Generator v1.0</h1>
        </div>

        {/* Layout Controls */}
        <div className="space-y-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <h2 className="text-lg font-semibold text-gray-900">Layout</h2>
            <div className="flex flex-col space-y-4">
                <div>
                    <label htmlFor="layout-mode" className="text-sm font-medium text-gray-600 flex items-center space-x-2 mb-2"><Icon name="layout-template" /><span>Mode</span></label>
                    <select id="layout-mode" value={layoutMode} onChange={e => setLayoutMode(e.target.value as LayoutMode)} className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-lime-500 focus:border-lime-500 block w-full p-2.5">
                        <option value="grid">Grid</option>
                        <option value="single-blur">Single Focus</option>
                        <option value="left-big">Left Big</option>
                        <option value="right-big">Right Big</option>
                        <option value="top-big">Top Big</option>
                        <option value="bottom-big">Bottom Big</option>
                        <option value="freeform">Freeform</option>
                    </select>
                </div>
                <Toggle
                    label="Image Fit (Cover/Contain)"
                    icon="crop"
                    checked={imageFit === 'cover'}
                    onChange={e => setImageFit(e.target.checked ? 'cover' : 'contain')}
                    disabled={layoutMode === 'freeform'}
                />
            </div>
            <Slider label="Gap" icon="space" value={gap} onChange={e => setGap(Number(e.target.value))} max={100} unit="px" disabled={layoutMode === 'freeform'}/>
            <Slider label="Global Zoom" icon="zoom-in" value={globalZoom} onChange={e => setGlobalZoom(Number(e.target.value))} min={0.1} max={5} step={0.05} unit="x" disabled={layoutMode === 'freeform'} />
        </div>

        {layoutMode === 'single-blur' && (
            <div className="space-y-4 p-4 bg-gray-50 border border-gray-200 rounded-lg animate-fade-in">
                <h2 className="text-lg font-semibold text-gray-900">Single Focus Options</h2>
                <Slider label="Main Zoom" icon="star" value={mainZoom} onChange={e => setMainZoom(Number(e.target.value))} min={0.1} max={3} step={0.05} unit="x" />
                <Slider label="BG Blur" icon="git-fork" value={bgBlur} onChange={e => setBgBlur(Number(e.target.value))} max={50} unit="px" />
                <Slider label="BG Opacity" icon="blinds" value={bgOpacity} onChange={e => setBgOpacity(Number(e.target.value))} max={1} step={0.01} />
            </div>
        )}

        {layoutMode === 'freeform' && selectedImage && (
             <div className="space-y-4 p-4 bg-gray-50 border border-gray-200 rounded-lg animate-fade-in">
                <h2 className="text-lg font-semibold text-gray-900">Freeform Controls</h2>
                <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => bringToFront(selectedImage.id)} className="bg-gray-200 text-gray-800 hover:bg-lime-500 hover:text-black font-bold py-2 px-2 rounded-lg flex items-center justify-center space-x-2 transition-colors text-sm"><Icon name="chevrons-up" className="w-4 h-4"/><span>Bring to Front</span></button>
                    <button onClick={() => sendToBack(selectedImage.id)} className="bg-gray-200 text-gray-800 hover:bg-lime-500 hover:text-black font-bold py-2 px-2 rounded-lg flex items-center justify-center space-x-2 transition-colors text-sm"><Icon name="chevrons-down" className="w-4 h-4"/><span>Send to Back</span></button>
                </div>
            </div>
        )}

        {/* Background Controls */}
        <div className="space-y-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <h2 className="text-lg font-semibold text-gray-900">Background</h2>
            <div className="flex items-center space-x-4">
                <label className="flex items-center space-x-2"><input type="radio" name="bg-type" checked={background.type === 'color'} onChange={() => setBackground({type: 'color', value: '#F3F4F6'})} className="form-radio text-lime-500 bg-gray-300"/><span>Color</span></label>
                <label className="flex items-center space-x-2"><input type="radio" name="bg-type" checked={background.type === 'image'} onChange={() => setBackground({type: 'image', value: null})} className="form-radio text-lime-500 bg-gray-300"/><span>Image</span></label>
            </div>
            {background.type === 'color' ? (
                <input type="color" value={typeof background.value === 'string' ? background.value : '#F3F4F6'} onChange={e => setBackground({type: 'color', value: e.target.value})} className="p-1 h-10 w-full block bg-white border border-gray-300 cursor-pointer rounded-lg" />
            ) : (
                <input type="file" accept="image/*" onChange={handleBackgroundUpload} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-lime-200 file:text-lime-900 hover:file:bg-lime-300" />
            )}
        </div>

        {/* Watermark Controls */}
        <div className="space-y-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold text-gray-900">Watermark / Logo</h2>
                {watermark && <button onClick={() => setWatermark(null)}><Icon name="x-circle" className="text-red-500"/></button>}
            </div>
            {!watermark ? (
                <input type="file" accept="image/*" onChange={handleWatermarkUpload} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-lime-200 file:text-lime-900 hover:file:bg-lime-300" />
            ) : (
                <div className="space-y-4">
                    <Slider label="Opacity" icon="blinds" value={watermark.opacity} onChange={e => setWatermark(w => w ? {...w, opacity: Number(e.target.value)} : null)} max={1} step={0.01} />
                    <Slider label="Size" icon="ruler" value={watermark.size} onChange={e => setWatermark(w => w ? {...w, size: Number(e.target.value)} : null)} min={1} max={100} unit="%" />
                    <select value={watermark.position} onChange={e => setWatermark(w => w ? {...w, position: e.target.value as WatermarkPosition} : null)} className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-lime-500 focus:border-lime-500 block w-full p-2.5">
                        <option value="top-left">Top Left</option>
                        <option value="top-right">Top Right</option>
                        <option value="bottom-left">Bottom Left</option>
                        <option value="bottom-right">Bottom Right</option>
                        <option value="center">Center</option>
                    </select>
                </div>
            )}
        </div>
        
        {/* Text Controls */}
        <div className="space-y-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold text-gray-900">Text Layers</h2>
                <button onClick={addTextLayer} className="bg-lime-500 hover:bg-lime-600 text-black font-bold py-1 px-2 rounded-lg flex items-center space-x-1 text-sm"><Icon name="plus" className="w-4 h-4"/><span>Add</span></button>
            </div>
            <div className="space-y-2 max-h-32 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200">
              {textLayers.map(layer => (
                <div key={layer.id} onClick={() => {setSelectedTextId(layer.id); setSelectedImageId(null);}} className={`flex items-center justify-between p-2 rounded-md cursor-pointer transition-colors ${selectedTextId === layer.id ? 'bg-lime-500 text-black' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'}`}>
                  <span className="truncate w-full">{layer.text || '[Empty]'}</span>
                  <button onClick={e => {e.stopPropagation(); deleteTextLayer(layer.id);}} className="text-gray-500 hover:text-red-500 pl-2"><Icon name="trash-2" className="w-4 h-4"/></button>
                </div>
              ))}
            </div>
            <input type="text" value={selectedLayer?.text || ''} onChange={e => updateSelectedLayer({text: e.target.value})} placeholder="Select a layer to edit" disabled={!selectedLayer} className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-lime-500 focus:border-lime-500 block w-full p-2.5 disabled:cursor-not-allowed disabled:bg-gray-200" />
            <div className="flex items-center space-x-2">
                <select value={selectedLayer?.fontFamily || 'Montserrat'} onChange={e => updateSelectedLayer({fontFamily: e.target.value})} disabled={!selectedLayer} className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-lime-500 focus:border-lime-500 block w-full p-2.5 disabled:cursor-not-allowed disabled:bg-gray-200">
                    {FONT_FACES.map(font => <option key={font} value={font}>{font}</option>)}
                </select>
                <input type="color" value={selectedLayer?.color || '#FFFFFF'} onChange={e => updateSelectedLayer({color: e.target.value})} disabled={!selectedLayer} className="p-1 h-10 w-12 block bg-white border border-gray-300 rounded-lg disabled:cursor-not-allowed" />
            </div>
            <Slider label="Font Size" icon="case-sensitive" value={selectedLayer?.fontSize || 0} onChange={e => updateSelectedLayer({fontSize: Number(e.target.value)})} min={8} max={256} unit="px" disabled={!selectedLayer} />
            <Slider label="Rotation" icon="rotate-cw" value={selectedLayer?.rotation || 0} onChange={e => updateSelectedLayer({rotation: Number(e.target.value)})} min={-180} max={180} unit="°" disabled={!selectedLayer} />
            <Toggle label="Text Shadow" icon="star" checked={selectedLayer?.shadow || false} onChange={e => updateSelectedLayer({shadow: e.target.checked})} disabled={!selectedLayer} />
            <h3 className={`text-md font-semibold ${!selectedLayer ? 'text-gray-400' : 'text-gray-700'}`}>Text Background</h3>
            <div className="flex items-center space-x-2">
              <span className={`text-sm ${!selectedLayer ? 'text-gray-400' : 'text-gray-600'}`}>Color</span>
              <input type="color" value={selectedLayer?.backgroundColor || '#000000'} onChange={e => updateSelectedLayer({backgroundColor: e.target.value})} disabled={!selectedLayer} className="p-1 h-10 w-12 block bg-white border border-gray-300 rounded-lg disabled:cursor-not-allowed" />
            </div>
            <Slider label="BG Opacity" icon="blinds" value={selectedLayer?.backgroundOpacity || 0} onChange={e => updateSelectedLayer({backgroundOpacity: Number(e.target.value)})} max={1} step={0.01} disabled={!selectedLayer} />
            <Slider label="BG Padding" icon="move" value={selectedLayer?.padding || 0} onChange={e => updateSelectedLayer({padding: Number(e.target.value)})} max={100} unit="px" disabled={!selectedLayer} />
        </div>

        {/* Export Controls */}
        <div className="space-y-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
             <h2 className="text-lg font-semibold text-gray-900">Export</h2>
             <input type="text" value={exportName} onChange={e => setExportName(e.target.value)} placeholder="filename.png" className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-lime-500 focus:border-lime-500 block w-full p-2.5" />
             <button onClick={handleExport} disabled={isExporting} className="w-full bg-lime-500 hover:bg-lime-600 text-black font-bold py-2 px-4 rounded-lg flex items-center justify-center space-x-2 transition-colors disabled:bg-gray-400 disabled:cursor-wait">
                {isExporting ? <Icon name="loader-2" className="animate-spin" /> : <Icon name="download" />}
                <span>{isExporting ? 'Exporting...' : 'Export as PNG (2000x1500)'}</span>
             </button>
        </div>

        {/* Buy Me A Coffee Footer */}
        <div className="mt-auto pt-6 border-t border-gray-200 text-center">
            <p className="text-sm text-gray-500 mb-2">Dev. By A. Kessler - Made With ❤️</p>
            <a href="https://buymeacoffee.com/lavenderdragondesigns" target="_blank" rel="noopener noreferrer">
                <img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" className="h-12 w-auto inline-block hover:scale-105 transition-transform" />
            </a>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col p-4 bg-gray-100">
        <div className="flex-1 bg-white rounded-lg border-2 border-dashed border-gray-300 relative overflow-hidden">
          <canvas
            ref={canvasRef}
            className={`w-full h-full`}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          />
        </div>
        <div className="h-48 flex-shrink-0 pt-4">
            <div className="bg-white rounded-lg h-full p-3 overflow-x-auto overflow-y-hidden flex items-center space-x-4 scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200">
                 <label htmlFor="imageUpload" className="flex-shrink-0 flex flex-col items-center justify-center w-28 h-28 bg-gray-200 hover:bg-gray-300 rounded-lg cursor-pointer transition-colors text-gray-500 hover:text-gray-800">
                    <Icon name="upload-cloud" className="w-10 h-10" />
                    <span className="text-sm mt-1">Upload</span>
                    <input id="imageUpload" type="file" multiple accept="image/*" onChange={handleImageUpload} className="hidden" />
                </label>
                {images.map((img) => (
                    <div
                        key={img.id}
                        className={`relative group flex-shrink-0 w-28 h-28 rounded-lg overflow-hidden border-2 transition-all duration-200 ${draggedId === img.id ? 'border-lime-500 scale-105' : 'border-transparent'} ${selectedImageId === img.id && layoutMode === 'freeform' ? 'border-lime-500 ring-2 ring-lime-500' : ''}`}
                        draggable
                        onDragStart={() => handleDragStart(img.id)}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={() => handleDrop(img.id)}
                        onClick={() => {
                          if (layoutMode === 'freeform') {
                            setSelectedImageId(img.id);
                            bringToFront(img.id);
                          }
                        }}
                    >
                        <img src={img.url} alt={`upload-${img.id}`} className="w-full h-full object-cover"/>
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <button onClick={(e) => {
                                e.stopPropagation();
                                if(selectedImageId === img.id) setSelectedImageId(null);
                                setImages(images.filter(i => i.id !== img.id));
                            }} className="text-white p-2 rounded-full bg-red-600 hover:bg-red-700">
                                <Icon name="trash-2" className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
      </main>
    </div>
  );
}

// Add a type declaration for the Lucide global object
declare global {
    interface Window {
      lucide: {
        createIcons: () => void;
      };
    }
}