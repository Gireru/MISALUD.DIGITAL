import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, MessageSquarePlus, X, Send, AlertCircle, Clock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import LuxuryTimelineNode from '../components/patient/LuxuryTimelineNode';
import VoiceAssistant from '../components/accessibility/VoiceAssistant';
import { useVoice } from '@/lib/VoiceContext';

export default function PatientView() {
  // Robust token parsing for all browsers/devices
  const getToken = () => {
    // Try standard location.search first
    if (window.location.search) {
      const p = new URLSearchParams(window.location.search);
      const t = p.get('token');
      if (t) return t;
    }
    // Fallback: parse from full href
    const href = window.location.href;
    const match = href.match(/[?&]token=([^&]+)/);
    return match ? decodeURIComponent(match[1]) : null;
  };
  const token = getToken();
  const queryClient = useQueryClient();
  const { speak } = useVoice();
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hola, soy tu asistente. ¿Tienes alguna duda sobre tu visita?' }
  ]);
  const [inputMsg, setInputMsg] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['patient-journey-by-token', token],
    queryFn: async () => {
      const res = await base44.functions.invoke('getPatientByToken', { token });
      return res.data;
    },
    enabled: !!token,
    retry: 2,
    staleTime: 0,
    gcTime: 0,
  });
  const patient = data?.patient;
  const journey = data?.journey;

  const { data: comments = [] } = useQuery({
    queryKey: ['journey-comments', journey?.id],
    queryFn: () => base44.entities.JourneyComment.filter({ journey_id: journey.id }, '-created_date'),
    enabled: !!journey?.id,
  });

  useEffect(() => {
    if (!journey?.id) return;
    const unsub1 = base44.entities.ClinicalJourney.subscribe((event) => {
      if (event.id === journey.id) {
        queryClient.invalidateQueries({ queryKey: ['patient-journey-by-token', token] });
      }
    });
    const unsub2 = base44.entities.JourneyComment.subscribe((event) => {
      if (event.data?.journey_id === journey.id) {
        queryClient.invalidateQueries({ queryKey: ['journey-comments', journey.id] });
      }
    });
    return () => { unsub1(); unsub2(); };
  }, [journey?.id, queryClient, token]);

  const handleSend = async () => {
    if (!inputMsg.trim() || aiLoading) return;
    const text = inputMsg.trim();
    setInputMsg('');
    speak(text);
    setMessages(prev => [...prev, { role: 'user', content: text }]);
    setAiLoading(true);
    try {
      const res = await base44.functions.invoke('chatAssistant', {
        message: text,
        patientName: patient?.name || '',
      });
      const reply = res.data?.reply || 'Lo siento, no pude responder.';
      speak(reply);
      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Hubo un error al conectar con el asistente.' }]);
    }
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
        <div className="w-14 h-14 rounded-2xl bg-[#7ED957]/10 flex items-center justify-center mx-auto mb-5">
          <Activity className="w-7 h-7 text-[#7ED957]" />
        </div>
        <h1 style={{ fontFamily: '-apple-system, SF Pro Display, BlinkMacSystemFont, Segoe UI, sans-serif' }} className="text-2xl font-semibold mb-2 text-gray-900">Salud Digna NX</h1>
        <p className="text-gray-400 text-sm">Escanea tu código QR para ver tu trayecto</p>
      </div>
    </div>
  );

  const hasError = isError || (data?.error) || (!isLoading && (!patient || !journey));

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-2 border-[#7ED957]/20 border-t-[#7ED957] rounded-full animate-spin" />
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
        <a href="/register" className="text-sm text-[#7ED957] underline">Ir al registro</a>
      </div>
    </div>
  );

  return (
    <div
      className="min-h-screen bg-white flex flex-col items-center"
      style={{ fontFamily: '-apple-system, SF Pro Display, BlinkMacSystemFont, Segoe UI, sans-serif' }}
    >
      {/* Header hero */}
      <div className="relative w-full max-w-2xl overflow-hidden px-6 pt-14 pb-10">
        <div className="absolute inset-0 bg-gradient-to-br from-[#7ED957]/6 via-white to-[#008F4C]/4 pointer-events-none" />
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="text-center">
          <div className="flex items-center gap-2 mb-6 justify-center">
            <div className="w-7 h-7 rounded-xl bg-[#7ED957] flex items-center justify-center">
              <Activity className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-[11px] font-semibold tracking-widest text-[#7ED957] uppercase">Salud Digna NX</span>
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
            className="flex items-center gap-3 mt-6 rounded-2xl px-5 py-3 justify-center mx-auto w-full"
            style={{ background: 'rgba(126,217,87,0.06)', border: '1px solid rgba(126,217,87,0.1)' }}
          >
            <div className="text-center">
              <p className="text-[10px] text-[#7ED957]/60 font-medium uppercase tracking-wider">Tiempo restante</p>
              <p className="text-xl font-semibold text-[#7ED957]">{remainingMinutes} min</p>
            </div>
            <div className="w-px h-8 bg-[#7ED957]/10" />
            <div className="text-center">
              <p className="text-[10px] text-[#7ED957]/60 font-medium uppercase tracking-wider">Progreso</p>
              <p className="text-xl font-semibold text-[#7ED957]">{progressPercent}%</p>
            </div>
            <div className="w-px h-8 bg-[#7ED957]/10" />
            <div className="text-center">
              <p className="text-[10px] text-[#7ED957]/60 font-medium uppercase tracking-wider">Estudios</p>
              <p className="text-xl font-semibold text-[#7ED957]">{completedCount}/{studies.length}</p>
            </div>
          </motion.div>
        </motion.div>
      </div>

      {/* Doctor comments alerts */}
      {comments.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-2xl px-6 mb-6 space-y-2"
        >
          {comments.map(c => (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              className="p-4 rounded-2xl flex gap-3"
              style={{
                background: c.is_wait_extension ? 'rgba(245,166,35,0.08)' : 'rgba(126,217,87,0.06)',
                border: c.is_wait_extension ? '1px solid rgba(245,166,35,0.2)' : '1px solid rgba(126,217,87,0.1)',
              }}
            >
              {c.is_wait_extension ? (
                <Clock className="w-4 h-4 mt-0.5 shrink-0" style={{ color: '#f5a623' }} />
              ) : (
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: '#7ED957' }} />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-semibold text-gray-900 mb-0.5">
                  {c.doctor_name}
                </p>
                <p className="text-xs leading-relaxed text-gray-700">
                  {c.comment}
                </p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Vertical timeline */}
      <div className="w-full max-w-2xl px-6 pb-32">
        <p className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase mb-8 text-center">Tu recorrido</p>
        <div className="relative">
          {/* Background line */}
          <div className="absolute left-[27px] top-0 bottom-0 w-px bg-gray-100" />
          {/* Progress line */}
          <motion.div
            className="absolute left-[27px] top-0 w-px origin-top"
            style={{ background: 'linear-gradient(to bottom, #7ED957, #008F4C)' }}
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

      {/* Voice Assistant */}
      <VoiceAssistant
        onVoiceCommand={(command) => {
          if (command.includes('chat') || command.includes('asistente')) {
            setChatOpen(true);
            speak('Abriendo asistente');
          } else if (command.includes('cerrar') && chatOpen) {
            setChatOpen(false);
            speak('Cerrando asistente');
          }
        }}
      />

      {/* AI Assistant FAB */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center gap-2.5">

        {/* Floating speech bubble hint */}
        <motion.div
          initial={{ opacity: 0, scale: 0.85, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ delay: 2, type: 'spring', stiffness: 280, damping: 20 }}
          className="relative px-4 py-2 rounded-2xl text-[12px] font-semibold text-gray-800 shadow-lg"
          style={{ background: 'white', border: '1.5px solid rgba(126,217,87,0.35)' }}
        >
          💬 ¿Tienes dudas? ¡Puedo ayudarte!
          {/* Triangle pointer */}
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-3 h-3 bg-white rotate-45"
            style={{ border: '1.5px solid rgba(126,217,87,0.35)', borderTop: 'none', borderLeft: 'none' }} />
        </motion.div>

        {/* Main button */}
        <motion.button
          onClick={() => {
            setChatOpen(true);
            speak('¡Hola! Soy tu asistente. ¿En qué puedo ayudarte?');
          }}
          className="relative flex items-center gap-3 pl-2 pr-5 py-2 rounded-full text-white overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, #7ED957 0%, #3dba1e 100%)',
            boxShadow: '0 8px 30px rgba(126,217,87,0.6), 0 2px 8px rgba(0,0,0,0.08)',
          }}
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.94 }}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.3, type: 'spring', stiffness: 260, damping: 18 }}
        >
          {/* Outer glow pulse */}
          <motion.div
            className="absolute -inset-1 rounded-full opacity-30"
            style={{ background: 'radial-gradient(circle, #7ED957, transparent 70%)' }}
            animate={{ scale: [1, 1.25, 1], opacity: [0.3, 0, 0.3] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
          />

          {/* Avatar circle */}
          <motion.div
            className="relative w-11 h-11 rounded-full bg-white flex items-center justify-center shrink-0 shadow-sm"
            animate={{ rotate: [0, -5, 5, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', repeatDelay: 2 }}
          >
            <span className="text-xl">💚</span>
          </motion.div>

          <div className="text-left">
            <p className="text-[14px] font-extrabold leading-tight tracking-tight">Asistente IA</p>
            <p className="text-[11px] font-medium opacity-90 leading-tight">Resuelvo tus dudas al instante ✨</p>
          </div>

          {/* Animated chevron */}
          <motion.div
            className="ml-1"
            animate={{ x: [0, 3, 0] }}
            transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
          >
            <span className="text-white text-base font-bold">›</span>
          </motion.div>
        </motion.button>
      </div>

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
                  <div className="w-9 h-9 rounded-2xl bg-[#7ED957] flex items-center justify-center">
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
                          ? { background: '#7ED957', color: 'white', borderBottomRightRadius: 6 }
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
                  className="rounded-2xl border-0 bg-gray-100 text-sm focus-visible:ring-1 focus-visible:ring-[#7ED957]/30"
                />
                <Button
                  onClick={handleSend}
                  disabled={aiLoading}
                  className="rounded-2xl shrink-0 px-4"
                  style={{ background: '#7ED957' }}
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