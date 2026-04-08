import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const MASCOT_URL = 'https://media.base44.com/images/public/69cc5a490014842f1ccc1dfd/92fb48b50_generated_image.png';

const BUBBLE_MESSAGES = [
  '¡Hola! ¿En qué puedo ayudarte? 😊',
  '¿Tienes dudas sobre tu trayecto? 🏥',
  '¡Estoy aquí para ayudarte! 💚',
  '¿Preguntas sobre tus estudios? 🔬',
];

export default function MascotFAB({ onOpen }) {
  const [bubbleVisible, setBubbleVisible] = useState(false);
  const [msgIndex, setMsgIndex] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setBubbleVisible(true), 1800);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!bubbleVisible) return;
    const interval = setInterval(() => {
      setMsgIndex(i => (i + 1) % BUBBLE_MESSAGES.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [bubbleVisible]);

  const handleClick = () => {
    setBubbleVisible(false);
    onOpen();
  };

  return (
    <div className="fixed bottom-6 right-5 z-40 flex flex-col items-end">

      {/* Thought bubble */}
      <AnimatePresence>
        {bubbleVisible && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.5, y: 16 }}
            transition={{ type: 'spring', stiffness: 320, damping: 22 }}
            className="relative mb-1 cursor-pointer"
            onClick={handleClick}
            style={{ transformOrigin: 'bottom right' }}
          >
            {/* Main bubble */}
            <div
              className="px-5 py-4 rounded-3xl text-sm font-medium text-gray-800 max-w-[190px]"
              style={{
                background: 'white',
                boxShadow: '0 4px 24px rgba(0,0,0,0.10), 0 1px 6px rgba(0,0,0,0.06)',
                border: '1px solid rgba(126,217,87,0.2)',
              }}
            >
              <AnimatePresence mode="wait">
                <motion.span
                  key={msgIndex}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  transition={{ duration: 0.22 }}
                  className="block leading-snug"
                >
                  {BUBBLE_MESSAGES[msgIndex]}
                </motion.span>
              </AnimatePresence>
            </div>

            {/* Thought bubble dots (bottom-right, pointing toward mascot) */}
            <div className="absolute -bottom-2 right-8 flex flex-col items-center gap-0.5">
              <div className="w-2.5 h-2.5 rounded-full bg-white" style={{ boxShadow: '0 2px 6px rgba(0,0,0,0.10)' }} />
              <div className="w-1.5 h-1.5 rounded-full bg-white" style={{ boxShadow: '0 2px 4px rgba(0,0,0,0.10)' }} />
              <div className="w-1 h-1 rounded-full bg-white" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.10)' }} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mascot */}
      <motion.button
        onClick={handleClick}
        onHoverStart={() => setBubbleVisible(true)}
        initial={{ opacity: 0, y: 40, scale: 0.7 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: 0.6, type: 'spring', stiffness: 240, damping: 18 }}
        whileTap={{ scale: 0.9 }}
        className="focus:outline-none relative"
        aria-label="Abrir asistente"
      >
        {/* Floating animation */}
        <motion.div
          animate={{ y: [0, -7, 0] }}
          transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
          className="relative"
        >
          {/* Shadow */}
          <motion.div
            className="absolute bottom-1 left-1/2 -translate-x-1/2 rounded-full"
            style={{ width: 44, height: 8, background: 'rgba(0,0,0,0.10)', filter: 'blur(5px)' }}
            animate={{ scaleX: [1, 0.75, 1], opacity: [0.5, 0.2, 0.5] }}
            transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
          />

          <motion.img
            src={MASCOT_URL}
            alt="Asistente"
            className="w-20 h-20 object-contain relative z-10"
            style={{ filter: 'drop-shadow(0 4px 12px rgba(0,143,76,0.25))' }}
            whileHover={{ scale: 1.1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 14 }}
          />
        </motion.div>
      </motion.button>
    </div>
  );
}