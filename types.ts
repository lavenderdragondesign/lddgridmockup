export type LayoutMode =
  | 'grid'
  | 'left-big'
  | 'right-big'
  | 'top-big'
  | 'bottom-big'
  | 'single-blur'
  | 'freeform';

export interface ImageState {
  id: string;
  url: string;
  file: File;
  // Properties for freeform layout
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  zIndex?: number;
}

export interface TextLayer {
  id:string;
  text: string;
  x: number;
  y: number;
  fontSize: number;
  fontFamily: string;
  color: string;
  rotation: number;
  shadow: boolean;
  backgroundColor: string;
  backgroundOpacity: number;
  padding: number;
}

export type WatermarkPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';

export interface WatermarkState {
  id: string;
  url: string;
  file: File;
  opacity: number;
  size: number; // percentage of canvas width
  position: WatermarkPosition;
}

export type BackgroundType = 'color' | 'image';

export interface BackgroundState {
    type: BackgroundType;
    value: string | ImageState | null; 
}


// --- Web Worker Types ---

// A version of ImageState that can be sent to a worker (no File or URL objects)
export type SerializableImageState = Omit<ImageState, 'url' | 'file' | 'fileHandle'>;

// The full state of the canvas settings and layers sent to the worker
export interface WorkerStatePayload {
    layoutMode: LayoutMode;
    images: SerializableImageState[];
    textLayers: TextLayer[];
    watermark: Omit<WatermarkState, 'url' | 'file' | 'fileHandle'> | null;
    background: Omit<BackgroundState, 'value'> & { value: string | SerializableImageState | null };
    gap: number;
    globalZoom: number;
    imageFit: 'contain' | 'cover';
    mainZoom: number;
    bgBlur: number;
    bgOpacity: number;
}

// The collection of ImageBitmaps sent to the worker
export interface WorkerBitmapsPayload {
    grid: ImageBitmap[];
    watermark: ImageBitmap | null;
    background: ImageBitmap | null;
}

// The complete data structure for the message sent to the export worker
export interface WorkerMessageData {
    canvas: OffscreenCanvas;
    sourceDimensions: { width: number; height: number };
    state: WorkerStatePayload;
    bitmaps: WorkerBitmapsPayload;
}