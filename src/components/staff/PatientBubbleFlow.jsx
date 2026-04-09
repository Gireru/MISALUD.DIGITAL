import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Phone, AlertTriangle, Trash2, MessageSquare, Check, X, Siren, Clock } from 'lucide-react';
import { api } from '@/api/client';
import { useQuery } from '@tanstack/react-query';
import EmergencyCodeModal from './EmergencyCodeModal';
import DoctorNotesPanel from './DoctorNotesPanel';
import { CompletionOverlay } from '../patient/LuxuryTimelineNode';
import { useClinicManager } from '@/hooks/useClinicManager';

// ── Mirror of getSteps from LuxuryTimelineNode ──────────────────────
function getSteps(studyName) {
  const l = studyName.toLowerCase();
  if (l.includes('tórax') || l.includes('torax') || l.includes('radiograf'))
    return [
      { label: 'Espera a que el médico llame tu nombre' },
      { label: 'Radiografía en proceso' },
      { label: 'Entrega de resultados por la tarde' },
    ];
  if (l.includes('sangre') || l.includes('laborator'))
    return [
      { label: 'Registra tu turno en ventanilla' },
      { label: 'Toma de muestra en proceso' },
      { label: 'Resultados listos en 24–48 h' },
    ];
  if (l.includes('ultrasonido') || l.includes('4d'))
    return [
      { label: 'Espera tu turno en sala de ultrasonido' },
      { label: 'Estudio de ultrasonido en proceso' },
      { label: 'El médico entrega reporte al finalizar' },
    ];
  if (l.includes('electrocardiograma'))
    return [
      { label: 'Espera que el técnico te indique' },
      { label: 'Electrocardiograma en proceso' },
      { label: 'Resultados inmediatos' },
    ];
  if (l.includes('resonancia'))
    return [
      { label: 'Retira objetos metálicos y espera' },
      { label: 'Resonancia en proceso (~40 min)' },
      { label: 'Resultados disponibles en 24 h' },
    ];
  if (l.includes('tomograf'))
    return [
      { label: 'Espera indicación del técnico' },
      { label: 'Tomografía en proceso' },
      { label: 'Resultados disponibles en 24 h' },
    ];
  if (l.includes('vista') || l.includes('lentes'))
    return [
      { label: 'Espera tu turno en optometría' },
      { label: 'Examen de vista en proceso' },
      { label: 'Receta lista al finalizar' },
    ];
  return [
    { label: 'Espera a que llamen tu nombre' },
    { label: 'Estudio en proceso' },
    { label: 'Resultados disponibles próximamente' },
  ];
}

// ── Priority color palette ──────────────────────────────────────────
const PRIORITY = {
  green:  { bg: '#16a34a', light: 'rgba(22,163,74,0.08)',  border: 'rgba(22,163,74,0.2)',  label: 'Inicio' },
  yellow: { bg: '#d97706', light: 'rgba(217,119,6,0.08)',  border: 'rgba(217,119,6,0.2)',  label: 'Avance' },
  red:    { bg: '#dc2626', light: 'rgba(220,38,38,0.08)',  border: 'rgba(220,38,38,0.2)',  label: 'Urgente' },
};

/**
 * Calculates priority color based on time since journey creation:
 *  - green  : 0–10 minutes
 *  - yellow : 10–15 minutes (naranja)
 *  - red    : 15+ minutes
 */
function getAutoPriority(studies, createdDate) {
  const created = createdDate ? new Date(createdDate) : new Date();
  const minutesElapsed = (Date.now() - created.getTime()) / 60000;
  if (minutesElapsed >= 15) return 'red';
  if (minutesElapsed >= 10) return 'yellow';
  return 'green';
}

function getColor(journey) {
  const override = journey.priority_color;
  const key = (!override || override === 'auto')
    ? getAutoPriority(journey.studies || [], journey.created_date)
    : override;
  return PRIORITY[key] || PRIORITY.green;
}

/** Sort: red first, yellow second, green last */
function sortByPriority(journeys) {
  const order = { red: 0, yellow: 1, green: 2 };
  return [...journeys].sort((a, b) => {
    const pa = getAutoPriority(a.studies || [], a.created_date);
    const pb = getAutoPriority(b.studies || [], b.created_date);
    const oa = a.priority_color && a.priority_color !== 'auto' ? order[a.priority_color] : order[pa];
    const ob = b.priority_color && b.priority_color !== 'auto' ? order[b.priority_color] : order[pb];
    return oa - ob;
  });
}

function getInitials(name) {
  return name?.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?';
}



