
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { CANVAS_WIDTH, CANVAS_HEIGHT, GOOGLE_FONTS, FONT_FAMILIES } from './constants';
import ControlPanel from './components/ControlPanel';
import ImageThumbnails from './components/ImageThumbnails';
import { Icon } from './components/ui/Icon';

type DOMRect = { x: number; y: number; width: number; height: number };

// A generic interface for any object that can be moved, resized, and rotated on the canvas.
type Transformable = {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
};


type InteractionState = {
  type: 'drag' | 'resize-br' | 'rotate' | 'delete';
  itemId: string;
  itemType: 'image' | 'text' | 'overlay';
  startX: number;
  startY: number;
  startEventX: number;
  startEventY: number;
  startW: number;
  startH: number;
  startRot: number;
  aspectRatio: number;
  startFontSize?: number;
} | null;

// Helper to calculate layout slots for grid-based modes
function calculateLayouts(mode: LayoutMode, imageCount: number, canvasWidth: number, canvasHeight: number, gap: number): DOMRect[] {
    if (imageCount === 0) return [];
    const layouts: DOMRect[] = [];
    const calculateGrid = (count: number, x: number, y: number, w: number, h: number, g: number, forceCols?: number) => {
        const gridLayouts: DOMRect[] = [];
        if (count === 0) return gridLayouts;
        const numCols = forceCols || Math.ceil(Math.sqrt(count));
        const numRows = Math.ceil(count / numCols);
        const cellW = (w - (numCols - 1) * g) / numCols;
        const cellH = (h - (numRows - 1) * g) / numRows;
        for(let i=0; i < count; i++) {
            const row = Math.floor(i / numCols);
            const col = i % numCols;
            const cellX = x + col * (cellW + g);
            const cellY = y + row * (cellH + g);
            gridLayouts.push({ x: cellX, y: cellY, width: cellW, height: cellH });
        }
        return gridLayouts;
    }
    switch(mode) {
        case 'grid': return calculateGrid(imageCount, gap, gap, canvasWidth - gap * 2, canvasHeight - gap * 2, gap);
        case 'left-big':
            if (imageCount > 0) layouts.push({ x: gap, y: gap, width: canvasWidth / 2 - gap * 1.5, height: canvasHeight - gap * 2 });
            if (imageCount > 1) layouts.push(...calculateGrid(imageCount - 1, canvasWidth / 2 + gap / 2, gap, canvasWidth / 2 - gap * 1.5, canvasHeight - gap * 2, gap));
            break;
        case 'top-big':
            if (imageCount > 0) layouts.push({ x: gap, y: gap, width: canvasWidth - gap * 2, height: canvasHeight / 2 - gap * 1.5 });
            if (imageCount > 1) layouts.push(...calculateGrid(imageCount - 1, gap, canvasHeight / 2 + gap/2, canvasWidth - gap * 2, canvasHeight / 2 - gap * 1.5, gap));
            break;
        case 'feature-row':
            if (imageCount > 0) layouts.push({ x: gap, y: gap, width: canvasWidth * (2/3) - gap * 1.5, height: canvasHeight - gap * 2 });
            if (imageCount > 1) layouts.push(...calculateGrid(imageCount - 1, canvasWidth * (2/3) + gap/2, gap, canvasWidth * (1/3) - gap*1.5, canvasHeight - gap*2, gap, 1));
            break;
        case 'feature-column':
            if (imageCount > 0) layouts.push({ x: gap, y: gap, width: canvasWidth - gap * 2, height: canvasHeight * (2/3) - gap * 1.5 });
            if (imageCount > 1) layouts.push(...calculateGrid(imageCount - 1, gap, canvasHeight * (2/3) + gap/2, canvasWidth - gap * 2, canvasHeight * (1/3) - gap*1.5, gap));
            break;
        case 'single-blur':
            if (imageCount > 0) {
                const mainW = canvasWidth * 0.7;
                const mainH = canvasHeight * 0.7;
                layouts.push({ x: (canvasWidth - mainW) / 2, y: (canvasHeight - mainH) / 2, width: mainW, height: mainH });
            }
            if (imageCount > 1) {
                const bgCount = imageCount - 1;
                const bgGridSize = Math.ceil(Math.sqrt(bgCount));
                if (bgGridSize > 0) {
                    const bgCellW = canvasWidth / bgGridSize;
                    const bgCellH = canvasHeight / bgGridSize;
                    for (let i = 0; i < bgCount; i++) {
                        const row = Math.floor(i / bgGridSize);
                        const col = i % bgGridSize;
                        layouts.push({ x: col * bgCellW, y: row * bgCellH, width: bgCellW, height: bgCellH });
                    }
                }
            }
            break;
        case 'freeform': // No predefined layouts for freeform
            break;
    }
    return layouts;
}

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayInputRef = useRef<HTMLInputElement>(null);
  const bgImageInputRef = useRef<HTMLInputElement>(null);
  const fontInputRef = useRef<HTMLInputElement>(null);
  const imageLayoutsRef = useRef<DOMRect[]>([]);
  
  // App loading state
  const [isLoading, setIsLoading] = useState(true);

  // Core state
  const [images, setImages] = useState<AppImage[]>([]);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('grid');
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  // Layout state
  const [gap, setGap] = useState<number>(10);
  const [globalZoom, setGlobalZoom] = useState<number>(1);
  const [imageFit, setImageFit] = useState<ImageFit>('contain');
  const [mainZoom, setMainZoom] = useState<number>(1.5); // for single-blur
  const [bgBlur, setBgBlur] = useState<number>(5);
  const [bgOpacity, setBgOpacity] = useState<number>(0.5);

  // Background state
  const [backgroundColor, setBackgroundColor] = useState<string>('#E5E7EB');
  const [backgroundType, setBackgroundType] = useState<'color' | 'image'>('color');
  const [backgroundImage, setBackgroundImage] = useState<AppImage | null>(null);
  const [backgroundImageFit, setBackgroundImageFit] = useState<ImageFit>('cover');
  const [backgroundImageOpacity, setBackgroundImageOpacity] = useState<number>(1);

  // Overlays state
  const [overlayImages, setOverlayImages] = useState<OverlayImage[]>([]);
  const [textOverlays, setTextOverlays] = useState<TextOverlay[]>([]);
  const [customFonts, setCustomFonts] = useState<{ name: string; url: string; }[]>([]);


  // Interaction state
  const [interaction, setInteraction] = useState<InteractionState>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [isDraggingOverCanvas, setIsDraggingOverCanvas] = useState(false);
  const [previewFont, setPreviewFont] = useState<string | null>(null);
  
  const [exportName, setExportName] = useState<string>('grid-mockup');
  
  // --- Effects ---


  useEffect(() => {
    try {

      const savedTheme = localStorage.getItem('grid-mockup-theme');
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const dark = savedTheme === 'dark' || (!savedTheme && prefersDark);
      
      if (dark) {
          setIsDarkMode(true);
      }
      // Initialize background color based on theme, but it can be changed by the user later.
      setBackgroundColor(dark ? '#111827' : '#e5e7eb');
    } catch(e) {
      console.error("Failed to load settings from localStorage", e);
    }
  }, []);

  useEffect(() => {
    try {
    } catch(e) {
    }

  // Update theme class and save preference
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('grid-mockup-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('grid-mockup-theme', 'light');
    }
  }, [isDarkMode]);

    // Dynamically load Google Fonts from all text overlays + preview font
    useEffect(() => {
        const uniqueFonts = new Set(textOverlays.map(t => t.fontFamily));
        if (previewFont && GOOGLE_FONTS.includes(previewFont)) {
            uniqueFonts.add(previewFont);
        }
        
        uniqueFonts.forEach(fontFamily => {
            if (GOOGLE_FONTS.includes(fontFamily)) {
                const linkId = `google-font-${fontFamily.replace(/ /g, '-')}`;
                if (!document.getElementById(linkId)) {
                    const link = document.createElement('link');
                    link.id = linkId;
                    link.rel = 'stylesheet';
                    link.href = `https://fonts.googleapis.com/css2?family=${fontFamily.replace(/ /g, '+')}:wght@400;700&display=swap`;
                    document.head.appendChild(link);
                }
            }
        });
    }, [textOverlays, previewFont]);
  
  // Prevent browser from opening dropped files globally
  useEffect(() => {
    const preventDefault = (e: DragEvent) => e.preventDefault();
    window.addEventListener('dragover', preventDefault);
    window.addEventListener('drop', preventDefault);
    return () => {
        window.removeEventListener('dragover', preventDefault);
        window.removeEventListener('drop', preventDefault);
    };
  }, []);

  const drawImageWithTransform = (ctx: CanvasRenderingContext2D, image: AppImage | OverlayImage, fit: ImageFit, zoom: number, slot: DOMRect) => {
    if (!image.img.complete || image.img.naturalWidth === 0) return;
    const { img } = image;
    const { x, y, width, height } = slot;

    ctx.save();
    if ('opacity' in image) {
        ctx.globalAlpha = image.opacity;
    }
    
    const drawFn = fit === 'contain' ? drawImageToContain : drawImageToFill;
    drawFn(ctx, img, x, y, width, height, zoom);

    ctx.restore();
  };
  
  const getTextBoundingBox = useCallback((ctx: CanvasRenderingContext2D, textOverlay: TextOverlay, currentPreviewFont: string | null = null, currentSelectedId: string | null = null): DOMRect & { metrics: TextMetrics } => {
      const { id, content, fontSize, fontFamily, textBg, textBgPadding } = textOverlay;
      const effectiveFontFamily = (id === currentSelectedId && currentPreviewFont) ? currentPreviewFont : fontFamily;
      ctx.font = `bold ${fontSize}px "${effectiveFontFamily}"`;
      const metrics = ctx.measureText(content);
      const width = metrics.width + (textBg ? textBgPadding * 2 : 0);
      const height = (metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent) + (textBg ? textBgPadding * 2 : 0);
      // x,y in TextOverlay is the center point. Bounding box needs top-left.
      const x = textOverlay.x - width / 2;
      const y = textOverlay.y - height / 2;
      return { x, y, width, height, metrics };
  }, []);

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 1. Draw Background (Color or Image)
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    if (backgroundType === 'image' && backgroundImage && backgroundImage.img.complete) {
        ctx.save();
        ctx.globalAlpha = backgroundImageOpacity;
        const drawFn = backgroundImageFit === 'contain' ? drawImageToContain : drawImageToFill;
        drawFn(ctx, backgroundImage.img, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT, 1);
        ctx.restore();
    } else {
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    }

    if (images.length === 0 && overlayImages.length === 0 && textOverlays.length === 0) {
        ctx.save();
        ctx.fillStyle = isDarkMode ? '#9ca3af' : '#6b7280';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = '48px Inter';
        ctx.fillText('Upload or drop images to begin', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
        ctx.restore();
    }
    
    // 2. Draw main images
    if (layoutMode === 'freeform') {
        images.forEach(img => {
            ctx.save();
            ctx.translate(img.x + img.width / 2, img.y + img.height / 2);
            ctx.rotate((img.rotation * Math.PI) / 180);
            ctx.translate(-(img.x + img.width / 2), -(img.y + img.height / 2));
            drawImageWithTransform(ctx, img, imageFit, globalZoom, { x: img.x, y: img.y, width: img.width, height: img.height });
            ctx.restore();
        });
    } else {
        const layouts = calculateLayouts(layoutMode, images.length, CANVAS_WIDTH, CANVAS_HEIGHT, gap);
        imageLayoutsRef.current = layouts;

        if (layoutMode === 'single-blur') {
             if (images.length > 1) {
                ctx.save();
                const bgGrid = calculateLayouts('grid', images.length - 1, CANVAS_WIDTH, CANVAS_HEIGHT, 0);
                ctx.filter = `blur(${bgBlur}px)`;
                images.slice(1).forEach((img, i) => {
                    drawImageToFill(ctx, img.img, bgGrid[i].x, bgGrid[i].y, bgGrid[i].width, bgGrid[i].height, globalZoom);
                });
                ctx.restore();
                ctx.save()
                ctx.fillStyle = `rgba(${isDarkMode ? '17, 24, 39' : '229, 231, 235'}, ${1 - bgOpacity})`;
                ctx.fillRect(0,0,CANVAS_WIDTH, CANVAS_HEIGHT);
                ctx.restore();
            }
            if (images.length > 0) {
                drawImageWithTransform(ctx, images[0], imageFit, globalZoom * mainZoom, layouts[0]);
            }
        } else {
            images.forEach((img, i) => {
                if(layouts[i]) {
                    drawImageWithTransform(ctx, img, imageFit, globalZoom, layouts[i]);
                }
            });
        }
    }
    
    // 3. Draw overlays
    overlayImages.forEach(overlay => {
        ctx.save();
        ctx.translate(overlay.x + overlay.width / 2, overlay.y + overlay.height / 2);
        ctx.rotate((overlay.rotation * Math.PI) / 180);
        ctx.translate(-(overlay.x + overlay.width / 2), -(overlay.y + overlay.height / 2));
        drawImageWithTransform(ctx, overlay, 'contain', 1, {x: overlay.x, y: overlay.y, width: overlay.width, height: overlay.height});
        ctx.restore();
    });

    // 4. Draw Text Overlays
    textOverlays.forEach(text => {
        const { x, y, rotation, fontSize, content, textBg, textBgPadding, textBgOpacity, textBgColor, textColor, shadow } = text;
        const fontFamily = (text.id === selectedItemId && previewFont) ? previewFont : text.fontFamily;

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate((rotation * Math.PI) / 180);
        ctx.font = `bold ${fontSize}px "${fontFamily}"`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        if (textBg) {
            const { metrics } = getTextBoundingBox(ctx, text, previewFont, selectedItemId);
            const bgW = metrics.width + textBgPadding * 2;
            const bgH = (metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent) + textBgPadding * 2;
            ctx.globalAlpha = textBgOpacity;
            ctx.fillStyle = textBgColor;
            ctx.fillRect(-bgW / 2, -bgH / 2, bgW, bgH);
            ctx.globalAlpha = 1.0;
        }

        ctx.fillStyle = textColor;
        if (shadow) {
            ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
            ctx.shadowBlur = 15;
            ctx.shadowOffsetX = 5;
            ctx.shadowOffsetY = 5;
        }
        ctx.fillText(content, 0, 0);
        ctx.restore();
    });


    // 5. Draw selection handles for interactive items
    if (selectedItemId) {
        const imgItem = [...images, ...overlayImages].find(i => i.id === selectedItemId);
        const textItem = textOverlays.find(t => t.id === selectedItemId);
        const isOverlay = overlayImages.some(o => o.id === selectedItemId);
        
        if (imgItem && (isOverlay || layoutMode === 'freeform')) {
             drawSelectionHandles(ctx, imgItem.x, imgItem.y, imgItem.width, imgItem.height, imgItem.rotation);
        } else if (textItem) {
            const bbox = getTextBoundingBox(ctx, textItem, previewFont, selectedItemId);
            drawSelectionHandles(ctx, bbox.x, bbox.y, bbox.width, bbox.height, textItem.rotation);
        }
    }

  }, [images, overlayImages, textOverlays, layoutMode, gap, globalZoom, imageFit, mainZoom, bgBlur, bgOpacity, selectedItemId, isDarkMode, backgroundColor, backgroundType, backgroundImage, backgroundImageFit, backgroundImageOpacity, getTextBoundingBox, previewFont]);
  
  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  const processFiles = (files: FileList | null, isOverlay: boolean = false) => {
    if (!files) return;
    const fileArray = Array.from(files);

    fileArray.forEach(file => {
        const id = self.crypto.randomUUID();
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.src = url;
        img.onload = () => {
            if (isOverlay) {
                const newOverlay: OverlayImage = {
                    id, url, img,
                    x: CANVAS_WIDTH / 2 - 150,
                    y: CANVAS_HEIGHT / 2 - 150,
                    width: 300,
                    height: 300 * (img.naturalHeight / img.naturalWidth) || 300,
                    rotation: 0,
                    opacity: 1.0,
                };
                setOverlayImages(prev => [...prev, newOverlay]);
            } else {
                const newImage: AppImage = {
                    id, url, img,
                    x: (images.length % 4) * 450 + 50,
                    y: Math.floor(images.length / 4) * 450 + 50,
                    width: 400,
                    height: 400 * (img.naturalHeight / img.naturalWidth) || 400,
                    rotation: 0,
                };
                setImages(prev => [...prev, newImage]);
            }
        };
    });
  };

  const handleImageUploadFromInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    processFiles(e.target.files, false);
    e.target.value = ''; // Allow re-uploading the same file
  };
  
  const handleOverlayUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    processFiles(e.target.files, true);
    e.target.value = ''; // Allow re-uploading the same file
  };
  
  const handleBackgroundImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const id = self.crypto.randomUUID();
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.src = url;
    img.onload = () => {
        // Clear old image if it exists
        if (backgroundImage) {
            URL.revokeObjectURL(backgroundImage.url);
        }
        setBackgroundImage({
            id, url, img,
            x: 0, y: 0, width: 0, height: 0, rotation: 0 // Not used for BG
        });
        setBackgroundType('image');
    };
    e.target.value = '';
  };

  const handleClearBackgroundImage = () => {
    if (backgroundImage) {
        URL.revokeObjectURL(backgroundImage.url);
    }
    setBackgroundImage(null);
  };

    const handleFontUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files) return;
        const file = e.target.files[0];
        if (!file) return;

        const fontName = file.name.replace(/\.(otf|ttf|woff|woff2)$/i, "").replace(/[-_]/g, " ");
        const combinedFonts = [...FONT_FAMILIES, ...customFonts.map(f => f.name)];

        if (combinedFonts.some(f => f.toLowerCase() === fontName.toLowerCase())) {
            alert(`Font "${fontName}" is already loaded.`);
            e.target.value = '';
            return;
        }

        const url = URL.createObjectURL(file);
        try {
            const font = new FontFace(fontName, `url(${url})`);
            await font.load();
            document.fonts.add(font);
            setCustomFonts(prev => [...prev, { name: fontName, url }]);
        } catch (err) {
            console.error("Failed to load font:", err);
            alert(`Could not load font "${fontName}". Please check the file format.`);
            URL.revokeObjectURL(url);
        }
        e.target.value = '';
    };

  const handleCanvasDrag = (e: React.DragEvent, isEntering: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    // Prevents flicker when dragging over child elements
    if (e.type === 'dragleave' && e.currentTarget.contains(e.relatedTarget as Node)) {
        return;
    }
    setIsDraggingOverCanvas(isEntering);
  };

  const handleCanvasDrop = (e: React.DragEvent) => {
    handleCanvasDrag(e, false); // This also calls preventDefault and stopPropagation
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
        processFiles(files, false);
    }
  };

  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (CANVAS_WIDTH / rect.width),
      y: (e.clientY - rect.top) * (CANVAS_HEIGHT / rect.height)
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getCanvasCoords(e);
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    
    // 1. Check for handle interaction on any selected item first
    if (selectedItemId) {
        const imgItem = [...images, ...overlayImages].find(i => i.id === selectedItemId);
        const textItem = textOverlays.find(t => t.id === selectedItemId);
        const isOverlay = overlayImages.some(o => o.id === selectedItemId);

        let item: (AppImage | OverlayImage | TextOverlay) | undefined = imgItem || textItem;
        let bbox: DOMRect | undefined;
        let itemType: 'image' | 'overlay' | 'text' | undefined;

        if (imgItem) {
            bbox = imgItem;
            itemType = isOverlay ? 'overlay' : 'image';
        } else if (textItem) {
            bbox = getTextBoundingBox(ctx, textItem, previewFont, selectedItemId);
            itemType = 'text';
        }

        if (item && bbox && itemType) {
            const handle = getHandleAt(x, y, { ...bbox, rotation: item.rotation });
            if (handle) {
                if (handle === 'delete') {
                    // Find which array the item is in and remove it
                    if (itemType === 'image') {
                        setImages(prev => prev.filter(i => i.id !== item!.id));
                    } else if (itemType === 'overlay') {
                        setOverlayImages(prev => prev.filter(o => o.id !== item!.id));
                    } else if (itemType === 'text') {
                        setTextOverlays(prev => prev.filter(t => t.id !== item!.id));
                    }
                    setSelectedItemId(null);
                    setInteraction(null); // Ensure no interaction state is lingering
                    return; // Done
                }

                // Existing handle logic for rotate/resize
                setInteraction({
                    type: handle,
                    itemId: item.id,
                    itemType,
                    startX: bbox.x, startY: bbox.y,
                    startEventX: x, startEventY: y,
                    startW: bbox.width, startH: bbox.height,
                    startRot: item.rotation,
                    aspectRatio: bbox.width / bbox.height,
                    startFontSize: textItem?.fontSize,
                });
                return;
            }
        }
    }

    // 2. Check for drag interaction (overlays and text are checked first as they are on top)
    for (const item of [...textOverlays].reverse()) {
        const bbox = getTextBoundingBox(ctx, item, null, null); // Hit-test with actual font
        if (isPointInRotatedRect(x, y, {...bbox, rotation: item.rotation})) {
            setSelectedItemId(item.id);
            setTextOverlays(prev => [...prev.filter(t => t.id !== item.id), item]); // Bring to front
            setInteraction({ type: 'drag', itemId: item.id, itemType: 'text', startX: item.x, startY: item.y, startEventX: x, startEventY: y, startW: bbox.width, startH: bbox.height, startRot: item.rotation, aspectRatio: bbox.width / bbox.height });
            return;
        }
    }

    for (const item of [...overlayImages].reverse()) {
        if (isPointInRotatedRect(x, y, item)) {
            setSelectedItemId(item.id);
            setOverlayImages(prev => [...prev.filter(o => o.id !== item.id), item]); // Bring to front
            setInteraction({ type: 'drag', itemId: item.id, itemType: 'overlay', startX: item.x, startY: item.y, startEventX: x, startEventY: y, startW: item.width, startH: item.height, startRot: item.rotation, aspectRatio: item.width / item.height });
            return;
        }
    }
    
    // Images are only draggable in freeform mode
    if (layoutMode === 'freeform') {
        for (const item of [...images].reverse()) {
            if (isPointInRotatedRect(x, y, item)) {
                setSelectedItemId(item.id);
                setImages(prev => [...prev.filter(i => i.id !== item.id), item]); // Bring to front
                setInteraction({ type: 'drag', itemId: item.id, itemType: 'image', startX: item.x, startY: item.y, startEventX: x, startEventY: y, startW: item.width, startH: item.height, startRot: item.rotation, aspectRatio: item.width / item.height });
                return;
            }
        }
    }

    // 4. If nothing was hit, deselect
    setSelectedItemId(null);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!interaction) return;
    const { x, y } = getCanvasCoords(e);
    const dx = x - interaction.startEventX;
    const dy = y - interaction.startEventY;

    const updateItem = (item: any) => {
        let newItem = {...item};
        switch (interaction.type) {
            case 'drag':
                newItem.x = interaction.startX + dx;
                newItem.y = interaction.startY + dy;
                break;
            case 'rotate':
                const centerX = interaction.startX + interaction.startW / 2;
                const centerY = interaction.startY + interaction.startH / 2;
                const newAngle = Math.atan2(y - centerY, x - centerX) * 180 / Math.PI;
                newItem.rotation = newAngle + 90; // Adjust for handle position
                break;
            case 'resize-br':
                const cos = Math.cos(interaction.startRot * Math.PI / 180);
                const sin = Math.sin(interaction.startRot * Math.PI / 180);
                const rotatedDx = dx * cos + dy * sin;

                if (interaction.itemType === 'text') {
                    const scaleFactor = (interaction.startW + rotatedDx) / interaction.startW;
                    newItem.fontSize = Math.max(8, interaction.startFontSize! * scaleFactor);
                } else {
                    const newWidth = interaction.startW + rotatedDx;
                    newItem.width = Math.max(20, newWidth);
                    newItem.height = newItem.width / interaction.aspectRatio;
                }
                break;
        }
        return newItem;
    };
    
    if (interaction.itemType === 'image') {
        setImages(imgs => imgs.map(i => i.id === interaction.itemId ? updateItem(i) : i));
    } else if (interaction.itemType === 'overlay') {
        setOverlayImages(overlays => overlays.map(o => o.id === interaction.itemId ? updateItem(o) : o));
    } else if (interaction.itemType === 'text') {
        setTextOverlays(texts => texts.map(t => t.id === interaction.itemId ? updateItem(t) : t));
    }
  };

  const handleMouseUp = () => {
    setInteraction(null);
  };
  
  const handleMouseLeave = () => {
    setInteraction(null);
  };
  
  const drawImageToFill = (ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number, zoom: number = 1) => {
    if (!img.complete || img.naturalWidth === 0) return;
    const imgRatio = img.width / img.height;
    const containerRatio = w / h;
    let sw, sh, sx, sy;
    if (imgRatio > containerRatio) { sh = img.height; sw = sh * containerRatio; sx = (img.width - sw) / 2; sy = 0; } 
    else { sw = img.width; sh = sw / containerRatio; sx = 0; sy = (img.height - sh) / 2; }
    const zoomFactor = 1 / zoom;
    sx += (sw * (1 - zoomFactor)) / 2; sy += (sh * (1 - zoomFactor)) / 2;
    sw *= zoomFactor; sh *= zoomFactor;
    ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
  };
  
  const drawImageToContain = (ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number, zoom: number = 1) => {
    if (!img.complete || img.naturalWidth === 0) return;
    const imgRatio = img.width / img.height;
    const containerRatio = w / h;
    let dw, dh, dx, dy;
    if (imgRatio > containerRatio) { dw = w; dh = w / imgRatio; dx = x; dy = y + (h - dh) / 2; } 
    else { dh = h; dw = h * imgRatio; dy = y; dx = x + (w - dw) / 2; }
    const zoomedW = dw * zoom; const zoomedH = dh * zoom;
    dx -= (zoomedW - dw) / 2; dy -= (zoomedH - dh) / 2;
    ctx.drawImage(img, dx, dy, zoomedW, zoomedH);
  };

  const drawSelectionHandles = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, rotation: number) => {
    ctx.save();
    ctx.translate(x + w / 2, y + h / 2);
    ctx.rotate(rotation * Math.PI / 180);
    ctx.strokeStyle = '#22c55e'; // green-500
    ctx.lineWidth = 4;
    ctx.strokeRect(-w / 2, -h / 2, w, h);
    
    // Bottom-right resize handle
    const handleSize = 20;
    ctx.fillStyle = '#22c55e';
    ctx.fillRect(w / 2 - handleSize / 2, h / 2 - handleSize / 2, handleSize, handleSize);

    // Top-center rotate handle
    ctx.beginPath();
    ctx.moveTo(0, -h / 2);
    ctx.lineTo(0, -h / 2 - 40);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, -h/2 - 40, handleSize / 2, 0, 2 * Math.PI);
    ctx.fill();

    // Top-right delete handle
    const deleteHandleRadius = 12;
    ctx.save();
    // Position at the top-right corner of the bounding box
    ctx.translate(w / 2, -h / 2);
    // Counter-rotate so the handle is not rotated with the item
    ctx.rotate(-rotation * Math.PI / 180);
    
    ctx.fillStyle = '#ef4444'; // red-500
    ctx.beginPath();
    ctx.arc(0, 0, deleteHandleRadius, 0, 2 * Math.PI);
    ctx.fill();
    
    // Draw 'X'
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    const xSize = deleteHandleRadius * 0.5;
    ctx.beginPath();
    ctx.moveTo(-xSize, -xSize);
    ctx.lineTo(xSize, xSize);
    ctx.moveTo(xSize, -xSize);
    ctx.lineTo(-xSize, xSize);
    ctx.stroke();
    
    ctx.restore();

    ctx.restore();
  };
  
  const getHandleAt = (x: number, y: number, itemBox: Transformable): 'resize-br' | 'rotate' | 'delete' | null => {
    const { x: ix, y: iy, width, height, rotation } = itemBox;
    const handleSize = 30; // A larger hit area for handles
    const deleteHandleRadius = 15;
    const center = { x: ix + width / 2, y: iy + height / 2 };
    
    const angle = rotation * Math.PI / 180;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    
    // A point (px, py) relative to the center, when rotated, becomes:
    // new_x = center.x + px * cos - py * sin
    // new_y = center.y + px * sin + py * cos

    // Top-right corner (delete handle)
    // Relative coords: (width / 2, -height / 2)
    const del_x = center.x + (width / 2) * cos - (-height / 2) * sin;
    const del_y = center.y + (width / 2) * sin + (-height / 2) * cos;
    if (Math.hypot(x - del_x, y - del_y) < deleteHandleRadius) return 'delete';

    // Bottom-right corner (resize handle)
    // Relative coords: (width / 2, height / 2)
    const br_x = center.x + (width/2) * cos - (height/2) * sin;
    const br_y = center.y + (width/2) * sin + (height/2) * cos;
    if (Math.hypot(x - br_x, y - br_y) < handleSize) return 'resize-br';
    
    // Top-center (rotate handle)
    // Relative coords: (0, -height / 2 - 40)
    const rot_x = center.x - (-height/2 - 40) * sin;
    const rot_y = center.y + (-height/2 - 40) * cos;
    if (Math.hypot(x - rot_x, y - rot_y) < handleSize/2) return 'rotate';

    return null;
  }

  const isPointInRotatedRect = (x:number, y:number, item: Transformable) => {
      const { x: ix, y: iy, width: w, height: h, rotation: rot } = item;
      const center = { x: ix + w / 2, y: iy + h / 2 };
      const angle = -rot * Math.PI / 180;
      const localX = (x - center.x) * Math.cos(angle) - (y - center.y) * Math.sin(angle);
      const localY = (x - center.x) * Math.sin(angle) + (y - center.y) * Math.cos(angle);
      return Math.abs(localX) < w / 2 && Math.abs(localY) < h / 2;
  }
  
  const handleExport = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const tempSelected = selectedItemId;
    setSelectedItemId(null); // Hide selection handles for export
    setTimeout(() => {
        const link = document.createElement('a');
        link.download = `${exportName || 'grid-mockup'}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        setSelectedItemId(tempSelected);
    }, 50);
  };
  
    const handleAddText = () => {
        const newText: TextOverlay = {
            id: self.crypto.randomUUID(),
            content: 'New Text',
            x: CANVAS_WIDTH / 2,
            y: CANVAS_HEIGHT / 2,
            rotation: 0,
            fontSize: 80,
            fontFamily: 'Inter',
            textColor: isDarkMode ? '#FFFFFF' : '#000000',
            shadow: true,
            textBg: true,
            textBgColor: isDarkMode ? '#000000' : '#FFFFFF',
            textBgOpacity: 0.5,
            textBgPadding: 20,
        };
        setTextOverlays(prev => [...prev, newText]);
        setSelectedItemId(newText.id);
    };

    if (!name.trim()) {
        alert("Please enter a valid preset name.");
        return;
    }
        name,
        settings: {
            layoutMode, gap, globalZoom, mainZoom, bgBlur, bgOpacity, imageFit,
            textOverlays,
        }
    };
        const existingIndex = prev.findIndex(p => p.name === name);
        if (existingIndex > -1) {
            const updated = [...prev];
            return updated;
        }
    });
  };

      if (preset) {
          const { settings } = preset;
          setLayoutMode(settings.layoutMode);
          setGap(settings.gap);
          setGlobalZoom(settings.globalZoom);
          setMainZoom(settings.mainZoom);
          setBgBlur(settings.bgBlur);
          setBgOpacity(settings.bgOpacity);
          setImageFit(settings.imageFit);
          setTextOverlays(settings.textOverlays || []);
      }
  };

      }
  };


  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-950 text-gray-800 dark:text-gray-100 font-sans">
      <aside className="w-[380px] h-full bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex flex-col">
        <div className="p-4 space-y-2 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-3">
                <div>
                    <h1 className="text-lg font-bold">LavenderDragonDesign</h1>
                    <h2 className="text-sm text-gray-600 dark:text-gray-400">Grid Mockup Generator</h2>
                </div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
                Create stunning mockups. Arrange images, add text, and export your designs.
            </p>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <ImageThumbnails 
                images={images} 
                setImages={setImages} 
                onImageUpload={handleImageUploadFromInput}
                onImageDrop={(files) => processFiles(files, false)}
            />
            
            <ControlPanel 
                isDarkMode={isDarkMode} setIsDarkMode={setIsDarkMode}
                layoutMode={layoutMode} setLayoutMode={setLayoutMode}
                imageFit={imageFit} setImageFit={setImageFit}
                gap={gap} setGap={setGap}
                globalZoom={globalZoom} setGlobalZoom={setGlobalZoom}
                mainZoom={mainZoom} setMainZoom={setMainZoom}
                bgBlur={bgBlur} setBgBlur={setBgBlur}
                bgOpacity={bgOpacity} setBgOpacity={setBgOpacity}
                backgroundColor={backgroundColor} setBackgroundColor={setBackgroundColor}
                backgroundType={backgroundType} setBackgroundType={setBackgroundType}
                backgroundImage={backgroundImage} onClearBackgroundImage={handleClearBackgroundImage}
                backgroundImageFit={backgroundImageFit} setBackgroundImageFit={setBackgroundImageFit}
                backgroundImageOpacity={backgroundImageOpacity} setBackgroundImageOpacity={setBackgroundImageOpacity}
                onBackgroundImageUpload={() => bgImageInputRef.current?.click()}
                
                textOverlays={textOverlays}
                setTextOverlays={setTextOverlays}
                onAddText={handleAddText}
                selectedItemId={selectedItemId}
                setSelectedItemId={setSelectedItemId}
                customFonts={customFonts.map(f => f.name)}
                onFontUpload={() => fontInputRef.current?.click()}
                setPreviewFont={setPreviewFont}

                overlayImages={overlayImages} setOverlayImages={setOverlayImages}
                onOverlayUploadClick={() => overlayInputRef.current?.click()}
                exportName={exportName} setExportName={setExportName}
                onExport={handleExport}
            />
        </div>
        <footer className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-3 text-center">
            <a href="https://buymeacoffee.com/lavenderdragondesigns" target="_blank" rel="noopener noreferrer" className="inline-block">
                <img src="https://i.postimg.cc/28YhHbfZ/bmc-button.png" alt="Buy Me a Coffee" className="h-10 mx-auto" />
            </a>
            <p className="text-xs text-gray-500 dark:text-gray-400">
                Dev. By A. Kessler - Made With <span className="text-red-500">♥</span>
            </p>
        </footer>
        <input type="file" ref={overlayInputRef} onChange={handleOverlayUpload} className="hidden" accept="image/*" multiple />
        <input type="file" ref={bgImageInputRef} onChange={handleBackgroundImageUpload} className="hidden" accept="image/*" />
        <input type="file" ref={fontInputRef} onChange={handleFontUpload} className="hidden" accept=".ttf,.otf,.woff,.woff2" />
      </aside>
      <main 
        className="relative flex-1 flex items-center justify-center p-4 bg-gray-100 dark:bg-gray-950 overflow-hidden"
        onDragEnter={(e) => handleCanvasDrag(e, true)}
        onDragOver={(e) => handleCanvasDrag(e, true)}
        onDragLeave={(e) => handleCanvasDrag(e, false)}
        onDrop={handleCanvasDrop}
      >
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="max-w-full max-h-full object-contain shadow-2xl bg-white dark:bg-gray-900 shadow-black/20"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          style={{ cursor: interaction ? 'grabbing' : 'default' }}
        />
        {isDraggingOverCanvas && (
            <div className="absolute inset-4 bg-green-500/20 border-2 border-dashed border-green-500 rounded-lg flex flex-col items-center justify-center z-10 pointer-events-none">
                <Icon name="UploadCloud" size={64} className="text-green-600 dark:text-green-400" />
                <p className="font-semibold text-xl text-green-700 dark:text-green-400 mt-4">Drop images to upload</p>
            </div>
        )}
      </main>
    </div>
  );
}

export default App;
