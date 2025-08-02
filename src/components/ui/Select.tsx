import React from 'react';
import { Icon } from './Icon';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
}

export const Select: React.FC<SelectProps> = ({ label, children, ...props }) => (
  <div className="flex flex-col space-y-1">
    <label className="text-xs text-gray-500 dark:text-gray-400">{label}</label>
    <div className="relative">
        <select
          {...props}
          className={`w-full bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm appearance-none focus:ring-2 focus:ring-green-500 focus:outline-none ${props.className || ''}`}
        >
          {children}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400 dark:text-gray-500">
            <Icon name="ChevronDown" size={16} />
        </div>
    </div>
  </div>
);