import React, { useEffect, useRef } from 'react';

interface CloudVisualizerProps {
  isPlaying: boolean;
}

export function CloudVisualizer({ isPlaying }: CloudVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isPlayingRef = useRef(isPlaying);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = 0;
    let height = 0;

    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        width = entry.contentRect.width;
        height = entry.contentRect.height;
        if (canvas) {
          canvas.width = width;
          canvas.height = height;
        }
      }
    });
    
    if (canvas.parentElement) {
      resizeObserver.observe(canvas.parentElement);
    } else {
      resizeObserver.observe(canvas);
    }

    let animationFrameId: number;
    let time = 0;
    let simulatedEnergy = 0; // 0 to 1

    // Particle representation
    class SmokeParticle {
      x: number;
      y: number;
      size: number;
      speedX: number;
      speedY: number;
      baseOpacity: number;
      color: string;
      life: number;
      maxLife: number;
      layer: number; // 0: back, 1: middle, 2: front (for parallax)

      constructor() {
        this.layer = Math.floor(Math.random() * 3);
        this.x = Math.random() * width;
        this.y = height + 100; // start below screen
        // size varies by layer for depth
        this.size = (150 + Math.random() * 150) * (1 + this.layer * 0.3);
        this.speedX = (Math.random() - 0.5) * 0.5 * (this.layer + 1);
        this.speedY = -(0.5 + Math.random() * 0.5) * (this.layer + 1);
        this.baseOpacity = 0.15 + Math.random() * 0.15;
        this.life = 0;
        this.maxLife = 600 + Math.random() * 300; // frames
        
        const isIndigo = Math.random() > 0.5;
        // Deep indigo (75, 0, 130) or Violet (138, 43, 226)
        this.color = isIndigo ? '75, 0, 130' : '138, 43, 226';
      }

      update(energy: number) {
        // Swirl effect
        this.x += this.speedX + Math.sin(this.life * 0.01) * 0.5;
        // Move up, speed affected by energy pulse
        this.y += this.speedY * (1 + energy * 2.5);
        this.life++;
        // Grow slightly over time
        this.size += 0.1;
      }

      draw(ctx: CanvasRenderingContext2D, energy: number) {
        // Fade in and out
        let progress = this.life / this.maxLife;
        let fade = 1;
        if (progress < 0.2) fade = progress / 0.2;
        if (progress > 0.8) fade = (1 - progress) / 0.2;
        if (progress >= 1) fade = 0;

        // Breathe: energy pulses increase opacity
        const opacity = (this.baseOpacity + (energy * 0.2)) * fade;
        if (opacity <= 0) return;

        const radGrad = ctx.createRadialGradient(
          this.x, this.y, 0,
          this.x, this.y, this.size
        );
        radGrad.addColorStop(0, `rgba(${this.color}, ${opacity})`);
        radGrad.addColorStop(0.5, `rgba(${this.color}, ${opacity * 0.5})`);
        radGrad.addColorStop(1, `rgba(${this.color}, 0)`);

        ctx.fillStyle = radGrad;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    let particles: SmokeParticle[] = [];

    const render = () => {
      time++;
      
      if (width === 0 || height === 0) {
        animationFrameId = requestAnimationFrame(render);
        return;
      }
      
      if (particles.length === 0) {
        for (let i = 0; i < 20; i++) {
          const p = new SmokeParticle();
          p.y = Math.random() * height; // initial spread
          particles.push(p);
        }
      }
      
      // Simulated audio beat logic (Pulse)
      if (isPlayingRef.current) {
        if (time % 150 === 0) {
          simulatedEnergy = 1; // Heavy drop
        } else if (time % 45 === 0 && Math.random() < 0.4) {
          simulatedEnergy = 0.6; // Kick drum
        } else {
          simulatedEnergy = Math.max(0, simulatedEnergy - 0.02); // Decay
        }
      } else {
        simulatedEnergy = Math.max(0, simulatedEnergy - 0.05);
      }

      ctx.clearRect(0, 0, width, height);

      // We want additive blending for a glowing soft smoke effect
      ctx.globalCompositeOperation = 'screen';

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        if (isPlayingRef.current) {
          p.update(simulatedEnergy);
        }
        p.draw(ctx, simulatedEnergy);

        if (p.life >= p.maxLife || p.y < -p.size) {
          particles.splice(i, 1);
          if (isPlayingRef.current) {
            particles.push(new SmokeParticle());
          }
        }
      }

      ctx.globalCompositeOperation = 'source-over';
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
    };
  }, []);

  return (
    <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden rounded-2xl">
      {/* Soft dark gradient vignette to blend the bottom edge seamlessly */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10 pointer-events-none"></div>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full mix-blend-screen opacity-90 blur-[8px]"
      />
    </div>
  );
}
