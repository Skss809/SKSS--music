import React, { useState, useEffect } from 'react';
import { usePlayerStore } from '../store/usePlayerStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { motion, AnimatePresence } from 'framer-motion';

const CosmicStardust = () => {
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    const triggerPulse = () => {
      setPulse(true);
      setTimeout(() => setPulse(false), 200);
      const nextHit = 1500 + Math.random() * 2000;
      timeoutId = setTimeout(triggerPulse, nextHit);
    };
    timeoutId = setTimeout(triggerPulse, 1000);
    return () => clearTimeout(timeoutId);
  }, []);

  const renderParticles = (isLeft: boolean) => (
    <motion.div 
      className={`absolute top-0 bottom-0 ${isLeft ? 'left-0' : 'right-0'} w-[60px] pointer-events-none z-[1] overflow-hidden`}
      animate={{ filter: pulse ? 'brightness(1.5) saturate(1.5)' : 'brightness(1) saturate(1)' }}
      transition={{ duration: 0.2 }}
      style={{
        maskImage: 'linear-gradient(to bottom, transparent 0%, black 10%, black 90%, transparent 100%)',
        WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 10%, black 90%, transparent 100%)'
      }}
    >
      {Array.from({ length: 30 }).map((_, i) => {
        const size = Math.random() * 2.5 + 1.5; // 1.5px to 4px
        const xPos = Math.random() * 100;
        
        // Distribute bright red, blue, green colors
        const colorClass = 
          i % 3 === 0 ? 'bg-red-400 shadow-[0_0_10px_rgba(248,113,113,1)]' : 
          i % 3 === 1 ? 'bg-blue-400 shadow-[0_0_10px_rgba(96,165,250,1)]' : 
          'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,1)]';

        const duration = 8 + Math.random() * 10; // faster, smoother flow (8-18s)
        const delay = Math.random() * 15;
        const sway = (Math.random() - 0.5) * 40; // horizontal organic drift

        return (
          <motion.div
            key={i}
            className={`absolute rounded-full ${colorClass} mix-blend-screen`}
            style={{ width: size, height: size, left: `${xPos}%` }}
            initial={{ top: '105%', x: 0, opacity: 0 }}
            animate={{ 
              top: '-5%', 
              x: sway,
              opacity: [0, 0.8, 1, 0.8, 0] 
            }}
            transition={{
              top: { duration, repeat: Infinity, ease: 'linear', delay },
              x: { duration: duration * 0.6, repeat: Infinity, ease: 'easeInOut', repeatType: 'mirror', delay },
              opacity: { duration, repeat: Infinity, ease: 'easeInOut', delay }
            }}
          />
        );
      })}
    </motion.div>
  );

  return (
    <>
      {renderParticles(true)}
      {renderParticles(false)}
    </>
  );
};


