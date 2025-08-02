import React from 'react';
import { LAVENDER_DRAGON_LOGO_B64 } from '../constants';
import { Icon } from './ui/Icon';

  return (
    <div className="fixed inset-0 bg-gray-900 flex flex-col items-center justify-center z-50 text-white transition-opacity duration-500">
      <h1 className="text-2xl font-bold mb-2">LavenderDragonDesign Grid Mockup Generator</h1>
      <div className="flex items-center space-x-2 text-gray-400 mt-2">
        <Icon name="Loader" className="animate-spin" />
        <span>Loading your canvas...</span>
      </div>
    </div>
  );
};
