
import React from 'react';

interface SliderProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const Slider: React.FC<SliderProps> = ({ label, value, ...props }) => (
  <div className="flex flex-col space-y-1">
    {label && (
      <div className="flex justify-between items-center">
        <label className="text-xs text-gray-500 dark:text-gray-400">{label}</label>
        <span className="text-xs font-mono bg-gray-200 dark:bg-gray-600 text-green-700 dark:text-green-300 px-1.5 py-0.5 rounded">{Number(value).toFixed(2)}</span>
      </div>
    )}
    <input
      type="range"
      value={value}
      {...props}
      className={`w-full h-2 bg-gray-300 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer range-lg ${props.className || ''}`}
      style={{
          // Custom styles to color the track in Chrome/Safari
          // @ts-ignore
          '--range-progress': `${((Number(value) - Number(props.min)) / (Number(props.max) - Number(props.min))) * 100}%`
      }}
    />
    <style>{`
      input[type=range].range-lg {
          -webkit-appearance: none;
          appearance: none;
          background-color: transparent;
      }
      input[type=range].range-lg:focus {
          outline: none;
      }
      /* Thumb */
      input[type=range].range-lg::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 1rem;
          height: 1rem;
          border-radius: 9999px;
          background-color: #16a34a; /* green-600 */
          margin-top: -6px; /* (track-height - thumb-height) / 2 */
          cursor: pointer;
      }
      .dark input[type=range].range-lg::-webkit-slider-thumb {
          background-color: #22c55e; /* green-500 */
      }
      input[type=range].range-lg::-moz-range-thumb {
          width: 1rem;
          height: 1rem;
          border-radius: 9999px;
          background-color: #16a34a;
          border: none;
          cursor: pointer;
      }
      .dark input[type=range].range-lg::-moz-range-thumb {
          background-color: #22c55e;
      }
      /* Track */
      input[type=range].range-lg::-webkit-slider-runnable-track {
          width: 100%;
          height: 4px;
          cursor: pointer;
          background: linear-gradient(to right, #16a34a var(--range-progress), #d1d5db var(--range-progress)); /* green-600, gray-300 */
          border-radius: 9999px;
      }
      .dark input[type=range].range-lg::-webkit-slider-runnable-track {
          background: linear-gradient(to right, #22c55e var(--range-progress), #4b5563 var(--range-progress)); /* green-500, gray-600 */
      }
      input[type=range].range-lg::-moz-range-track {
          width: 100%;
          height: 4px;
          cursor: pointer;
          background: #d1d5db;
          border-radius: 9999px;
      }
      .dark input[type=range].range-lg::-moz-range-track {
          background: #4b5563;
      }
      input[type=range].range-lg::-moz-range-progress {
        background-color: #16a34a;
        height: 4px;
        border-radius: 9999px;
      }
      .dark input[type=range].range-lg::-moz-range-progress {
        background-color: #22c55e;
      }
    `}</style>
  </div>
);