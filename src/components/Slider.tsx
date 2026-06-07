import React from 'react';
import { cn } from '../lib/utils';

interface SliderProps {
  value: number[];
  max: number;
  step: number;
  onValueChange: (value: number[]) => void;
  className?: string;
}

export function Slider({ value, max, step, onValueChange, className }: SliderProps) {
  return (
    <div className={cn("relative flex items-center select-none touch-none w-full h-5", className)}>
      <input
        type="range"
        min={0}
        max={max}
        step={step}
        value={value[0]}
        onChange={(e) => onValueChange([Number(e.target.value)])}
        className="w-full h-1 bg-zinc-800 rounded-full appearance-none cursor-pointer accent-white [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full"
      />
    </div>
  );
}
