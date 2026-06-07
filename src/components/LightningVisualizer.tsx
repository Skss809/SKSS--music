import React, { useEffect, useRef } from 'react';

interface LightningVisualizerProps {
  isPlaying: boolean;
}

export function LightningVisualizer({ isPlaying }: LightningVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = canvas.width;
    let height = canvas.height;

    const resize = () => {
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = width;
      canvas.height = height;
    };

    window.addEventListener('resize', resize);
    resize();

    // Lightning generation state
    let bolts: { x: number, y: number, length: number, angle: number, branches: any[], age: number, maxAge: number, color: string }[] = [];
    
    let simulatedEnergy = 0; // 0 to 1, simulating beat detection
    let time = 0;

    const generateBolt = (startX: number, startY: number, angle: number, length: number, depth: number) => {
      const branches = [];
      const segments = Math.floor(Math.random() * 5) + 5; // 5-10 segments per branch
      const segmentLength = length / segments;
      
      let currX = startX;
      let currY = startY;
      let currAngle = angle;
      
      for (let i = 0; i < segments; i++) {
        // Jagged unpredictable angle variation
        currAngle += (Math.random() - 0.5) * 1.5;
        
        const nextX = currX + Math.cos(currAngle) * segmentLength;
        const nextY = currY + Math.sin(currAngle) * segmentLength;
        
        branches.push({ startX: currX, startY: currY, endX: nextX, endY: nextY });
        
        // Split fork occasionally
        if (depth < 2 && Math.random() < 0.3) {
          const forkAngle = currAngle + (Math.random() > 0.5 ? 1 : -1) * (0.5 + Math.random() * 0.8);
          branches.push(...generateBolt(nextX, nextY, forkAngle, length * 0.6, depth + 1));
        }
        
        currX = nextX;
        currY = nextY;
      }
      
      return branches;
    };

    const colors = ['#a78bfa', '#38bdf8', '#e879f9']; // purple, cyan, fuchsia

    const triggerStrike = (intensity: number) => {
      // Pick a random edge to strike from, or strike internally
      const startX = Math.random() * width;
      const startY = Math.random() < 0.5 ? 0 : height; // from top or bottom
      const angle = startY === 0 ? Math.PI / 2 : -Math.PI / 2; // downwards or upwards
      
      // Add slight angle variation
      const initialAngle = angle + (Math.random() - 0.5) * 1.0;
      
      const length = (0.5 + Math.random() * 0.5 + intensity * 0.5) * height; // length depends on intensity
      
      const color = colors[Math.floor(Math.random() * colors.length)];
      
      bolts.push({
        x: startX,
        y: startY,
        angle: initialAngle,
        length,
        branches: generateBolt(startX, startY, initialAngle, length, 0),
        age: 0,
        maxAge: 10 + Math.floor(Math.random() * 20), // 10-30 frames flicker life
        color
      });
    };

    const render = () => {
      time++;
      
      // Simulate audio beat logic
      // Every few seconds, we get a "drop" or "kick"
      if (isPlaying) {
        if (time % 120 === 0) {
          simulatedEnergy = 1; // Heavy bass drop
        } else if (time % 30 === 0 && Math.random() < 0.5) {
          simulatedEnergy = 0.5; // Kick drum
        } else {
          simulatedEnergy = Math.max(0, simulatedEnergy - 0.05); // Decay
        }
        
        // Trigger lightning based on energy
        if (simulatedEnergy > 0.2 && Math.random() < simulatedEnergy * 0.3) {
          triggerStrike(simulatedEnergy);
        }
      }

      ctx.clearRect(0, 0, width, height);

      // Render bolts
      for (let i = bolts.length - 1; i >= 0; i--) {
        const bolt = bolts[i];
        bolt.age++;
        
        if (bolt.age >= bolt.maxAge) {
          bolts.splice(i, 1);
          continue;
        }

        // Flicker effect: random opacity
        const opacity = Math.random() > 0.3 ? 1 - (bolt.age / bolt.maxAge) : 0;
        
        if (opacity > 0) {
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          
          // Draw Neon Glow
          ctx.beginPath();
          for (const branch of bolt.branches) {
            ctx.moveTo(branch.startX, branch.startY);
            ctx.lineTo(branch.endX, branch.endY);
          }
          ctx.strokeStyle = bolt.color;
          ctx.lineWidth = 3;
          ctx.shadowBlur = 15;
          ctx.shadowColor = bolt.color;
          ctx.globalAlpha = opacity * 0.8;
          ctx.globalCompositeOperation = 'screen';
          ctx.stroke();

          // Draw White Core
          ctx.beginPath();
          for (const branch of bolt.branches) {
            ctx.moveTo(branch.startX, branch.startY);
            ctx.lineTo(branch.endX, branch.endY);
          }
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.5;
          ctx.shadowBlur = 5;
          ctx.shadowColor = '#ffffff';
          ctx.globalAlpha = opacity;
          ctx.stroke();
        }
      }
      
      ctx.globalAlpha = 1.0;
      ctx.shadowBlur = 0;
      ctx.globalCompositeOperation = 'source-over';

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resize);
    };
  }, [isPlaying]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none z-20 mix-blend-screen opacity-90 rounded-2xl"
    />
  );
}
