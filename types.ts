
export type LayoutMode = 'grid' | 'left-big' | 'top-big' | 'feature-row' | 'feature-column' | 'single-blur' | 'freeform';
export type ImageFit = 'cover' | 'contain';

export interface AppImage {
  id: string;
  url: string;
  img: HTMLImageElement;
  // Properties for freeform layout, initialized on upload
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number; // in degrees
}

export interface OverlayImage {
  id: string;
  url: string;
  img: HTMLImageElement;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number; // in degrees
  opacity: number;
}

export interface TextOverlay {
  id: string;
  content: string;
  x: number;
  y: number;
  rotation: number;
  fontSize: number;
  fontFamily: string;
  textColor: string;
  shadow: boolean;
  textBg: boolean;
  textBgColor: string;
  textBgOpacity: number;
  textBgPadding: number;
}


  name: string;
  settings: {
    layoutMode: LayoutMode;
    gap: number;
    globalZoom: number;
    mainZoom: number;
    bgBlur: number;
    bgOpacity: number;
    imageFit: ImageFit;
    textOverlays: TextOverlay[];
  };
}