export function CoolModeOverlay() {
  const { isPlaying } = usePlayerStore();
  const { coolModeEnabled, coolModeStyle, drawOverOtherApps } = useSettingsStore();

  if (!coolModeEnabled || !isPlaying) return null;

  const renderStyle = () => {
    switch (coolModeStyle) {
      case 'colorful-flows':
        return (
          <div className="absolute inset-0 pointer-events-none rounded-[2rem] shadow-[inset_0_0_30px_rgba(255,0,255,0.5),inset_0_0_60px_rgba(0,255,255,0.5)]">
            <motion.div 
              className="absolute inset-0 rounded-[2rem]"
              animate={{
                boxShadow: [
                  'inset 0 0 20px rgba(255,0,255,0.3)',
                  'inset 0 0 40px rgba(0,255,255,0.5)',
                  'inset 0 0 20px rgba(255,0,255,0.3)'
                ]
              }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </div>
        );
      case 'color-surrounding':
        return (
          <div className="absolute inset-0 pointer-events-none rounded-[2rem] overflow-hidden mix-blend-screen z-0">
            <motion.div 
              className="absolute inset-0 rounded-[2rem]"
              animate={{ 
                boxShadow: [
                  'inset 0 0 60px 20px rgba(99,102,241,0.4)',
                  'inset 0 0 100px 40px rgba(217,70,239,0.6)',
                  'inset 0 0 80px 30px rgba(20,184,166,0.5)',
                  'inset 0 0 60px 20px rgba(99,102,241,0.4)'
                ]
              }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            />
          </div>
        );
      case 'green-column':
        return (
          <div className="absolute inset-x-0 bottom-0 top-1/2 pointer-events-none overflow-hidden flex flex-col justify-end z-0">
            {/* Aurora Edge Lights */}
            <motion.div 
              className="absolute bottom-[-50px] left-[-20%] w-[100%] h-[200px] bg-cyan-500/20 blur-[60px]" 
              animate={{ opacity: [0.2, 0.5, 0.2], x: [-20, 20, -20] }} 
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }} 
            />
            <motion.div 
              className="absolute bottom-[-50px] right-[-20%] w-[100%] h-[200px] bg-fuchsia-500/20 blur-[60px]" 
              animate={{ opacity: [0.4, 0.2, 0.4], x: [20, -20, 20] }} 
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }} 
            />

            {/* Equalizer Container */}
            <div className="absolute bottom-0 left-0 right-0 h-48 flex items-end justify-center gap-1.5 px-6 pb-4">
              {Array.from({ length: 32 }).map((_, i) => (
                <motion.div 
                  key={i} 
                  className="w-1.5 rounded-t-full bg-gradient-to-t from-indigo-600 via-purple-500 to-fuchsia-400 opacity-80"
                  animate={{ height: ['5%', `${Math.random() * 85 + 10}%`, '5%'] }} 
                  transition={{ duration: Math.random() * 0.4 + 0.4, repeat: Infinity, ease: "easeInOut" }} 
                />
              ))}
            </div>
          </div>
        );
      case 'line-bubble':
        return (
          <div className="absolute inset-0 pointer-events-none overflow-hidden mix-blend-screen z-0">
            {/* Soft background bleed glow from edges */}
            <div className="absolute inset-0 shadow-[inset_0_0_40px_rgba(236,72,153,0.2),inset_0_0_40px_rgba(6,182,212,0.2)]" />
            
            <div className="absolute inset-0" style={{ filter: 'url(#goo)' }}>
              {Array.from({ length: 24 }).map((_, i) => {
                const side = i % 4; // 0: top, 1: right, 2: bottom, 3: left
                const size = Math.floor(Math.random() * 30 + 30);
                const color = i % 3 === 0 ? 'bg-pink-500' : i % 3 === 1 ? 'bg-cyan-500' : 'bg-purple-500';
                
                let initial: any = {};
                let animate: any = {};
                
                // Keep them tightly bound to the edges (negative margin to hide half the bubble)
                if (side === 0) { initial = { top: -size/2, left: `${Math.random()*100}%` }; animate = { left: [`${Math.random()*100}%`, `${Math.random()*100}%`, `${Math.random()*100}%`], scale: [1, 1.3, 1] }; }
                if (side === 1) { initial = { right: -size/2, top: `${Math.random()*100}%` }; animate = { top: [`${Math.random()*100}%`, `${Math.random()*100}%`, `${Math.random()*100}%`], scale: [1, 1.3, 1] }; }
                if (side === 2) { initial = { bottom: -size/2, left: `${Math.random()*100}%` }; animate = { left: [`${Math.random()*100}%`, `${Math.random()*100}%`, `${Math.random()*100}%`], scale: [1, 1.3, 1] }; }
                if (side === 3) { initial = { left: -size/2, top: `${Math.random()*100}%` }; animate = { top: [`${Math.random()*100}%`, `${Math.random()*100}%`, `${Math.random()*100}%`], scale: [1, 1.3, 1] }; }

                return (
                  <motion.div
                    key={i}
                    className={`absolute rounded-full ${color} blur-[6px] opacity-80`}
                    style={{ width: size, height: size }}
                    initial={initial}
                    animate={animate}
                    transition={{ duration: Math.random() * 4 + 4, repeat: Infinity, ease: "easeInOut" }}
                  />
                );
              })}
            </div>
            
            <svg className="absolute w-0 h-0">
              <filter id="goo">
                <feGaussianBlur in="SourceGraphic" stdDeviation="12" result="blur" />
                <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 19 -9" result="goo" />
                <feBlend in="SourceGraphic" in2="goo" />
              </filter>
            </svg>
          </div>
        );
      case 'shuriken-flow':
        return (
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {Array.from({ length: 15 }).map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-8 h-8"
                initial={{ 
                  x: Math.random() * window.innerWidth, 
                  y: window.innerHeight + 50,
                  rotate: 0 
                }}
                animate={{ 
                  y: -100,
                  rotate: 360 * (Math.random() > 0.5 ? 1 : -1)
                }}
                transition={{
                  duration: Math.random() * 4 + 4,
                  repeat: Infinity,
                  ease: "linear",
                  delay: Math.random() * 5
                }}
              >
                {/* Realistic Shuriken SVG */}
                <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-lg">
                  <path d="M50 0L61 39L100 50L61 61L50 100L39 61L0 50L39 39L50 0Z" fill="url(#steelGradient)"/>
                  <circle cx="50" cy="50" r="8" fill="transparent" stroke="#111" strokeWidth="4" />
                  <defs>
                    <linearGradient id="steelGradient" x1="0" y1="0" x2="100" y2="100">
                      <stop offset="0%" stopColor="#e2e8f0" />
                      <stop offset="50%" stopColor="#94a3b8" />
                      <stop offset="100%" stopColor="#475569" />
                    </linearGradient>
                  </defs>
                </svg>
              </motion.div>
            ))}
          </div>
        );
      case 'cosmic-stardust':
        return <CosmicStardust />;
      // Fallback for others
      default:
        return (
          <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-indigo-500/20 via-transparent to-pink-500/20 animate-pulse"></div>
        );
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className={`absolute top-0 bottom-0 left-0 right-0 pointer-events-none ${drawOverOtherApps ? 'z-[9999]' : 'z-[1]'}`}
      >
        {renderStyle()}
      </motion.div>
    </AnimatePresence>
  );
}