// ── Patient Card ────────────────────────────────────────────────────
function PatientCard({ journey, index, onUpdate, onStudyComplete, onMarkUrgent }) {
  const [emergencyOpen, setEmergencyOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [justCompleted, setJustCompleted] = useState(false);
  // Local studies state so UI updates immediately without waiting for parent refresh
  const [localStudies, setLocalStudies] = useState(journey.studies || []);

  // Sync local state when journey prop changes (e.g. real-time update from parent)
  React.useEffect(() => {
    setLocalStudies(journey.studies || []);
  }, [journey.studies]);

  const color = getColor({ ...journey, studies: localStudies });
  const autoPriority = getAutoPriority(localStudies, journey.created_date);

  const archiveJourney = async () => {
    setDeleting(true);
    await api.entities.ClinicalJourney.update(journey.id, { status: 'cancelled' });
    onUpdate?.();
  };

  const { data: patient } = useQuery({
    queryKey: ['patient', journey.patient_id],
    queryFn: () => api.entities.Patient.filter({ id: journey.patient_id }).then(r => r[0] || null),
    enabled: !!journey.patient_id,
    staleTime: 30000,
  });

  const markStep = async (studyIndex, stepIndex) => {
    const updatedStudies = localStudies.map((s, i) => i === studyIndex ? { ...s, steps_done: (s.steps_done || 0) + 1 } : s);
    const study = updatedStudies[studyIndex];
    const steps = getSteps(study?.study_name || '');
    // Update UI immediately
    setLocalStudies(updatedStudies);
    await api.entities.ClinicalJourney.update(journey.id, { studies: updatedStudies });
    if ((study.steps_done || 0) >= steps.length - 1) {
      setTimeout(() => markStudyComplete(studyIndex, updatedStudies), 400);
    }
  };

  const markStudyComplete = async (studyIndex, baseStudies) => {
    const updatedStudies = (baseStudies || localStudies).map((s, i) => {
      if (i === studyIndex) return { ...s, status: 'completed', completed_at: new Date().toISOString() };
      return s;
    });

    // Set next pending to in_progress
    const nextPendingIdx = updatedStudies.findIndex(s => s.status === 'pending');
    if (nextPendingIdx !== -1) updatedStudies[nextPendingIdx] = { ...updatedStudies[nextPendingIdx], status: 'in_progress' };

    const allDone = updatedStudies.every(s => s.status === 'completed');
    if (allDone) setJustCompleted(true);

    // Update UI immediately
    setLocalStudies(updatedStudies);

    await api.entities.ClinicalJourney.update(journey.id, {
      studies: updatedStudies,
      status: allDone ? 'completed' : 'active',
    });
    if (allDone) {
      await api.entities.Patient.update(journey.patient_id, { current_status: 'completed' });
    }

    // 🧠 Trigger ClinicController scheduler
    const completedStudy = updatedStudies[studyIndex];
    const roomId = completedStudy.cubicle || `${completedStudy.study_name}-R1`;
    onStudyComplete?.(journey.id, completedStudy.study_name, roomId);

    onUpdate?.();
  };

  const studies = localStudies;
  const completed = studies.filter(s => s.status === 'completed').length;
  const currentStudy = studies.find(s => s.status === 'in_progress');
  const completedCount = completed;
  const progressPct = studies.length > 0 ? completedCount / studies.length : 0;

  return (
    <>
      <motion.div
        layout
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{
          opacity: 1,
          y: 0,
          scale: justCompleted ? [1, 1.03, 1] : 1,
        }}
        exit={{ opacity: 0, scale: 0.95, y: -12 }}
        transition={{
          delay: index * 0.06,
          duration: 0.4,
          type: 'spring',
          stiffness: 260,
          damping: 22,
        }}
        whileHover={{
          y: -3,
          boxShadow: `0 8px 32px ${color.bg}30`,
          transition: { duration: 0.2 },
        }}
        className="relative rounded-3xl p-5 overflow-hidden cursor-default"
        style={{
          background: 'white',
          boxShadow: `0 2px 20px ${color.bg}18`,
          border: `1px solid ${color.border}`,
        }}
      >
        {/* Top accent line — animated shimmer */}
        <motion.div
          className="absolute top-0 left-0 right-0 h-1 rounded-t-3xl overflow-hidden"
          style={{ background: color.bg }}
        >
          <motion.div
            className="absolute inset-0 opacity-50"
            style={{ background: `linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent)` }}
            animate={{ x: ['-100%', '200%'] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: 'linear', repeatDelay: 1.5 }}
          />
        </motion.div>

        {/* Progress bar behind card */}
        <motion.div
          className="absolute bottom-0 left-0 h-0.5 rounded-b-3xl"
          style={{ background: color.bg, opacity: 0.25 }}
          initial={{ width: 0 }}
          animate={{ width: `${progressPct * 100}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />

        {/* Priority badge */}
        <motion.div
          className="absolute top-3 right-4 flex items-center gap-1"
          initial={{ opacity: 0, x: 8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.06 + 0.2 }}
        >
          {autoPriority === 'red' && (
            <motion.div
              className="w-1.5 h-1.5 rounded-full mr-0.5"
              style={{ background: color.bg }}
              animate={{ opacity: [1, 0.2, 1] }}
              transition={{ duration: 0.9, repeat: Infinity }}
            />
          )}
          <span
            className="text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider"
            style={{ background: color.light, color: color.bg }}
          >
            {color.label}
          </span>
        </motion.div>

        {/* Header row */}
        <div className="flex items-center gap-3 mb-3 mt-1">
          <motion.div
            className="w-11 h-11 rounded-2xl flex items-center justify-center text-white font-bold text-sm shrink-0 relative overflow-hidden"
            style={{ background: color.bg, fontFamily: '-apple-system, SF Pro Display, sans-serif' }}
            whileHover={{ scale: 1.08, rotate: 3 }}
            transition={{ type: 'spring', stiffness: 400, damping: 15 }}
          >
            {getInitials(journey.patient_name)}
            <motion.div
              className="absolute inset-0"
              style={{ background: 'rgba(255,255,255,0.15)' }}
              initial={{ x: '-100%' }}
              whileHover={{ x: '100%' }}
              transition={{ duration: 0.4 }}
            />
          </motion.div>

          <div className="flex-1 min-w-0">
            <h3
              className="font-semibold text-sm text-gray-900 truncate"
              style={{ fontFamily: '-apple-system, SF Pro Display, sans-serif' }}
            >
              {journey.patient_name}
            </h3>
            {patient?.phone && (
              <a
                href={`tel:${patient.phone}`}
                className="flex items-center gap-1 text-[11px] mt-0.5 hover:underline"
                style={{ color: color.bg }}
              >
                <Phone className="w-3 h-3" />
                {patient.phone}
              </a>
            )}
            <p className="text-xs text-gray-400 mt-0.5">
              {currentStudy ? `En: ${currentStudy.study_name}` : 'Completado'}
              {currentStudy?.cubicle ? ` · ${currentStudy.cubicle}` : ''}
            </p>
          </div>

          <div className="flex flex-col items-end gap-1 shrink-0 mt-4">
            <p
              className="text-sm font-bold"
              style={{ color: color.bg, fontFamily: '-apple-system, SF Pro Display, sans-serif' }}
            >
              {completed}/{studies.length}
            </p>
            <p className="text-[10px] text-gray-400">estudios</p>
          </div>
        </div>

        {/* Penalty badge */}
        {(journey.penalty_count > 0 || journey.penalty_until) && (() => {
          const isPenalized = journey.penalty_until && new Date(journey.penalty_until) > new Date();
          const count = journey.penalty_count || 0;
          return (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-1.5 mb-2 px-3 py-1.5 rounded-xl"
              style={{ background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.2)' }}
            >
              <Clock className="w-3 h-3 text-red-500 shrink-0" />
              <span className="text-[11px] font-semibold text-red-600">
                {isPenalized
                  ? `Penalizado — esperando 15 min (ausencia ${count}/${3})`
                  : `${count} ausencia${count > 1 ? 's' : ''} registrada${count > 1 ? 's' : ''}`}
              </span>
            </motion.div>
          );
        })()}

        {/* Study step bubbles */}
        <div className="flex items-center gap-1.5 mb-2">
          {studies.map((s, si) => (
            <motion.button
              key={si}
              layout
              className="relative flex-1 h-7 rounded-xl flex items-center justify-center overflow-hidden"
              style={{
                background: s.status === 'completed'
                  ? color.bg
                  : s.status === 'in_progress'
                  ? color.light
                  : '#f5f5f7',
                border: s.status === 'in_progress' ? `1.5px solid ${color.bg}` : '1.5px solid transparent',
                cursor: 'default',
              }}
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.06 + si * 0.05, type: 'spring', stiffness: 320, damping: 18 }}
              title={s.study_name}
            >
              <AnimatePresence mode="wait">
                {s.status === 'completed' ? (
                  <motion.div
                    key="done"
                    initial={{ scale: 0, rotate: -90 }}
                    animate={{ scale: 1, rotate: 0 }}
                    exit={{ scale: 0 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 14 }}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                  </motion.div>
                ) : s.status === 'in_progress' ? (
                  <motion.div
                    key="active"
                    className="w-2 h-2 rounded-full"
                    style={{ background: color.bg }}
                    animate={{ scale: [1, 1.6, 1], opacity: [1, 0.6, 1] }}
                    transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
                  />
                ) : (
                  <motion.div
                    key="pending"
                    className="w-1.5 h-1.5 rounded-full bg-gray-300"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  />
                )}
              </AnimatePresence>
            </motion.button>
          ))}
        </div>

        <p className="text-[10px] text-gray-400 truncate">
          {studies.map(s => s.study_name).join(' → ')}
        </p>

        {/* Step-by-step checklist for current study */}
        {currentStudy && (() => {
          const steps = getSteps(currentStudy.study_name);
          const done = currentStudy.steps_done || 0;
          // Re-compute currentIdx here to avoid stale closure issues
          const liveCurrentIdx = localStudies.findIndex(s => s.status === 'in_progress');
          return (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-3 rounded-2xl p-3 space-y-2"
              style={{ background: color.light, border: `1px solid ${color.bg}22` }}
            >
              <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: color.bg }}>
                Pasos: {currentStudy.study_name}
              </p>
              {steps.map((step, si) => {
                const isDone = si < done;
                const isNext = si === done;
                return (
                  <motion.button
                    key={si}
                    onClick={() => { if (isNext && liveCurrentIdx !== -1) markStep(liveCurrentIdx, si); }}
                    className="w-full flex items-center gap-2.5 text-left rounded-xl px-2.5 py-2 transition-all"
                    style={{
                      background: isDone ? `${color.bg}18` : isNext ? 'white' : 'transparent',
                      border: isNext ? `1px solid ${color.bg}40` : '1px solid transparent',
                      cursor: isNext ? 'pointer' : 'default',
                      opacity: !isDone && !isNext ? 0.45 : 1,
                      pointerEvents: isDone || (!isNext) ? 'none' : 'auto',
                    }}
                    whileHover={isNext ? { scale: 1.01 } : {}}
                    whileTap={isNext ? { scale: 0.97 } : {}}
                  >
                    <motion.div
                      className="w-5 h-5 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: isDone ? color.bg : isNext ? `${color.bg}20` : 'rgba(0,0,0,0.06)' }}
                      animate={isDone ? { scale: [1, 1.25, 1] } : {}}
                      transition={{ duration: 0.3 }}
                    >
                      <AnimatePresence mode="wait">
                        {isDone ? (
                          <motion.div key="check" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                            <Check className="w-3 h-3 text-white" strokeWidth={3} />
                          </motion.div>
                        ) : (
                          <motion.div key="dot" className="w-1.5 h-1.5 rounded-full" style={{ background: isNext ? color.bg : '#ccc' }} />
                        )}
                      </AnimatePresence>
                    </motion.div>
                    <div className="relative flex-1 overflow-hidden">
                      <p className="text-xs leading-snug" style={{ color: isDone ? color.bg : isNext ? '#333' : '#aaa', opacity: isDone ? 0.6 : 1 }}>
                        {step.label}
                      </p>
                      <AnimatePresence>
                        {isDone && (
                          <motion.div
                            className="absolute top-1/2 left-0 h-px"
                            style={{ background: color.bg, top: '50%' }}
                            initial={{ width: 0 }}
                            animate={{ width: '100%' }}
                            transition={{ duration: 0.3, ease: 'easeOut' }}
                          />
                        )}
                      </AnimatePresence>
                    </div>
                    {isNext && (
                      <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full shrink-0" style={{ background: color.bg, color: 'white' }}>
                        Tachar
                      </span>
                    )}
                  </motion.button>
                );
              })}
            </motion.div>
          );
        })()}

        {/* Action buttons */}
        <div className="flex gap-2 mt-3">

          {/* Urgency button — only show if not already red */}
          {journey.priority_color !== 'red' && (
            <motion.button
              onClick={() => onMarkUrgent?.(journey.id)}
              className="py-2.5 px-3 rounded-2xl text-xs font-semibold flex items-center justify-center gap-1.5"
              style={{
                background: 'rgba(220,38,38,0.09)',
                color: '#dc2626',
                border: '1px solid rgba(220,38,38,0.22)',
              }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              title="Marcar como urgente — sube a prioridad máxima"
            >
              <Siren className="w-3.5 h-3.5" />
            </motion.button>
          )}

          <motion.button
            onClick={() => setNotesOpen(true)}
            className="py-2.5 px-3 rounded-2xl text-xs font-semibold flex items-center justify-center gap-1.5"
            style={{
              background: 'rgba(75,0,130,0.08)',
              color: '#7ED957',
              border: '1px solid rgba(75,0,130,0.18)',
              fontFamily: '-apple-system, SF Pro Text, sans-serif',
            }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            title="Añadir comentarios"
          >
            <MessageSquare className="w-3.5 h-3.5" />
          </motion.button>

          <motion.button
            onClick={() => setEmergencyOpen(true)}
            className="py-2.5 rounded-2xl text-xs font-semibold flex items-center justify-center gap-1.5 px-3"
            style={{
              background: 'rgba(211,47,47,0.08)',
              color: '#D32F2F',
              border: '1px solid rgba(211,47,47,0.18)',
              fontFamily: '-apple-system, SF Pro Text, sans-serif',
              flex: currentStudy ? '0 0 auto' : '1',
            }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            {!currentStudy && 'Código de Emergencia'}
          </motion.button>

          {/* Archive button */}
          {!confirmDelete ? (
            <motion.button
              onClick={() => setConfirmDelete(true)}
              className="py-2.5 px-3 rounded-2xl flex items-center justify-center"
              style={{ background: 'rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.08)' }}
              whileHover={{ scale: 1.05, background: 'rgba(0,0,0,0.08)' }}
              whileTap={{ scale: 0.95 }}
              title="Archivar trayecto"
            >
              <Trash2 className="w-3.5 h-3.5 text-gray-400" />
            </motion.button>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex gap-1"
            >
              <button
                onClick={archiveJourney}
                disabled={deleting}
                className="py-2 px-3 rounded-xl text-[11px] font-semibold text-white"
                style={{ background: '#D32F2F' }}
              >
                {deleting ? '...' : 'Sí, archivar'}
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="py-2 px-2 rounded-xl text-[11px] font-semibold text-gray-500"
                style={{ background: 'rgba(0,0,0,0.06)' }}
              >
                No
              </button>
            </motion.div>
          )}
        </div>
      </motion.div>

      <AnimatePresence>
        {justCompleted && (
          <CompletionOverlay
            studyName={journey.patient_name}
            studyIndex={0}
            onDone={() => setJustCompleted(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {emergencyOpen && (
          <EmergencyCodeModal
            patient={patient}
            journey={journey}
            onClose={() => setEmergencyOpen(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {notesOpen && (
          <DoctorNotesPanel
            journey={journey}
            onClose={() => setNotesOpen(false)}
            onUpdate={onUpdate}
          />
        )}
      </AnimatePresence>
    </>
  );
}

// ── Alerts Banner ────────────────────────────────────────────────────
function AlertsBanner({ alerts, onDismiss }) {
  if (alerts.length === 0) return null;
  return (
    <div className="space-y-1.5 mb-4">
      <AnimatePresence>
        {alerts.slice(0, 5).map(a => (
          <motion.div
            key={a.id}
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: 40, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 300, damping: 24 }}
            className="flex items-start justify-between gap-3 px-4 py-2.5 rounded-2xl text-xs font-medium"
            style={{
              background: a.msg.startsWith('🔴') || a.msg.startsWith('🚫')
                ? 'rgba(220,38,38,0.07)' : 'rgba(126,217,87,0.08)',
              border: a.msg.startsWith('🔴') || a.msg.startsWith('🚫')
                ? '1px solid rgba(220,38,38,0.18)' : '1px solid rgba(126,217,87,0.2)',
              color: a.msg.startsWith('🔴') || a.msg.startsWith('🚫') ? '#b91c1c' : '#15803d',
            }}
          >
            <span className="leading-snug flex-1">{a.msg}</span>
            <button onClick={() => onDismiss(a.id)} className="shrink-0 opacity-50 hover:opacity-100 transition-opacity mt-0.5">
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// ── Main export ─────────────────────────────────────────────────────
export default function PatientBubbleFlow({ journeys, onUpdate }) {
  const { handleStudyCompletion, markUrgent, alerts, dismissAlert } = useClinicManager();

  if (journeys.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-16 text-gray-400 text-sm"
      >
        No hay trayectos activos en este momento
      </motion.div>
    );
  }

  const sorted = sortByPriority(journeys);

  return (
    <>
      <AlertsBanner alerts={alerts} onDismiss={dismissAlert} />
      <AnimatePresence mode="popLayout">
        {sorted.map((journey, i) => (
          <PatientCard
            key={journey.id}
            journey={journey}
            index={i}
            onUpdate={onUpdate}
            onStudyComplete={handleStudyCompletion}
            onMarkUrgent={markUrgent}
          />
        ))}
      </AnimatePresence>
    </>
  );
}