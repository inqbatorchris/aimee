import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Check } from 'lucide-react';

interface ColorPickerProps {
  label?: string;
  icon?: React.ReactNode;
  onColorChange: (color: string) => void;
  compact?: boolean;
}

const PRESET_COLORS = [
  '#000000', // Black
  '#434343', // Dark Gray
  '#666666', // Gray
  '#999999', // Light Gray
  '#B7B7B7', // Very Light Gray
  '#CCCCCC', // Near White
  '#D9D9D9', // Light Silver
  '#EFEFEF', // Off White
  '#F3F3F3', // Almost White
  '#FFFFFF', // White
  
  // Reds
  '#FF0000', // Red
  '#FF9900', // Orange
  '#FFFF00', // Yellow
  '#00FF00', // Lime
  '#00FFFF', // Cyan
  '#0000FF', // Blue
  '#9900FF', // Purple
  '#FF00FF', // Magenta
  
  // Pastels
  '#F4CCCC', // Light Red
  '#FCE5CD', // Light Orange
  '#FFF2CC', // Light Yellow
  '#D9EAD3', // Light Green
  '#D0E0E3', // Light Cyan
  '#CFE2F3', // Light Blue
  '#D9D2E9', // Light Purple
  '#EAD1DC', // Light Pink
  
  // Darks
  '#990000', // Dark Red
  '#B45F06', // Dark Orange
  '#BF9000', // Dark Yellow
  '#38761D', // Dark Green
  '#134F5C', // Dark Cyan
  '#0B5394', // Dark Blue
  '#351C75', // Dark Purple
  '#741B47', // Dark Pink
];

export function ColorPicker({ 
  label = "Color", 
  icon, 
  onColorChange,
  compact = false
}: ColorPickerProps) {
  const [selectedColor, setSelectedColor] = useState('#000000');
  const [customColor, setCustomColor] = useState('#000000');
  const [isOpen, setIsOpen] = useState(false);

  const handleColorSelect = (color: string) => {
    setSelectedColor(color);
    onColorChange(color);
    setIsOpen(false);
  };

  const handleCustomColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const color = e.target.value;
    setCustomColor(color);
    handleColorSelect(color);
  };

  const triggerButton = compact ? (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="h-7 w-7 p-0"
      title={label || "Color"}
    >
      {icon || (
        <div
          className="w-4 h-4 rounded border border-border"
          style={{ backgroundColor: selectedColor }}
        />
      )}
    </Button>
  ) : (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="h-8 px-2 gap-1"
      title={label}
    >
      {icon}
      {label && <span className="text-xs">{label}</span>}
      <div
        className="w-4 h-4 rounded border border-border ml-1"
        style={{ backgroundColor: selectedColor }}
      />
    </Button>
  );

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        {triggerButton}
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2">
        <div className="space-y-2">
          {label && (
            <h4 className="text-sm font-medium">{label}</h4>
          )}
          
          {/* Preset Colors Grid */}
          <div className="grid grid-cols-10 gap-1">
            {PRESET_COLORS.map((color) => (
              <button
                key={color}
                className="w-6 h-6 rounded border border-border hover:scale-110 transition-transform relative group"
                style={{ backgroundColor: color }}
                onClick={() => handleColorSelect(color)}
                title={color}
              >
                {selectedColor === color && (
                  <Check className="h-3 w-3 absolute inset-0 m-auto text-white mix-blend-difference" />
                )}
              </button>
            ))}
          </div>

          {/* Custom Color Picker */}
          <div className="flex items-center gap-2 pt-2 border-t border-border">
            <label htmlFor="custom-color" className="text-xs text-muted-foreground">
              Custom:
            </label>
            <Input
              id="custom-color"
              type="color"
              value={customColor}
              onChange={handleCustomColorChange}
              className="h-8 w-16 p-1"
            />
            <Input
              type="text"
              value={customColor}
              onChange={(e) => {
                const value = e.target.value;
                if (/^#[0-9A-Fa-f]{6}$/.test(value)) {
                  setCustomColor(value);
                  handleColorSelect(value);
                }
              }}
              placeholder="#000000"
              className="h-8 flex-1"
            />
          </div>

          {/* Clear Color Option */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full h-8 text-xs"
            onClick={() => handleColorSelect('')}
          >
            Clear Color
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}