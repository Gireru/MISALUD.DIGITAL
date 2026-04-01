import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Phone, AlertTriangle, Trash2, MessageSquare } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import EmergencyCodeModal from './EmergencyCodeModal';
import DoctorNotesPanel from './DoctorNotesPanel';

// ── Priority color palette ──────────────────────────────────────────
const PRIORITY = {
  green:  { bg: '#16a34a', light: 'rgba(22,163,74,0.08)',  border: 'rgba(22,163,74,0.2)',  label: 'Inicio' },
  yellow: { bg: '#d97706', light: 'rgba(217,119,6,0.08)',  border: 'rgba(217,119,6,0.2)',  label: 'Avance' },
  red:    { bg: '#dc2626', light: 'rgba(220,38,38,0.08)',  border: 'rgba(220,38,38,0.2)',  label: 'Urgente' },
};

/**
 * Calculates priority color based on progress:
 *  - green  : 0–1 completed (just started)
 *  - yellow : 2–3 completed (mid journey)
 *  - red    : >= (total - 1) completed (almost done / critical)
 */
function getAutoPriority(studies) {
  const total = studies.length;
  const completed = studies.filter(s => s.status === 'completed').length;
  if (total === 0) return 'green';
  if (completed >= total - 1) return 'red';
  if (completed >= 2) return 'yellow';
  return 'green';
}

function getColor(journey) {
  const override = journey.priority_color;
  const key = (!override || override === 'auto')
    ? getAutoPriority(journey.studies || [])
    : override;
  return PRIORITY[key] || PRIORITY.green;
}

/** Sort: red first, yellow second, green last */
function sortByPriority(journeys) {
  const order = { red: 0, yellow: 1, green: 2 };
  return [...journeys].sort((a, b) => {
    const pa = getAutoPriority(a.studies || []);
    const pb = getAutoPriority(b.studies || []);
    const oa = a.priority_color && a.priority_color !== 'auto' ? order[a.priority_color] : order[pa];
    const ob = b.priority_color && b.priority_color !== 'auto' ? order[b.priority_color] : order[pb];
    return oa - ob;
  });
}

function getInitials(name) {
  return name?.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?';
}

// ── Color picker pill ───────────────────────────────────────────────
function ColorPicker({ current, onChange }) {
  const options = [
    { value: 'auto',   label: 'Auto', dot: null },
    { value: 'green',  label: '●', dot: '#16a34a' },
    { value: 'yellow', label: '●', dot: '#d97706' },
    { value: 'red',    label: '●', dot: '#dc2626' },
  ];
  return (
    <div className="flex items-center gap-1 mt-2">
      <span className="text-[10px] text-gray-400 mr-1">Prioridad:</span>
      {options.map(opt => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          title={opt.label}
          className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all"
          style={{
            background: opt.dot ? opt.dot : '#e5e7eb',
            color: opt.dot ? 'white' : '#6b7280',
            border: current === opt.value ? '2.5px solid #1e293b' : '2px solid transparent',
            fontSize: opt.dot ? 10 : 9,
            transform: current === opt.value ? 'scale(1.15)' : 'scale(1)',
          }}
        >
          {opt.dot ? '' : 'A'}
        </button>
      ))}
    </div>
  );
}

