import React, { useRef, useState } from 'react';
import { AppImage } from '../types';
import { Button } from './ui/Button';
import { Icon } from './ui/Icon';

interface ImageThumbnailsProps {
  images: AppImage[];
  setImages: React.Dispatch<React.SetStateAction<AppImage[]>>;
  onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onImageDrop: (files: FileList) => void;
}

const ImageThumbnails: React.FC<ImageThumbnailsProps> = ({ images, setImages, onImageUpload, onImageDrop }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);


  const handleRemoveImage = (id: string) => {
      const imageToRemove = images.find(img => img.id === id);
      if (imageToRemove) URL.revokeObjectURL(imageToRemove.url);
      const newImages = images.filter((img) => img.id !== id);
      setImages(newImages);
  };
  
  const handleRemoveAll = () => {
      images.forEach(img => URL.revokeObjectURL(img.url));
      setImages([]);
  }
  
  const handlePanelDragEvent = (e: React.DragEvent<HTMLDivElement>, isEntering: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    // A short timeout helps prevent flickering when dragging over child elements
    setTimeout(() => setIsDraggingOver(isEntering), 0);
  };

  const handlePanelDrop = (e: React.DragEvent<HTMLDivElement>) => {
    handlePanelDragEvent(e, false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
        onImageDrop(files);
    }
  };

  // Reordering Logic
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, id: string) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, id: string) => {
      e.preventDefault(); // Necessary to allow dropping
      if (id !== draggedId && id !== dropTargetId) {
          setDropTargetId(id);
      }
  };

  const handleDragLeave = () => {
      setDropTargetId(null);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, targetId: string) => {
      e.preventDefault();
      if (!draggedId || draggedId === targetId) return;

      const draggedIndex = images.findIndex(img => img.id === draggedId);
      const targetIndex = images.findIndex(img => img.id === targetId);

      if (draggedIndex === -1 || targetIndex === -1) return;

      const newImages = [...images];
      const [draggedItem] = newImages.splice(draggedIndex, 1);
      newImages.splice(targetIndex, 0, draggedItem);
      setImages(newImages);
  };

  const handleDragEnd = () => {
      setDraggedId(null);
      setDropTargetId(null);
  };


  return (
    <div 
      className="relative space-y-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200/80 dark:border-gray-700"
      onDragEnter={(e) => handlePanelDragEvent(e, true)}
      onDragOver={(e) => handlePanelDragEvent(e, true)}
      onDragLeave={(e) => handlePanelDragEvent(e, false)}
      onDrop={handlePanelDrop}
    >
      {isDraggingOver && (
          <div className="absolute inset-0 bg-green-500/20 border-2 border-dashed border-green-500 rounded-lg flex flex-col items-center justify-center z-10 pointer-events-none">
              <Icon name="UploadCloud" size={48} className="text-green-600 dark:text-green-400" />
              <p className="font-semibold text-green-700 dark:text-green-400 mt-2">Drop images to upload</p>
          </div>
      )}
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-semibold text-green-700 dark:text-green-400 flex items-center space-x-2">
            <Icon name="Images" size={16} />
            <span>Images (Drag to reorder)</span>
        </h3>
        {images.length > 0 && (
             <button onClick={handleRemoveAll} className="text-xs text-red-600 hover:text-red-500 flex items-center space-x-1">
                <Icon name="Trash2" size={14} />
                <span>Clear</span>
             </button>
        )}
      </div>
      
      <div className="grid grid-cols-3 gap-2 max-h-60 overflow-y-auto pr-2">
        {images.map((imgData, index) => {
          return (
            <div
              key={imgData.id}
              draggable="true"
              onDragStart={(e) => handleDragStart(e, imgData.id)}
              onDragOver={(e) => handleDragOver(e, imgData.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, imgData.id)}
              onDragEnd={handleDragEnd}
              className={`group relative aspect-square transition-all duration-200 cursor-grab active:cursor-grabbing
                ${draggedId === imgData.id ? 'opacity-30 scale-95' : 'opacity-100 scale-100'} 
                ${dropTargetId === imgData.id ? 'outline outline-2 outline-offset-2 outline-green-500 rounded-md' : ''}`
              }
            >
              <img src={imgData.url} alt={`upload-${index}`} className="w-full h-full object-cover rounded-md bg-gray-200 dark:bg-gray-700 pointer-events-none" />
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-1 space-y-1 pointer-events-none">
                  <span className="text-white text-lg font-bold">{index + 1}</span>
              </div>
              <button onClick={() => handleRemoveImage(imgData.id)} className="absolute top-0 right-0 m-1 p-0.5 bg-red-600/80 rounded-full text-white opacity-0 group-hover:opacity-100 hover:bg-red-500 transition-opacity z-10">
                  <Icon name="X" size={12} />
              </button>
            </div>
          );
        })}
      </div>
      
      <input
        type="file"
        multiple
        accept="image/*"
        ref={fileInputRef}
        onChange={onImageUpload}
        className="hidden"
      />
      <Button onClick={() => fileInputRef.current?.click()} className="w-full justify-center">
        <Icon name="Upload" size={16} />
        <span>Upload Images</span>
      </Button>
    </div>
  );
};

export default ImageThumbnails;