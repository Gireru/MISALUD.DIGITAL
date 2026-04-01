import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, CheckCircle2, AlertCircle, QrCode } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { QRCodeSVG } from 'qrcode.react';
import { useVoice } from '@/lib/VoiceContext';
import { Button } from '@/components/ui/button';

const STUDY_ALIASES = {
  'análisis': 'Análisis de Sangre',
  'sangre': 'Análisis de Sangre',
  'radiografía': 'Radiografía de Tórax',
  'rayos': 'Radiografía de Tórax',
  'x': 'Radiografía de Tórax',
  'ultrasonido': 'Ultrasonido Abdominal',
  'ecografía': 'Ultrasonido Abdominal',
  'electrocardiograma': 'Electrocardiograma',
  'corazón': 'Electrocardiograma',
  'vista': 'Examen de Vista',
  'ojo': 'Examen de Vista',
  'vacuna': 'Vacunación',
  'vacunación': 'Vacunación',
};

export default function VoiceRegistrationFlow() {
  const { speak, transcript, clearTranscript, isListening, startListening, stopListening } = useVoice();
  const [step, setStep] = useState('start');
  const [registrationData, setRegistrationData] = useState({ name: '', phone: '', studies: [] });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [message, setMessage] = useState('');
  const transcriptRef = useRef('');

  // Start registration flow
  useEffect(() => {
    if (step === 'start') {
      initializeFlow();
    }
  }, []);

  // Process transcript when it updates
  useEffect(() => {
    if (transcript && step !== 'start' && step !== 'complete') {
      transcriptRef.current = transcript;
    }
  }, [transcript, step]);

  const initializeFlow = async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke('voiceRegistrationFlow', {
        action: 'start'
      });
      setMessage(res.data.message);
      speak(res.data.message);
      setStep('ask_name');
      setLoading(false);
      setTimeout(() => {
        clearTranscript();
        startListening();
      }, 1000);
    } catch (err) {
      setMessage('Error al iniciar el flujo');
      setLoading(false);
    }
  };

  const processStep = async (nextAction) => {
    stopListening();
    const input = transcriptRef.current.trim();
    if (!input) {
      speak('No escuché tu respuesta. Intenta de nuevo.');
      setTimeout(() => {
        clearTranscript();
        startListening();
      }, 500);
      return;
    }

    setLoading(true);
    try {
      const res = await base44.functions.invoke('voiceRegistrationFlow', {
        action: nextAction,
        currentData: registrationData,
        transcript: input
      });

      if (res.data.error) {
        setMessage(res.data.error);
        speak(res.data.error);
        setLoading(false);
        return;
      }

      setMessage(res.data.message);
      setRegistrationData(res.data.data || registrationData);
      speak(res.data.message);

      setLoading(false);

      if (res.data.nextStep === 'confirm') {
        setStep('confirm');
      } else if (res.data.nextStep === 'ask_studies_more') {
        setStep('ask_studies');
      } else if (res.data.nextStep === 'complete') {
        setResult(res.data.registrationData);
        setStep('complete');
        return;
      } else {
        setStep(res.data.nextStep);
      }

      setTimeout(() => {
        clearTranscript();
        startListening();
      }, 500);
    } catch (err) {
      setMessage('Error: ' + err.message);
      speak('Hubo un error');
      setLoading(false);
    }
  };

  if (step === 'complete' && result) {
    const patientUrl = `${window.location.origin}/patient/view?token=${result.qrToken}`;

    return (
      <div className="min-h-screen flex items-center justify-center bg-white p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-xs text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2 }}
            className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-4"
            style={{ background: 'rgba(0,143,76,0.1)' }}
          >
            <CheckCircle2 className="w-10 h-10" style={{ color: '#008F4C' }} />
          </motion.div>

          <h2 className="font-heading text-2xl font-bold mb-1">¡Registro completado!</h2>
          <p className="text-sm mb-6" style={{ color: '#888' }}>
            {result.patientName} • ETA: {result.totalEta} min
          </p>

          <div className="flex flex-col items-center mb-6">
            <div className="p-4 bg-white rounded-3xl border shadow-sm inline-block mb-3">
              <QRCodeSVG value={patientUrl} size={180} level="H" />
            </div>
          </div>

          <a
            href={patientUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full h-12 rounded-xl text-sm font-semibold text-white mb-3"
            style={{ background: 'linear-gradient(135deg, #4B0082, #7B00CC)' }}
          >
            <QrCode className="w-4 h-4" /> Ver mi trayecto
          </a>

          <button
            onClick={() => window.location.href = '/register'}
            className="w-full h-10 rounded-xl border border-gray-200 text-sm text-gray-700 hover:bg-gray-50"
          >
            Nuevo registro
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#4B0082]/5 to-[#008F4C]/5 flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-[#4B0082]/10 flex items-center justify-center mx-auto mb-3">
            <Mic className="w-7 h-7 text-[#4B0082]" />
          </div>
          <h1 className="font-heading text-2xl font-bold mb-1">Registro por Voz</h1>
          <p className="text-sm text-gray-500">SD-NEXUS Accesible</p>
        </div>

        {/* Message bubble */}
        <motion.div
          key={message}
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-5 rounded-2xl mb-6 border"
          style={{
            background: 'rgba(75, 0, 130, 0.08)',
            borderColor: 'rgba(75, 0, 130, 0.2)',
          }}
        >
          <p className="text-sm leading-relaxed text-gray-900">{message}</p>
        </motion.div>

        {/* Transcript display */}
        {transcript && !loading && step !== 'start' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-4 rounded-xl bg-white border border-gray-200 mb-4"
          >
            <p className="text-[11px] text-gray-500 mb-1">Escuché:</p>
            <p className="text-sm font-medium text-gray-900">{transcript}</p>
          </motion.div>
        )}

        {/* Current data display */}
        {(registrationData.name || registrationData.phone || registrationData.studies.length > 0) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-4 rounded-xl bg-green-50 border border-green-200 mb-4 space-y-2"
          >
            {registrationData.name && (
              <p className="text-xs text-green-900">
                <span className="font-semibold">Nombre:</span> {registrationData.name}
              </p>
            )}
            {registrationData.phone && (
              <p className="text-xs text-green-900">
                <span className="font-semibold">Teléfono:</span> {registrationData.phone}
              </p>
            )}
            {registrationData.studies.length > 0 && (
              <p className="text-xs text-green-900">
                <span className="font-semibold">Estudios:</span> {registrationData.studies.join(', ')}
              </p>
            )}
          </motion.div>
        )}

        {/* Loading indicator */}
        {loading && (
          <div className="flex justify-center mb-6">
            <div className="w-8 h-8 border-2 border-[#4B0082]/20 border-t-[#4B0082] rounded-full animate-spin" />
          </div>
        )}

        {/* Action buttons */}
        <div className="space-y-3">
          {step === 'ask_name' && (
            <button
              onClick={() => processStep('process_name')}
              disabled={loading || !transcript}
              className="w-full h-12 rounded-xl font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-50"
              style={{ background: '#4B0082' }}
            >
              <Mic className="w-4 h-4" /> Confirmar nombre
            </button>
          )}

          {step === 'ask_phone' && (
            <button
              onClick={() => processStep('process_phone')}
              disabled={loading || !transcript}
              className="w-full h-12 rounded-xl font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-50"
              style={{ background: '#4B0082' }}
            >
              <Mic className="w-4 h-4" /> Confirmar teléfono
            </button>
          )}

          {(step === 'ask_studies' || step === 'confirm') && (
            <>
              <button
                onClick={() => processStep('process_studies')}
                disabled={loading || !transcript}
                className="w-full h-12 rounded-xl font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-50"
                style={{ background: '#4B0082' }}
              >
                <Mic className="w-4 h-4" /> Agregar estudio
              </button>

              {step === 'confirm' && (
                <button
                  onClick={() => processStep('complete_registration')}
                  disabled={loading}
                  className="w-full h-12 rounded-xl font-semibold text-white flex items-center justify-center gap-2"
                  style={{ background: '#008F4C' }}
                >
                  <CheckCircle2 className="w-4 h-4" /> Completar registro
                </button>
              )}
            </>
          )}
        </div>

        {/* Listening indicator */}
        {isListening && !loading && (
          <motion.div
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="text-center mt-6 text-sm text-[#4B0082] font-medium"
          >
            🎤 Escuchando...
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}