// ── Patient Card ────────────────────────────────────────────────────
function PatientCard({ journey, index, onUpdate }) {
  const [emergencyOpen, setEmergencyOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);

  const color = getColor(journey);
  const autoPriority = getAutoPriority(journey.studies || []);

  const archiveJourney = async () => {
    setDeleting(true);
    await base44.entities.ClinicalJourney.update(journey.id, { status: 'cancelled' });
    onUpdate?.();
  };

  const changePriorityColor = async (value) => {
    await base44.entities.ClinicalJourney.update(journey.id, { priority_color: value });
    onUpdate?.();
  };

  const { data: patient } = useQuery({
    queryKey: ['patient', journey.patient_id],
    queryFn: () => base44.entities.Patient.filter({ id: journey.patient_id }).then(r => r[0] || null),
    enabled: !!journey.patient_id,
    staleTime: 30000,
  });

  const markStudyComplete = async (studyIndex) => {
    const updatedStudies = [...(journey.studies || [])];
    updatedStudies[studyIndex].status = 'completed';
    updatedStudies[studyIndex].completed_at = new Date().toISOString();

    const nextPending = updatedStudies.findIndex(s => s.status === 'pending');
    if (nextPending !== -1) updatedStudies[nextPending].status = 'in_progress';

    const allDone = updatedStudies.every(s => s.status === 'completed');
    await base44.entities.ClinicalJourney.update(journey.id, {
      studies: updatedStudies,
      status: allDone ? 'completed' : 'active',
    });
    if (allDone) {
      await base44.entities.Patient.update(journey.patient_id, { current_status: 'completed' });
    }
    onUpdate?.();
  };

  const studies = journey.studies || [];
  const completed = studies.filter(s => s.status === 'completed').length;
  const currentStudy = studies.find(s => s.status === 'in_progress');
  const currentIdx = studies.findIndex(s => s.status === 'in_progress');

  // Determine if using manual override
  const isManual = journey.priority_color && journey.priority_color !== 'auto';
  const currentPick = journey.priority_color || 'auto';

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.07 }}
        className="relative rounded-3xl p-5 overflow-hidden"
        style={{
          background: 'white',
          boxShadow: `0 2px 20px ${color.bg}18`,
          border: `1px solid ${color.border}`,
        }}
      >
        {/* Top accent line */}
        <div
          className="absolute top-0 left-0 right-0 h-1 rounded-t-3xl"
          style={{ background: color.bg }}
        />

        {/* Priority badge */}
        <div className="absolute top-3 right-4 flex items-center gap-1">
          <span
            className="text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider"
            style={{ background: color.light, color: color.bg }}
          >
            {isManual ? '★ ' : ''}{color.label}
          </span>
        </div>

        {/* Header row */}
        <div className="flex items-center gap-3 mb-3 mt-1">
          <motion.div
            className="w-11 h-11 rounded-2xl flex items-center justify-center text-white font-bold text-sm shrink-0"
            style={{ background: color.bg, fontFamily: '-apple-system, SF Pro Display, sans-serif' }}
            whileHover={{ scale: 1.05 }}
          >
            {getInitials(journey.patient_name)}
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

        {/* Study step bubbles */}
        <div className="flex items-center gap-1.5 mb-2">
          {studies.map((s, si) => (
            <motion.button
              key={si}
              className="relative flex-1 h-7 rounded-xl flex items-center justify-center overflow-hidden"
              style={{
                background: s.status === 'completed'
                  ? color.bg
                  : s.status === 'in_progress'
                  ? color.light
                  : '#f5f5f7',
                border: s.status === 'in_progress' ? `1.5px solid ${color.bg}` : '1.5px solid transparent',
                cursor: s.status === 'in_progress' ? 'pointer' : 'default',
              }}
              onClick={() => s.status === 'in_progress' && markStudyComplete(si)}
              whileHover={s.status === 'in_progress' ? { scale: 1.04 } : {}}
              whileTap={s.status === 'in_progress' ? { scale: 0.96 } : {}}
              title={s.study_name}
            >
              {s.status === 'completed' ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-white" />
              ) : s.status === 'in_progress' ? (
                <motion.div
                  className="w-2 h-2 rounded-full"
                  style={{ background: color.bg }}
                  animate={{ scale: [1, 1.5, 1] }}
                  transition={{ duration: 1.4, repeat: Infinity }}
                />
              ) : (
                <div className="w-1.5 h-1.5 rounded-full bg-gray-300" />
              )}
            </motion.button>
          ))}
        </div>

        <p className="text-[10px] text-gray-400 truncate">
          {studies.map(s => s.study_name).join(' → ')}
        </p>

        {/* Color picker */}
        <ColorPicker current={currentPick} onChange={changePriorityColor} />

        {/* Action buttons */}
        <div className="flex gap-2 mt-3">
          {currentStudy && (
            <motion.button
              onClick={() => markStudyComplete(currentIdx)}
              className="flex-1 py-2.5 rounded-2xl text-xs font-semibold transition-all"
              style={{
                background: color.light,
                color: color.bg,
                border: `1px solid ${color.border}`,
                fontFamily: '-apple-system, SF Pro Text, sans-serif',
              }}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
            >
              ✓ Completar: {currentStudy.study_name}
            </motion.button>
          )}

          <motion.button
            onClick={() => setNotesOpen(true)}
            className="py-2.5 px-3 rounded-2xl text-xs font-semibold flex items-center justify-center gap-1.5"
            style={{
              background: 'rgba(75,0,130,0.08)',
              color: '#4B0082',
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

// ── Main export ─────────────────────────────────────────────────────
export default function PatientBubbleFlow({ journeys, onUpdate }) {
  if (journeys.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400 text-sm">
        No hay trayectos activos en este momento
      </div>
    );
  }

  const sorted = sortByPriority(journeys);

  return (
    <>
      {sorted.map((journey, i) => (
        <PatientCard key={journey.id} journey={journey} index={i} onUpdate={onUpdate} />
      ))}
    </>
  );
}