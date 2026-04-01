import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, MessageSquarePlus, X, Send, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import LuxuryTimelineNode from '../components/patient/LuxuryTimelineNode';

export default function PatientView() {
  const fullSearch = window.location.search || window.location.href.split('?')[1] || '';
  const urlParams = new URLSearchParams(fullSearch);
  const token = urlParams.get('token');
  const queryClient = useQueryClient();
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hola, soy tu asistente. ¿Tienes alguna duda sobre tu visita?' }
  ]);
  const [inputMsg, setInputMsg] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  const { data: patients, isLoading: loadingPatient, isError: errorPatient } = useQuery({
    queryKey: ['patient-by-token', token],
    queryFn: () => base44.entities.Patient.filter({ qr_token: token }),
    enabled: !!token,
    retry: 3,
    staleTime: 0,
    gcTime: 0,
  });
  const patient = patients?.[0];

  const { data: journeys, isLoading: loadingJourney, isError: errorJourney } = useQuery({
    queryKey: ['journey-for-patient', patient?.id],
    queryFn: async () => {
      const results = await base44.entities.ClinicalJourney.filter({ patient_id: patient.id });
      if (results && results.length > 0) return results;
      // Fallback: search by patient_name
      return base44.entities.ClinicalJourney.filter({ patient_name: patient.name });
    },
    enabled: !!patient?.id,
    retry: 3,
    staleTime: 0,
    gcTime: 0,
  });
  const journey = journeys?.[0];

  useEffect(() => {
    if (!journey?.id) return;
    const unsub = base44.entities.ClinicalJourney.subscribe((event) => {
      if (event.id === journey.id) {
        queryClient.invalidateQueries({ queryKey: ['journey-for-patient'] });
      }
    });
    return unsub;
  }, [journey?.id, queryClient]);

  const handleSend = async () => {
    if (!inputMsg.trim() || aiLoading) return;
    const text = inputMsg.trim();
    setInputMsg('');
    setMessages(prev => [...prev, { role: 'user', content: text }]);
    setAiLoading(true);
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `Eres un asistente clínico amigable de SD-NEXUS. Responde en español, brevemente. Pregunta: "${text}"`,
    });
    setMessages(prev => [...prev, { role: 'assistant', content: res }]);
    setAiLoading(false);
  };

  const studies = journey?.studies || [];
  const completedCount = studies.filter(s => s.status === 'completed').length;
  const remainingMinutes = studies
    .filter(s => s.status !== 'completed')
    .reduce((sum, s) => sum + (s.estimated_minutes || 0), 0);
  const totalMinutes = studies.reduce((sum, s) => sum + (s.estimated_minutes || 0), 0);
  const progressPercent = totalMinutes > 0 ? Math.round((totalMinutes - remainingMinutes) / totalMinutes * 100) : 0;

  if (!token) return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="text-center">
        <div className="w-14 h-14 rounded-2xl bg-[#4B0082]/10 flex items-center justify-center mx-auto mb-5">
          <Activity className="w-7 h-7 text-[#4B0082]" />
        </div>
        <h1 style={{ fontFamily: '-apple-system, SF Pro Display, BlinkMacSystemFont, Segoe UI, sans-serif' }} className="text-2xl font-semibold mb-2 text-gray-900">SD-NEXUS</h1>
        <p className="text-gray-400 text-sm">Escanea tu código QR para ver tu trayecto</p>
      </div>
    </div>
  );

  const isLoading = loadingPatient || (!!patient && loadingJourney);
  const hasError = errorPatient || errorJourney || (patients && patients.length === 0) || (journeys && journeys.length === 0 && !loadingJourney);

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-2 border-[#4B0082]/20 border-t-[#4B0082] rounded-full animate-spin" />
        <p style={{ fontFamily: '-apple-system, SF Pro Display, BlinkMacSystemFont, Segoe UI, sans-serif' }} className="text-xs text-gray-400">Cargando tu trayecto…</p>
      </div>
    </div>
  );

  if (hasError || !patient || !journey) return (
    <div className="min-h-screen flex items-center justify-center bg-white px-6">
      <div className="text-center">
        <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-4">
          <Activity className="w-7 h-7 text-red-400" />
        </div>
        <h2 style={{ fontFamily: '-apple-system, SF Pro Display, BlinkMacSystemFont, Segoe UI, sans-serif' }} className="text-lg font-semibold text-gray-800 mb-2">No se encontró el trayecto</h2>
        <p className="text-sm text-gray-400 mb-5">Verifica que el enlace o código QR sea correcto.</p>
        <a href="/register" className="text-sm text-[#4B0082] underline">Ir al registro</a>
      </div>
    </div>
  );

  return (
    <div
      className="min-h-screen bg-white"
      style={{ fontFamily: '-apple-system, SF Pro Display, BlinkMacSystemFont, Segoe UI, sans-serif' }}
    >
      {/* Header hero */}
      <div className="relative overflow-hidden px-6 pt-14 pb-10">
        <div className="absolute inset-0 bg-gradient-to-br from-[#4B0082]/6 via-white to-[#008F4C]/4 pointer-events-none" />
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <div className="flex items-center gap-2 mb-6">
            <div className="w-7 h-7 rounded-xl bg-[#4B0082] flex items-center justify-center">
              <Activity className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-[11px] font-semibold tracking-widest text-[#4B0082] uppercase">SD-NEXUS</span>
          </div>

          <h1 className="text-3xl font-light text-gray-900 leading-tight">
            Hola, <span className="font-semibold">{patient.name.split(' ')[0]}</span>
          </h1>
          <p className="text-gray-400 text-sm mt-1.5 font-light">Tu visita está siendo optimizada</p>

          {/* ETA pill */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="inline-flex items-center gap-3 mt-6 rounded-2xl px-5 py-3"
            style={{ background: 'rgba(75,0,130,0.06)', border: '1px solid rgba(75,0,130,0.1)' }}
          >
            <div className="text-center">
              <p className="text-[10px] text-[#4B0082]/60 font-medium uppercase tracking-wider">Tiempo restante</p>
              <p className="text-xl font-semibold text-[#4B0082]">{remainingMinutes} min</p>
            </div>
            <div className="w-px h-8 bg-[#4B0082]/10" />
            <div className="text-center">
              <p className="text-[10px] text-[#4B0082]/60 font-medium uppercase tracking-wider">Progreso</p>
              <p className="text-xl font-semibold text-[#4B0082]">{progressPercent}%</p>
            </div>
            <div className="w-px h-8 bg-[#4B0082]/10" />
            <div className="text-center">
              <p className="text-[10px] text-[#4B0082]/60 font-medium uppercase tracking-wider">Estudios</p>
              <p className="text-xl font-semibold text-[#4B0082]">{completedCount}/{studies.length}</p>
            </div>
          </motion.div>
        </motion.div>
      </div>

      {/* Vertical timeline */}
      <div className="px-6 pb-32 max-w-md mx-auto">
        <p className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase mb-8">Tu recorrido</p>
        <div className="relative">
          {/* Background line */}
          <div className="absolute left-[27px] top-0 bottom-0 w-px bg-gray-100" />
          {/* Progress line */}
          <motion.div
            className="absolute left-[27px] top-0 w-px origin-top"
            style={{ background: 'linear-gradient(to bottom, #4B0082, #008F4C)' }}
            initial={{ scaleY: 0 }}
            animate={{ scaleY: progressPercent / 100 }}
            transition={{ duration: 1.2, ease: 'easeOut', delay: 0.5 }}
          />

          {studies.map((study, i) => (
            <LuxuryTimelineNode
              key={i}
              study={study}
              index={i}
              isLast={i === studies.length - 1}
            />
          ))}
        </div>
      </div>

      {/* Glassmorphism FAB */}
      <motion.button
        onClick={() => setChatOpen(true)}
        className="fixed bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2.5 px-6 py-3.5 rounded-2xl z-40"
        style={{
          background: 'rgba(255,255,255,0.7)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(75,0,130,0.15)',
          boxShadow: '0 8px 32px rgba(75,0,130,0.12), 0 2px 8px rgba(0,0,0,0.06)',
        }}
        whileHover={{ scale: 1.04, boxShadow: '0 12px 40px rgba(75,0,130,0.2)' }}
        whileTap={{ scale: 0.97 }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1 }}
      >
        <div className="w-6 h-6 rounded-lg bg-[#4B0082] flex items-center justify-center">
          <MessageSquarePlus className="w-3.5 h-3.5 text-white" />
        </div>
        <span className="text-[13px] font-medium text-gray-800">+ Asistente</span>
      </motion.button>

      {/* Chat overlay */}
      <AnimatePresence>
        {chatOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center"
            style={{ background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(4px)' }}
            onClick={(e) => { if (e.target === e.currentTarget) setChatOpen(false); }}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="w-full max-w-lg rounded-t-3xl overflow-hidden"
              style={{ background: 'rgba(255,255,255,0.96)', backdropFilter: 'blur(30px)', height: '72vh' }}
            >
              {/* Chat header */}
              <div className="flex items-center justify-between px-6 pt-6 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-2xl bg-[#4B0082] flex items-center justify-center">
                    <MessageSquarePlus className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-gray-900">Asistente SD</p>
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#008F4C]" />
                      <p className="text-[11px] text-gray-400">En línea</p>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setChatOpen(false)}
                  className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-700 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-5 pb-3 space-y-4" style={{ height: 'calc(72vh - 160px)' }}>
                {messages.map((msg, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className="max-w-[78%] rounded-2xl px-4 py-3 text-[13px] leading-relaxed"
                      style={
                        msg.role === 'user'
                          ? { background: '#4B0082', color: 'white', borderBottomRightRadius: 6 }
                          : { background: '#f5f5f7', color: '#1d1d1f', borderBottomLeftRadius: 6 }
                      }
                    >
                      {msg.content}
                    </div>
                  </motion.div>
                ))}
                {aiLoading && (
                  <div className="flex justify-start">
                    <div className="px-4 py-3 rounded-2xl rounded-bl-sm" style={{ background: '#f5f5f7' }}>
                      <div className="flex gap-1">
                        {[0, 0.2, 0.4].map((d, i) => (
                          <motion.div key={i} className="w-1.5 h-1.5 rounded-full bg-gray-400"
                            animate={{ opacity: [0.3, 1, 0.3] }}
                            transition={{ duration: 1, delay: d, repeat: Infinity }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Input */}
              <div className="px-5 pb-8 pt-3 border-t border-gray-100 flex gap-2">
                <Input
                  value={inputMsg}
                  onChange={e => setInputMsg(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSend()}
                  placeholder="Escribe tu pregunta…"
                  className="rounded-2xl border-0 bg-gray-100 text-sm focus-visible:ring-1 focus-visible:ring-[#4B0082]/30"
                />
                <Button
                  onClick={handleSend}
                  disabled={aiLoading}
                  className="rounded-2xl shrink-0 px-4"
                  style={{ background: '#4B0082' }}
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}