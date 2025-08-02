import React, {useState, useMemo} from 'react';
import { FONT_FAMILIES } from '../constants';
import { Slider } from './ui/Slider';
import { Select } from './ui/Select';
import { Button } from './ui/Button';
import { Icon } from './ui/Icon';

interface ControlPanelProps {
  isDarkMode: boolean;
  setIsDarkMode: (isDark: boolean) => void;
  layoutMode: LayoutMode;
  setLayoutMode: (mode: LayoutMode) => void;
  imageFit: ImageFit;
  setImageFit: (fit: ImageFit) => void;
  gap: number;
  setGap: (gap: number) => void;
  globalZoom: number;
  setGlobalZoom: (zoom: number) => void;
  mainZoom: number;
  setMainZoom: (zoom: number) => void;
  bgBlur: number;
  setBgBlur: (blur: number) => void;
  bgOpacity: number;
  setBgOpacity: (opacity: number) => void;
  backgroundColor: string;
  setBackgroundColor: (color: string) => void;
  backgroundType: 'color' | 'image';
  setBackgroundType: (type: 'color' | 'image') => void;
  backgroundImage: AppImage | null;
  onClearBackgroundImage: () => void;
  backgroundImageFit: ImageFit;
  setBackgroundImageFit: (fit: ImageFit) => void;
  backgroundImageOpacity: number;
  setBackgroundImageOpacity: (opacity: number) => void;
  onBackgroundImageUpload: () => void;

  textOverlays: TextOverlay[];
  setTextOverlays: React.Dispatch<React.SetStateAction<TextOverlay[]>>;
  onAddText: () => void;
  selectedItemId: string | null;
  setSelectedItemId: (id: string | null) => void;
  customFonts: string[];
  onFontUpload: () => void;
  setPreviewFont: (font: string | null) => void;

  overlayImages: OverlayImage[];
  setOverlayImages: React.Dispatch<React.SetStateAction<OverlayImage[]>>;
  onOverlayUploadClick: () => void;
  exportName: string;
  setExportName: (name: string) => void;
  onExport: () => void;
}

const ControlSection: React.FC<{ title: string; icon: string; children: React.ReactNode }> = ({ title, icon, children }) => (
  <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-3 border border-gray-200/80 dark:border-gray-700">
    <h3 className="text-sm font-semibold text-green-700 dark:text-green-400 flex items-center space-x-2">
      <Icon name={icon} size={16} />
      <span>{title}</span>
    </h3>
    <div className="space-y-4">{children}</div>
  </div>
);

const Toggle: React.FC<{label: string; enabled: boolean; onChange: (enabled: boolean) => void}> = ({ label, enabled, onChange}) => (
    <div className="flex items-center justify-between">
        <span className="text-sm text-gray-600 dark:text-gray-300">{label}</span>
        <button onClick={() => onChange(!enabled)} className={`w-12 h-6 rounded-full transition-colors ${enabled ? 'bg-green-600' : 'bg-gray-400 dark:bg-gray-500'}`}>
            <span className={`block w-4 h-4 m-1 bg-white rounded-full transform transition-transform ${enabled ? 'translate-x-6' : 'translate-x-0'}`} />
        </button>
    </div>
);

