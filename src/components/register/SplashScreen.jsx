import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Particle dot floating up
const Particle = ({ x, delay, size, duration, opacity }) => (
  <motion.div
    className="absolute rounded-full pointer-events-none"
    style={{ width: size, height: size, left: `${x}%`, bottom: '-10%', background: `rgba(255,255,255,${opacity})` }}
    animate={{ y: [0, -900], opacity: [0, opacity, opacity * 0.6, 0] }}
    transition={{ duration, delay, repeat: Infinity, ease: 'easeOut', repeatDelay: delay * 0.5 }}
  />
);

const PARTICLES = [
  { x: 8,  delay: 0,    size: 5,  duration: 5,   opacity: 0.4 },
  { x: 18, delay: 1.2,  size: 3,  duration: 6.5, opacity: 0.25 },
  { x: 30, delay: 0.5,  size: 7,  duration: 4.5, opacity: 0.35 },
  { x: 42, delay: 2,    size: 4,  duration: 5.8, opacity: 0.3  },
  { x: 55, delay: 0.8,  size: 6,  duration: 5.2, opacity: 0.4  },
  { x: 67, delay: 1.6,  size: 3,  duration: 6,   opacity: 0.2  },
  { x: 78, delay: 0.3,  size: 5,  duration: 4.8, opacity: 0.35 },
  { x: 88, delay: 1.9,  size: 4,  duration: 5.5, opacity: 0.28 },
  { x: 95, delay: 0.7,  size: 6,  duration: 5,   opacity: 0.3  },
];

// Animated cross/plus medical icon
function MedicalCross() {
  return (
    <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
      <motion.rect
        x="20" y="4" width="16" height="48" rx="6" fill="white"
        initial={{ scaleY: 0 }}
        animate={{ scaleY: 1 }}
        transition={{ duration: 0.5, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
        style={{ originY: '50%' }}
      />
      <motion.rect
        x="4" y="20" width="48" height="16" rx="6" fill="white"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.5, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
        style={{ originX: '50%' }}
      />
    </svg>
  );
}

export default function SplashScreen({ onDone }) {
  const [phase, setPhase] = useState('in'); // in → show → out

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('show'), 600);
    const t2 = setTimeout(() => setPhase('out'), 3000);
    const t3 = setTimeout(onDone, 3600);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onDone]);

  return (
    <motion.div
      className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center"
      animate={phase === 'out' ? { opacity: 0 } : { opacity: 1 }}
      transition={{ duration: 0.5, ease: 'easeInOut' }}
    >
      {/* Background gradient */}
      <motion.div
        className="absolute inset-0"
        initial={{ background: 'linear-gradient(160deg, #1a7a0a 0%, #3dba1e 40%, #7ED957 100%)' }}
        animate={phase === 'show' || phase === 'out'
          ? { background: 'linear-gradient(160deg, #0f5c07 0%, #2ea014 40%, #5cca38 100%)' }
          : {}}
        transition={{ duration: 1.5, ease: 'easeOut' }}
      />

      {/* Subtle radial glow center */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 70% 60% at 50% 50%, rgba(255,255,255,0.08) 0%, transparent 70%)' }}
      />

      {/* Particles */}
      {PARTICLES.map((p, i) => <Particle key={i} {...p} />)}

      {/* Diagonal glare line */}
      <motion.div
        className="absolute pointer-events-none"
        style={{
          width: '200%', height: '2px',
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.18), transparent)',
          top: '35%', left: '-50%',
          transform: 'rotate(-25deg)',
        }}
        initial={{ x: '-100%', opacity: 0 }}
        animate={{ x: '100%', opacity: [0, 1, 0] }}
        transition={{ duration: 1.8, delay: 0.8, ease: 'easeInOut' }}
      />

      {/* Logo + brand content */}
      <AnimatePresence>
        {phase !== 'in' && (
          <motion.div
            key="content"
            className="relative z-10 flex flex-col items-center select-none"
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 180, damping: 20 }}
          >
            {/* Icon container */}
            <motion.div
              className="relative mb-8"
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 220, damping: 18, delay: 0.05 }}
            >
              {/* Outer glow ring */}
              <motion.div
                className="absolute -inset-5 rounded-[40px]"
                style={{ background: 'rgba(255,255,255,0.08)', filter: 'blur(12px)' }}
                animate={{ opacity: [0.5, 1, 0.5], scale: [1, 1.06, 1] }}
                transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
              />

              {/* Pulse ring */}
              <motion.div
                className="absolute -inset-3 rounded-[36px] border border-white/20"
                animate={{ scale: [1, 1.18, 1], opacity: [0.6, 0, 0.6] }}
                transition={{ duration: 2.2, repeat: Infinity, ease: 'easeOut' }}
              />

              {/* Icon card */}
              <motion.div
                className="relative w-28 h-28 rounded-[32px] flex items-center justify-center overflow-hidden"
                style={{
                  background: 'rgba(255,255,255,0.14)',
                  border: '1.5px solid rgba(255,255,255,0.3)',
                  backdropFilter: 'blur(20px)',
                  boxShadow: '0 20px 60px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.3)',
                }}
              >
                {/* Inner shimmer */}
                <motion.div
                  className="absolute inset-0"
                  style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.2) 0%, transparent 50%, rgba(255,255,255,0.05) 100%)' }}
                  animate={{ opacity: [0.6, 1, 0.6] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                />
                <MedicalCross />
              </motion.div>
            </motion.div>

            {/* Brand name — letter stagger */}
            <motion.div className="flex items-baseline gap-0 mb-2">
              {'Salud Digna'.split('').map((char, i) => (
                <motion.span
                  key={i}
                  className="font-heading font-bold text-white"
                  style={{
                    fontSize: '2.6rem',
                    letterSpacing: '-0.02em',
                    textShadow: '0 2px 16px rgba(0,0,0,0.2)',
                  }}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + i * 0.04, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                >
                  {char === ' ' ? '\u00A0' : char}
                </motion.span>
              ))}
            </motion.div>

            {/* Tagline */}
            <motion.p
              className="text-white/65 text-[11px] font-medium tracking-[0.22em] uppercase mb-10"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.75, duration: 0.6 }}
            >
              Tu salud, nuestra misión
            </motion.p>

            {/* Loading bar */}
            <motion.div
              className="w-40 h-0.5 rounded-full overflow-hidden"
              style={{ background: 'rgba(255,255,255,0.18)' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.9 }}
            >
              <motion.div
                className="h-full rounded-full"
                style={{ background: 'rgba(255,255,255,0.75)' }}
                initial={{ width: '0%' }}
                animate={{ width: '100%' }}
                transition={{ duration: 1.8, delay: 1, ease: [0.4, 0, 0.2, 1] }}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}