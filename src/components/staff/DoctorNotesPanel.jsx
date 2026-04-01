import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Plus, Clock } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';

export default function DoctorNotesPanel({ journey, onClose, onUpdate }) {
  const [noteText, setNoteText] = useState('');
  const [saving, setSaving] = useState(false);
  const [addingWait, setAddingWait] = useState(false);

  // Fetch comments for this journey
  const { data: comments = [] } = useQuery({
    queryKey: ['journey-comments', journey.id],
    queryFn: () => base44.entities.JourneyComment.filter({ journey_id: journey.id }, '-created_date'),
    enabled: !!journey.id,
  });

  const handleAddNote = async () => {
    if (!noteText.trim()) return;
    setSaving(true);
    try {
      const user = await base44.auth.me();
      await base44.entities.JourneyComment.create({
        journey_id: journey.id,
        patient_name: journey.patient_name,
        comment: noteText.trim(),
        doctor_name: user?.full_name || user?.email || 'Doctor',
        is_wait_extension: false,
      });
      setNoteText('');
      onUpdate?.();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleAddWaitTime = async () => {
    setAddingWait(true);
    try {
      const user = await base44.auth.me();
      // Update avg_wait_minutes for all modules related to current studies
      const currentStudies = journey.studies?.filter(s => s.status !== 'completed') || [];
      for (const study of currentStudies) {
        const modules = await base44.entities.ClinicalModule.filter({ area_name: study.area });
        for (const mod of modules) {
          await base44.entities.ClinicalModule.update(mod.id, {
            avg_wait_minutes: (mod.avg_wait_minutes || 0) + 10,
          });
        }
      }

      // Create notification comment
      await base44.entities.JourneyComment.create({
        journey_id: journey.id,
        patient_name: journey.patient_name,
        comment: 'Se ha extendido el tiempo de espera estimado en 10 minutos debido a demanda clínica.',
        doctor_name: user?.full_name || user?.email || 'Doctor',
        is_wait_extension: true,
        wait_extension_minutes: 10,
      });
      onUpdate?.();
    } catch (err) {
      console.error(err);
    } finally {
      setAddingWait(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/40 flex items-end justify-center z-50 p-4 md:items-center"
      >
        <motion.div
          initial={{ opacity: 0, y: '100%' }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          onClick={e => e.stopPropagation()}
          className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 space-y-4 max-h-96 flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-lg text-gray-900">
                Notas: {journey.patient_name}
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">Deja comentarios que el paciente podrá leer</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>

          {/* Comments list */}
          <div className="flex-1 overflow-y-auto space-y-3 border-b border-gray-200 pb-4">
            {comments.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">
                Sin comentarios aún
              </p>
            ) : (
              comments.map(c => (
                <div
                  key={c.id}
                  className="p-3 rounded-xl"
                  style={{
                    background: c.is_wait_extension ? 'rgba(245,166,35,0.08)' : 'rgba(0,0,0,0.03)',
                    border: c.is_wait_extension ? '1px solid rgba(245,166,35,0.2)' : '1px solid transparent',
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-gray-900">
                        {c.doctor_name}
                      </p>
                      <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                        {c.comment}
                      </p>
                    </div>
                    {c.is_wait_extension && (
                      <span
                        className="text-[10px] font-bold px-2 py-1 rounded-full shrink-0"
                        style={{ background: 'rgba(245,166,35,0.2)', color: '#f5a623' }}
                      >
                        +{c.wait_extension_minutes}m
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1.5">
                    {new Date(c.created_date).toLocaleTimeString('es-MX', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              ))
            )}
          </div>

          {/* Input */}
          <div className="flex gap-2">
            <input
              type="text"
              value={noteText}
              onChange={e => setNoteText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddNote()}
              placeholder="Escribe un comentario…"
              className="flex-1 px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <button
              onClick={handleAddNote}
              disabled={!noteText.trim() || saving}
              className="p-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700 transition-colors disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>

          {/* Wait time extension button */}
          <button
            onClick={handleAddWaitTime}
            disabled={addingWait}
            className="w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
            style={{
              background: 'rgba(245,166,35,0.1)',
              color: '#f5a623',
              border: '1px solid rgba(245,166,35,0.2)',
            }}
          >
            <Clock className="w-4 h-4" />
            {addingWait ? 'Agregando...' : '+ 10 min de espera'}
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}