import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
import { useVoice } from '@/lib/VoiceContext';

export default function VoiceAssistant({ onVoiceCommand = null }) {
  const { isListening, isSpeaking, transcript, recognitionSupported, speak, startListening, stopListening, clearTranscript } = useVoice();
  const [showTranscript, setShowTranscript] = useState(false);

  useEffect(() => {
    if (transcript) {
      setShowTranscript(true);
      if (onVoiceCommand) {
        onVoiceCommand(transcript.toLowerCase());
      }
      const timer = setTimeout(() => setShowTranscript(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [transcript, onVoiceCommand]);

  if (!recognitionSupported) return null;

  const handleMicClick = () => {
    if (isListening) {
      stopListening();
      clearTranscript();
    } else {
      clearTranscript();
      startListening();
      speak('Estoy escuchando, cuéntame qué necesitas');
    }
  };

  return (
    <>
      {/* Floating voice button */}
      <motion.button
        onClick={handleMicClick}
        className="fixed bottom-24 right-6 z-40 w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all"
        style={{
          background: isListening ? 'linear-gradient(135deg, #ff2d55, #ff5a7a)' : 'linear-gradient(135deg, #4B0082, #7B00CC)',
          border: isListening ? '2px solid rgba(255,45,85,0.5)' : 'none',
        }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        animate={isListening ? { scale: [1, 1.05, 1] } : {}}
        transition={isListening ? { duration: 0.8, repeat: Infinity } : {}}
        title={isListening ? 'Detener escucha' : 'Iniciar escucha por voz'}
      >
        {isListening ? (
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 0.6, repeat: Infinity }}
          >
            <Mic className="w-6 h-6 text-white" />
          </motion.div>
        ) : (
          <MicOff className="w-6 h-6 text-white" />
        )}
      </motion.button>

      {/* Transcript display */}
      <AnimatePresence>
        {showTranscript && transcript && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-40 left-6 right-6 md:left-auto md:right-6 md:w-80 z-40 p-4 rounded-2xl shadow-lg"
            style={{
              background: 'rgba(75, 0, 130, 0.95)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(123, 0, 204, 0.3)',
            }}
          >
            <p className="text-white text-sm leading-relaxed">
              <span className="font-semibold">Te escuché:</span> {transcript}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Speaking indicator */}
      <AnimatePresence>
        {isSpeaking && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="fixed top-6 right-6 z-40 flex items-center gap-2 px-4 py-2 rounded-full"
            style={{
              background: 'rgba(75, 0, 130, 0.95)',
              border: '1px solid rgba(123, 0, 204, 0.3)',
            }}
          >
            <motion.div
              animate={{ scale: [1, 1.3, 1] }}
              transition={{ duration: 0.6, repeat: Infinity }}
            >
              <Volume2 className="w-4 h-4 text-green-400" />
            </motion.div>
            <span className="text-white text-xs font-medium">Hablando...</span>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}