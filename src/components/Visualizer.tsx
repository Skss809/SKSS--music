import React, { useEffect, useRef } from 'react';
import { usePlayerStore } from '../store/usePlayerStore';

export function Visualizer() {
  const { isPlaying, volume } = usePlayerStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let time = 0;

    const render = () => {
      // Slower time increment to reduce frequency of the movement
      time += isPlaying ? 0.04 : 0.01;
      const width = canvas.width;
      const height = canvas.height;
      
      ctx.clearRect(0, 0, width, height);
      
      // Function to draw a vibrating string
      const drawString = (color: string, amplitudeBase: number, frequencyBase: number, phase: number, lineWidth: number) => {
        ctx.beginPath();
        ctx.moveTo(0, height / 2);
        
        for (let i = 0; i <= width; i++) {
          let y = height / 2;
          
          if (isPlaying) {
            // Complex wave mixing for a string-like vibration
            // Add a smaller, gentler jitter
            const jitter = Math.sin(time * 1.5 + phase) * 4;
            const effectiveVolume = volume > 0 ? volume : 1; 
            const amplitude = (amplitudeBase + jitter) * effectiveVolume;
            
            // Dampen the ends so it looks like a plucked string anchored at both ends
            const dampening = Math.pow(Math.sin((i / width) * Math.PI), 1.2); 
            
            // Slower multipliers on time inside the trig functions
            // Primary wave
            y += Math.sin(i * frequencyBase + time * 1.5 + phase) * amplitude * dampening;
            // Secondary high-frequency wave for string texture
            y += Math.sin(i * frequencyBase * 2.5 - time * 2) * (amplitude * 0.25) * dampening;
            // Tertiary slow wave for overall flow
            y += Math.cos(i * frequencyBase * 0.5 + time * 0.5) * (amplitude * 0.15) * dampening;
          }
          
          ctx.lineTo(i, y);
        }
        
        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth;
        
        // Add a beautiful glow effect to the strings
        ctx.shadowColor = color;
        ctx.shadowBlur = 10;
        ctx.stroke();
        
        // Reset shadow for the next draw
        ctx.shadowBlur = 0;
      };

      // Draw the two strings overlapping at the center
      
      // String 1 (Vibrant Indigo)
      drawString('rgba(99, 102, 241, 1)', 25, 0.012, 0, 3);
      
      // String 2 (Electric Purple)
      drawString('rgba(168, 85, 247, 0.9)', 18, 0.018, Math.PI / 2, 2);

      animationId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [isPlaying, volume]);

  return (
    <div className="w-full h-32 rounded-xl overflow-hidden bg-black/30 backdrop-blur-md border border-white/10 relative shadow-2xl">
      <canvas 
        ref={canvasRef} 
        width={800} 
        height={128} 
        className="w-full h-full"
      />
    </div>
  );
}
