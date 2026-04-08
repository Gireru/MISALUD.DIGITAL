import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const MASCOT_URL = 'https://media.base44.com/images/public/69cc5a490014842f1ccc1dfd/38486f9ce_image.png';

const BUBBLE_MESSAGES = [
  '¡Hola! ¿En qué puedo ayudarte hoy? 😊',
  '¿Tienes dudas sobre tu trayecto? 🏥',
  '¡Estoy aquí para ayudarte! 💚',
  '¿Necesitas información sobre tus estudios? 🔬',
];

export default function MascotFAB({ onOpen }) {
  const [bubbleVisible, setBubbleVisible] = useState(false);
  const [msgIndex, setMsgIndex] = useState(0);
  const [hasBeenSeen, setHasBeenSeen] = useState(false);

  // Show bubble automatically after 2s on first load
  useEffect(() => {
    const timer = setTimeout(() => {
      setBubbleVisible(true);
      setHasBeenSeen(true);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  // Cycle bubble messages every 5s while visible
  useEffect(() => {
    if (!bubbleVisible) return;
    const interval = setInterval(() => {
      setMsgIndex(i => (i + 1) % BUBBLE_MESSAGES.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [bubbleVisible]);

  // Auto-hide bubble after 8s
  useEffect(() => {
    if (!bubbleVisible) return;
    const timer = setTimeout(() => setBubbleVisible(false), 8000);
    return () => clearTimeout(timer);
  }, [bubbleVisible, msgIndex]);

  const handleClick = () => {
    setBubbleVisible(false);
    onOpen();
  };

  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-2">
      {/* Speech bubble */}
      <AnimatePresence>
        {bubbleVisible && (
          <motion.div
            initial={{ opacity: 0, scale: 0.7, y: 12, originX: 1, originY: 1 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.7, y: 12 }}
            transition={{ type: 'spring', stiffness: 340, damping: 22 }}
            className="relative max-w-[200px] cursor-pointer"
            onClick={handleClick}
          >
            <div
              className="px-4 py-3 rounded-2xl rounded-br-sm text-sm font-medium text-gray-800 shadow-lg"
              style={{
                background: 'rgba(255,255,255,0.95)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                border: '1px solid rgba(126,217,87,0.25)',
                boxShadow: '0 8px 32px rgba(126,217,87,0.18), 0 2px 8px rgba(0,0,0,0.06)',
              }}
            >
              <AnimatePresence mode="wait">
                <motion.span
                  key={msgIndex}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.25 }}
                  className="block leading-snug"
                >
                  {BUBBLE_MESSAGES[msgIndex]}
                </motion.span>
              </AnimatePresence>
            </div>
            {/* Bubble tail */}
            <div
              className="absolute bottom-0 right-4 w-3 h-3"
              style={{
                background: 'rgba(255,255,255,0.95)',
                clipPath: 'polygon(0 0, 100% 0, 100% 100%)',
                border: '1px solid rgba(126,217,87,0.25)',
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mascot button */}
      <motion.button
        onClick={handleClick}
        onHoverStart={() => { if (!bubbleVisible) setBubbleVisible(true); }}
        initial={{ opacity: 0, y: 40, scale: 0.8 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: 0.8, type: 'spring', stiffness: 260, damping: 18 }}
        whileTap={{ scale: 0.92 }}
        className="relative focus:outline-none"
        aria-label="Abrir asistente"
      >
        {/* Idle float animation */}
        <motion.div
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          className="relative"
        >
          {/* Glow ring */}
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(126,217,87,0.35) 0%, transparent 70%)' }}
            animate={{ scale: [1, 1.18, 1], opacity: [0.6, 0.2, 0.6] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
          />

          {/* Shadow under mascot */}
          <motion.div
            className="absolute bottom-0 left-1/2 -translate-x-1/2 rounded-full"
            style={{ width: 48, height: 10, background: 'rgba(0,0,0,0.12)', filter: 'blur(6px)' }}
            animate={{ scaleX: [1, 0.8, 1], opacity: [0.5, 0.25, 0.5] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          />

          <motion.img
            src={MASCOT_URL}
            alt="Asistente Salud Digna"
            className="w-24 h-24 object-contain drop-shadow-xl relative z-10"
            whileHover={{ scale: 1.12, rotate: [-2, 2, -2, 0] }}
            transition={{ type: 'spring', stiffness: 300, damping: 12 }}
          />
        </motion.div>

        {/* Pulse ring on idle */}
        {!bubbleVisible && hasBeenSeen && (
          <motion.div
            className="absolute top-2 right-0 w-4 h-4 rounded-full"
            style={{ background: '#7ED957', border: '2px solid white' }}
            animate={{ scale: [1, 1.4, 1], opacity: [1, 0.4, 1] }}
            transition={{ duration: 1.8, repeat: Infinity }}
          />
        )}
      </motion.button>
    </div>
  );
}