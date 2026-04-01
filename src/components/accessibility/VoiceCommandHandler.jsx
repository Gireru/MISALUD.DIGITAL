import { useVoice } from '@/lib/VoiceContext';
import { useCallback } from 'react';

export function useVoiceCommands(commands = {}) {
  const { speak } = useVoice();

  const handleVoiceCommand = useCallback((transcript) => {
    const cleanTranscript = transcript.toLowerCase().trim();

    // Default voice commands
    const defaultCommands = {
      'repite': () => speak('¿Qué deseas que repita?'),
      'vuelve': () => window.history.back(),
      'inicio': () => window.location.href = '/',
      'registro': () => window.location.href = '/register',
      'ayuda': () => speak('Puedes decir: repite, vuelve, inicio, registro, más lento, más rápido'),
      'más lento': () => speak('Ajustando velocidad', { rate: 0.8 }),
      'más rápido': () => speak('Ajustando velocidad', { rate: 1.2 }),
      'silencio': () => speak(''),
    };

    // Merge with custom commands
    const allCommands = { ...defaultCommands, ...commands };

    // Check for matches
    for (const [key, handler] of Object.entries(allCommands)) {
      if (cleanTranscript.includes(key)) {
        handler(cleanTranscript);
        return;
      }
    }
  }, [speak]);

  return { handleVoiceCommand };
}