const FontSelector: React.FC<{
    allFonts: string[];
    selectedFont: string;
    onSelectFont: (font: string) => void;
    setPreviewFont: (font: string | null) => void;
    onUpload: () => void;
}> = ({ allFonts, selectedFont, onSelectFont, setPreviewFont, onUpload }) => {
    const [filter, setFilter] = useState('');
    const filteredFonts = useMemo(() => 
        allFonts.filter(f => f.toLowerCase().includes(filter.toLowerCase())),
        [allFonts, filter]
    );

    return (
        <div className="flex flex-col space-y-2">
            <div className="flex justify-between items-center">
                <label className="text-xs text-gray-500 dark:text-gray-400">Font</label>
                <Button onClick={onUpload} className="!text-xs !py-1 !px-2 space-x-1">
                    <Icon name="Upload" size={12} />
                    <span>Upload</span>
                </Button>
            </div>
            <input 
                type="text" 
                placeholder="Search fonts..." 
                value={filter} 
                onChange={(e) => setFilter(e.target.value)}
                className="w-full bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
            />
            <div 
                className="max-h-40 overflow-y-auto border border-gray-200 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800"
                onMouseLeave={() => setPreviewFont(null)}
            >
                {filteredFonts.map(font => (
                    <button
                        key={font}
                        onClick={() => onSelectFont(font)}
                        onMouseEnter={() => setPreviewFont(font)}
                        className={`w-full text-left px-3 py-1.5 text-sm truncate ${selectedFont === font ? 'bg-green-600 text-white' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                        style={{ fontFamily: `'${font}', sans-serif`}}
                        title={font}
                    >
                        {font}
                    </button>
                ))}
            </div>
        </div>
    );
};


const ControlPanel: React.FC<ControlPanelProps> = (props) => {
  const {
    isDarkMode, setIsDarkMode,
    layoutMode, setLayoutMode, imageFit, setImageFit, gap, setGap, globalZoom, setGlobalZoom,
    mainZoom, setMainZoom, bgBlur, setBgBlur, bgOpacity, setBgOpacity,
    backgroundColor, setBackgroundColor, backgroundType, setBackgroundType, backgroundImage,
    onClearBackgroundImage, backgroundImageFit, setBackgroundImageFit, backgroundImageOpacity,
    setBackgroundImageOpacity, onBackgroundImageUpload,
    textOverlays, setTextOverlays, onAddText, selectedItemId, setSelectedItemId,
    customFonts, onFontUpload, setPreviewFont,
    overlayImages, setOverlayImages, onOverlayUploadClick,
    exportName, setExportName, onExport,
  } = props;

  const [draggedId, setDraggedId] = useState<string | null>(null);
  
  const selectedTextOverlay = useMemo(() => {
    return textOverlays.find(t => t.id === selectedItemId);
  }, [selectedItemId, textOverlays]);
  
  const allFonts = useMemo(() => [...FONT_FAMILIES, ...customFonts].sort(), [customFonts]);

  const handleTextPropChange = (prop: keyof TextOverlay, value: any) => {
      if (!selectedTextOverlay) return;
      setTextOverlays(prev => prev.map(t => t.id === selectedItemId ? { ...t, [prop]: value } : t));
  };
  
    const name = e.target.value;
  }
  
  const removeOverlay = (id: string) => {
      setOverlayImages(overlays => overlays.filter(o => o.id !== id));
  }

  const updateOverlayOpacity = (id: string, opacity: number) => {
      setOverlayImages(overlays => overlays.map(o => o.id === id ? {...o, opacity} : o));
  }

  const removeTextOverlay = (id: string) => {
      setTextOverlays(texts => texts.filter(t => t.id !== id));
      if (selectedItemId === id) {
          setSelectedItemId(null);
      }
  };

  const handleTextLayerDragStart = (e: React.DragEvent<HTMLDivElement>, id: string) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleTextLayerDrop = (e: React.DragEvent<HTMLDivElement>, targetId: string) => {
    e.preventDefault();
    if (!draggedId || draggedId === targetId) return;
    const draggedIndex = textOverlays.findIndex(t => t.id === draggedId);
    const targetIndex = textOverlays.findIndex(t => t.id === targetId);
    if (draggedIndex === -1 || targetIndex === -1) return;

    const newItems = [...textOverlays];
    const [draggedItem] = newItems.splice(draggedIndex, 1);
    newItems.splice(targetIndex, 0, draggedItem);
    setTextOverlays(newItems);
    setDraggedId(null);
  };


  return (
    <div className="space-y-4">
      <ControlSection title="Appearance" icon="SunMoon">
          <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-300">Theme</span>
              <div className="flex items-center space-x-2 p-1 bg-gray-200 dark:bg-gray-600 rounded-md">
                  <button onClick={() => setIsDarkMode(false)} className={`px-2 py-1 rounded text-sm ${!isDarkMode ? 'bg-white dark:bg-gray-800 shadow' : ''}`}>Light</button>
                  <button onClick={() => setIsDarkMode(true)} className={`px-2 py-1 rounded text-sm ${isDarkMode ? 'bg-white dark:bg-gray-900 shadow' : ''}`}>Dark</button>
              </div>
          </div>
      </ControlSection>
      
      <ControlSection title="Canvas Background" icon="PictureInPicture">
          <div className="flex items-center space-x-2 p-1 bg-gray-200 dark:bg-gray-700 rounded-md">
              <button onClick={() => setBackgroundType('color')} className={`flex-1 text-center px-2 py-1 rounded text-sm transition-all ${backgroundType === 'color' ? 'bg-white dark:bg-gray-800 shadow' : 'text-gray-600 dark:text-gray-300'}`}>Color</button>
              <button onClick={() => setBackgroundType('image')} className={`flex-1 text-center px-2 py-1 rounded text-sm transition-all ${backgroundType === 'image' ? 'bg-white dark:bg-gray-800 shadow' : 'text-gray-600 dark:text-gray-300'}`}>Image</button>
          </div>

          {backgroundType === 'color' && (
              <div className="flex flex-col space-y-1">
                  <label className="text-xs text-gray-500 dark:text-gray-400">Background Color</label>
                  <input type="color" value={backgroundColor} onChange={(e) => setBackgroundColor(e.target.value)}
                    className="w-full h-9 bg-transparent border border-gray-300 dark:border-gray-600 rounded-md cursor-pointer"
                  />
              </div>
          )}

          {backgroundType === 'image' && (
              <div className="space-y-3">
                  <Button onClick={onBackgroundImageUpload} className="w-full justify-center">
                      <Icon name="Upload" size={16} />
                      <span>{backgroundImage ? 'Change' : 'Upload'} Background Image</span>
                  </Button>
                  {backgroundImage && (
                      <div className="space-y-3 p-2 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
                          <div className="flex items-center space-x-2">
                              <img src={backgroundImage.url} className="w-10 h-10 object-cover rounded bg-gray-200 dark:bg-gray-700" alt="Background preview" />
                              <span className="text-xs flex-grow truncate">Background Image</span>
                              <button onClick={onClearBackgroundImage} className="p-2 text-red-600 hover:text-red-500">
                                  <Icon name="Trash2" size={16} />
                              </button>
                          </div>
                          <Select label="BG Image Fit" value={backgroundImageFit} onChange={(e) => setBackgroundImageFit(e.target.value as ImageFit)}>
                              <option value="cover">Cover (Fill)</option>
                              <option value="contain">Contain (Fit)</option>
                          </Select>
                          <Slider label="BG Image Opacity" value={backgroundImageOpacity} onChange={(e) => setBackgroundImageOpacity(Number(e.target.value))} min={0} max={1} step={0.05} />
                      </div>
                  )}
              </div>
          )}
      </ControlSection>

      <ControlSection title="Layout" icon="LayoutGrid">
        <Select label="Mode" value={layoutMode} onChange={(e) => setLayoutMode(e.target.value as LayoutMode)}>
          <option value="grid">Grid</option>
          <option value="freeform">Freeform</option>
          <option value="left-big">Left Big</option>
          <option value="top-big">Top Big</option>
          <option value="feature-row">Feature Row</option>
          <option value="feature-column">Feature Column</option>
          <option value="single-blur">Single Focus</option>
        </Select>
        {layoutMode !== 'freeform' && <Slider label="Gap" value={gap} onChange={(e) => setGap(Number(e.target.value))} min={0} max={100} />}
        <Select label="Image Fit" value={imageFit} onChange={(e) => setImageFit(e.target.value as ImageFit)}>
            <option value="cover">Cover (Fill)</option>
            <option value="contain">Contain (Fit)</option>
        </Select>
        <Slider label="Global Zoom" value={globalZoom} onChange={(e) => setGlobalZoom(Number(e.target.value))} min={0.1} max={3} step={0.05} />
      </ControlSection>

      {layoutMode === 'single-blur' && (
        <ControlSection title="Single Focus Settings" icon="Focus">
          <Slider label="Main Zoom" value={mainZoom} onChange={(e) => setMainZoom(Number(e.target.value))} min={0.1} max={5} step={0.1} />
          <Slider label="BG Blur" value={bgBlur} onChange={(e) => setBgBlur(Number(e.target.value))} min={0} max={50} />
          <Slider label="BG Opacity" value={bgOpacity} onChange={(e) => setBgOpacity(Number(e.target.value))} min={0} max={1} step={0.05} />
        </ControlSection>
      )}

      <ControlSection title="Image Overlays / Badges" icon="Layers">
          <Button onClick={onOverlayUploadClick} className="w-full justify-center">
              <Icon name="Plus" size={16} />
              <span>Add Overlay</span>
          </Button>
          <div className="space-y-3 max-h-40 overflow-y-auto pr-2">
              {overlayImages.map((overlay) => (
                  <div key={overlay.id} className="flex items-center space-x-2">
                      <img src={overlay.url} className="w-10 h-10 object-contain rounded bg-gray-200 dark:bg-gray-600" />
                      <div className="flex-grow">
                          <Slider label="Opacity" value={overlay.opacity} onChange={(e) => updateOverlayOpacity(overlay.id, Number(e.target.value))} min={0} max={1} step={0.05} />
                      </div>
                      <button onClick={() => removeOverlay(overlay.id)} className="p-2 text-red-600 hover:text-red-500 disabled:text-gray-400">
                          <Icon name="Trash2" size={16} />
                      </button>
                  </div>
              ))}
          </div>
      </ControlSection>

      <ControlSection title="Text Overlays" icon="Type">
            <Button onClick={onAddText} className="w-full justify-center">
                <Icon name="Plus" size={16} />
                <span>Add Text</span>
            </Button>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                {textOverlays.slice().reverse().map((text) => (
                    <div
                        key={text.id}
                        draggable="true"
                        onDragStart={(e) => handleTextLayerDragStart(e, text.id)}
                        onDrop={(e) => handleTextLayerDrop(e, text.id)}
                        onDragOver={(e) => e.preventDefault()}
                        onDragEnd={() => setDraggedId(null)}
                        onClick={() => setSelectedItemId(text.id)}
                        className={`flex items-center space-x-2 p-2 rounded-md cursor-pointer transition-all
                          ${selectedItemId === text.id ? 'bg-green-100 dark:bg-green-900/50 ring-2 ring-green-500' : 'bg-gray-100 dark:bg-gray-700'}
                          ${draggedId === text.id ? 'opacity-50' : ''}
                        `}
                    >
                        <Icon name="GripVertical" size={16} className="text-gray-400 cursor-grab" />
                        <span className="flex-grow truncate text-sm">{text.content}</span>
                        <button onClick={(e) => { e.stopPropagation(); removeTextOverlay(text.id); }} className="p-1 text-red-600 hover:text-red-500 rounded-full hover:bg-red-100 dark:hover:bg-red-900/50">
                            <Icon name="Trash2" size={14} />
                        </button>
                    </div>
                ))}
            </div>
            {selectedTextOverlay && (
                <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <input type="text" value={selectedTextOverlay.content} onChange={(e) => handleTextPropChange('content', e.target.value)}
                        className="w-full bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
                    />
                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col space-y-1 col-span-2">
                            <FontSelector
                                allFonts={allFonts}
                                selectedFont={selectedTextOverlay.fontFamily}
                                onSelectFont={(font) => handleTextPropChange('fontFamily', font)}
                                setPreviewFont={setPreviewFont}
                                onUpload={onFontUpload}
                            />
                        </div>
                        <div className="flex flex-col space-y-1">
                            <label className="text-xs text-gray-500 dark:text-gray-400">Color</label>
                            <input type="color" value={selectedTextOverlay.textColor} onChange={(e) => handleTextPropChange('textColor', e.target.value)}
                                className="w-full h-9 bg-transparent border border-gray-300 dark:border-gray-600 rounded-md cursor-pointer"
                            />
                        </div>
                    </div>
                    <Slider label="Font Size" value={selectedTextOverlay.fontSize} onChange={(e) => handleTextPropChange('fontSize', Number(e.target.value))} min={10} max={500} />
                    <Slider label="Rotation" value={selectedTextOverlay.rotation} onChange={(e) => handleTextPropChange('rotation', Number(e.target.value))} min={-180} max={180} />
                    <Toggle label="Shadow" enabled={selectedTextOverlay.shadow} onChange={(val) => handleTextPropChange('shadow', val)} />
                    
                    <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <Toggle label="Text Background" enabled={selectedTextOverlay.textBg} onChange={(val) => handleTextPropChange('textBg', val)} />
                        {selectedTextOverlay.textBg && <>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="flex flex-col space-y-1">
                                    <label className="text-xs text-gray-500 dark:text-gray-400">BG Color</label>
                                    <input type="color" value={selectedTextOverlay.textBgColor} onChange={(e) => handleTextPropChange('textBgColor', e.target.value)}
                                        className="w-full h-9 bg-transparent border border-gray-300 dark:border-gray-600 rounded-md cursor-pointer"
                                    />
                                </div>
                            </div>
                            <Slider label="BG Opacity" value={selectedTextOverlay.textBgOpacity} onChange={(e) => handleTextPropChange('textBgOpacity', Number(e.target.value))} min={0} max={1} step={0.05} />
                            <Slider label="Padding" value={selectedTextOverlay.textBgPadding} onChange={(e) => handleTextPropChange('textBgPadding', Number(e.target.value))} min={0} max={100} />
                        </>}
                    </div>
                </div>
            )}
      </ControlSection>

        <div className="flex space-x-2">
            className="w-full bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
          />
              <Icon name="Save" size={16} />
              <span>Save</span>
          </Button>
        </div>
          <div className="flex space-x-2 items-center">
              <option value="">Select a preset...</option>
            </Select>
              className="mt-5 p-2 text-red-600 hover:text-red-500 disabled:text-gray-400 disabled:cursor-not-allowed">
              <Icon name="Trash2" size={16} />
            </button>
          </div>
        )}
      </ControlSection>

      <ControlSection title="Export" icon="Download">
         <input type="text" placeholder="filename" value={exportName} onChange={(e) => setExportName(e.target.value)}
          className="w-full bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
        />
        <Button onClick={onExport} className="w-full justify-center">
            <Icon name="Download" size={16} />
            <span>Export as PNG</span>
        </Button>
      </ControlSection>
    </div>
  );
};

export default ControlPanel;