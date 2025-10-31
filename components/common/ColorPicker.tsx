import React from 'react';

// Expanded and curated color palette
const colors = [
  '#FFFFFF', '#9CA3AF', '#000000', '#EF4444', '#F97316', '#FBBF24', 
  '#84CC16', '#22C55E', '#14B8A6', '#06B6D4', '#3B82F6', '#8B5CF6', 
  '#EC4899', '#A16207', '#78350F', '#F7DDB5'
];

interface ColorPickerProps {
  onColorSelect: (color: string) => void;
  currentColor: string;
}

const ColorPicker: React.FC<ColorPickerProps> = ({ onColorSelect, currentColor }) => {
  return (
    <div className="absolute bottom-24 left-1/2 -translate-x-1/2 p-2 bg-white/30 backdrop-blur-md rounded-xl shadow-lg border border-white/20 flex flex-wrap gap-2 justify-center w-64 animate-fade-in-up">
      {colors.map(color => (
        <button
          key={color}
          onClick={() => onColorSelect(color)}
          className="w-10 h-10 rounded-full border-2 border-white/50 transition-transform hover:scale-110 active:scale-95 shadow-md"
          style={{ backgroundColor: color }}
          aria-label={`Select color ${color}`}
        />
      ))}
      <div className="relative w-10 h-10 rounded-full border-2 border-white/50 overflow-hidden cursor-pointer transition-transform hover:scale-110 active:scale-95 shadow-md" aria-label="Select custom color">
         <div className="absolute inset-0 bg-gradient-to-br from-red-500 via-yellow-500 to-blue-500"></div>
         <span className="material-symbols-outlined absolute inset-0 flex items-center justify-center text-white text-2xl" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>colorize</span>
         <input
            type="color"
            value={currentColor}
            onInput={(e) => onColorSelect((e.target as HTMLInputElement).value)}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
         />
      </div>
    </div>
  );
};

export default ColorPicker;