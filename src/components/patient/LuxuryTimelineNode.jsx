import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FlaskConical, Scan, Stethoscope, Heart, Syringe, Eye, Check,
  Bell, Activity, FileText, Clock
} from 'lucide-react';

const areaIcons = {
  'Laboratorio': FlaskConical,
  'Rayos X': Scan,
  'Ultrasonido': Stethoscope,
  'Cardiología': Heart,
  'Vacunación': Syringe,
  'Oftalmología': Eye,
  'Ginecología': Heart,
  'Resonancia': Scan,
  'Tomografía': Scan,
  'Densitometría': Activity,
  'Nutrición': Heart,
  'Mastografía': Scan,
};

// Different color per study index so each card has its own identity
const STUDY_COLORS = [
  { main: '#7ED957', dark: '#3dba1e', shadow: 'rgba(126,217,87,0.45)',  light: 'rgba(126,217,87,0.10)' },
  { main: '#3B9EFF', dark: '#1a7de0', shadow: 'rgba(59,158,255,0.45)',  light: 'rgba(59,158,255,0.10)' },
  { main: '#FF6B6B', dark: '#e04444', shadow: 'rgba(255,107,107,0.45)', light: 'rgba(255,107,107,0.10)' },
  { main: '#FFB347', dark: '#d97d10', shadow: 'rgba(255,179,71,0.45)',  light: 'rgba(255,179,71,0.10)' },
  { main: '#A78BFA', dark: '#7c5cf5', shadow: 'rgba(167,139,250,0.45)', light: 'rgba(167,139,250,0.10)' },
];
function getColor(index) { return STUDY_COLORS[index % STUDY_COLORS.length]; }

// Steps per study type
function getSteps(studyName) {
  const l = studyName.toLowerCase();
  if (l.includes('tórax') || l.includes('torax') || l.includes('radiograf'))
    return [
      { icon: Bell,     label: 'Espera a que el médico llame tu nombre' },
      { icon: Activity, label: 'Radiografía en proceso' },
      { icon: FileText, label: 'Entrega de resultados por la tarde' },
    ];
  if (l.includes('sangre') || l.includes('laborator'))
    return [
      { icon: Bell,     label: 'Registra tu turno en ventanilla' },
      { icon: Activity, label: 'Toma de muestra en proceso' },
      { icon: FileText, label: 'Resultados listos en 24–48 h' },
    ];
  if (l.includes('ultrasonido') || l.includes('4d'))
    return [
      { icon: Bell,     label: 'Espera tu turno en sala de ultrasonido' },
      { icon: Activity, label: 'Estudio de ultrasonido en proceso' },
      { icon: FileText, label: 'El médico entrega reporte al finalizar' },
    ];
  if (l.includes('electrocardiograma'))
    return [
      { icon: Bell,     label: 'Espera que el técnico te indique' },
      { icon: Activity, label: 'Electrocardiograma en proceso' },
      { icon: FileText, label: 'Resultados inmediatos' },
    ];
  if (l.includes('resonancia'))
    return [
      { icon: Bell,     label: 'Retira objetos metálicos y espera' },
      { icon: Activity, label: 'Resonancia en proceso (~40 min)' },
      { icon: FileText, label: 'Resultados disponibles en 24 h' },
    ];
  if (l.includes('tomograf'))
    return [
      { icon: Bell,     label: 'Espera indicación del técnico' },
      { icon: Activity, label: 'Tomografía en proceso' },
      { icon: FileText, label: 'Resultados disponibles en 24 h' },
    ];
  if (l.includes('vista') || l.includes('lentes'))
    return [
      { icon: Bell,     label: 'Espera tu turno en optometría' },
      { icon: Activity, label: 'Examen de vista en proceso' },
      { icon: FileText, label: 'Receta lista al finalizar' },
    ];
  return [
    { icon: Bell,     label: 'Espera a que llamen tu nombre' },
    { icon: Activity, label: 'Estudio en proceso' },
    { icon: FileText, label: 'Resultados disponibles próximamente' },
  ];
}

// ── Hook: progressively tick steps, call onAllDone when finished ───
function useProgressiveSteps(isCompleted, stepCount, onAllDone) {
  const [checkedCount, setCheckedCount] = useState(0);
  const prevCompleted = useRef(false);

  useEffect(() => {
    // Reset when study goes back to not-completed (edge case)
    if (!isCompleted) {
      setCheckedCount(0);
      prevCompleted.current = false;
      return;
    }
    // Only start ticking if we just transitioned to completed
    if (prevCompleted.current) return;
    prevCompleted.current = true;

    let step = 0;
    const tick = () => {
      step += 1;
      setCheckedCount(step);
      if (step < stepCount) {
        setTimeout(tick, 600);
      } else {
        // All steps ticked — fire overlay after a short pause
        setTimeout(onAllDone, 400);
      }
    };
    setTimeout(tick, 300);
  }, [isCompleted, stepCount, onAllDone]);

  return checkedCount;
}

// ── Full-screen completion celebration ─────────────────────────────
export function CompletionOverlay({ studyName, studyIndex, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3000);
    return () => clearTimeout(t);
  }, [onDone]);

  const color = getColor(studyIndex);
  const isAnalysis = studyName.toLowerCase().includes('sangre') || studyName.toLowerCase().includes('laborator');
  const label = isAnalysis ? '¡Análisis completado!' : '¡Examen completado!';
  const emoji = isAnalysis ? '🧪' : '✅';

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center px-8"
      style={{ background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(16px)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <motion.div
        className="flex flex-col items-center gap-5 w-full max-w-xs relative"
        initial={{ scale: 0.4, opacity: 0, y: 40 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 1.1, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 220, damping: 16 }}
      >
        {/* Ripple rings */}
        {[1.0, 1.6, 2.2].map((s, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full pointer-events-none"
            style={{ width: 120, height: 120, border: `2px solid ${color.main}` }}
            initial={{ scale: 0.6, opacity: 0.6 }}
            animate={{ scale: s, opacity: 0 }}
            transition={{ duration: 1.5, delay: i * 0.3, repeat: Infinity, ease: 'easeOut' }}
          />
        ))}

        {/* Icon */}
        <motion.div
          className="w-32 h-32 rounded-full flex items-center justify-center relative overflow-hidden"
          style={{
            background: `linear-gradient(135deg, ${color.main}, ${color.dark})`,
            boxShadow: `0 24px 64px ${color.shadow}`,
          }}
          animate={{ scale: [1, 1.06, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <motion.div
            className="absolute inset-0"
            style={{ background: 'linear-gradient(120deg, transparent 30%, rgba(255,255,255,0.35) 50%, transparent 70%)' }}
            animate={{ x: ['-100%', '200%'] }}
            transition={{ duration: 1.6, repeat: Infinity, repeatDelay: 0.8 }}
          />
          <span className="text-6xl relative z-10 select-none">{emoji}</span>
        </motion.div>

        {/* Text */}
        <div className="text-center">
          <motion.p
            className="text-2xl font-extrabold text-gray-900 mb-1.5"
            style={{ fontFamily: '-apple-system, SF Pro Display, sans-serif' }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            {label}
          </motion.p>
          <motion.p
            className="text-base font-semibold mb-3"
            style={{ color: color.dark }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            {studyName}
          </motion.p>
          <motion.div
            className="inline-flex items-center gap-2 px-5 py-2 rounded-full text-sm font-semibold"
            style={{ background: color.light, color: color.dark }}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.55 }}
          >
            <Clock className="w-4 h-4" />
            A la espera de resultados…
          </motion.div>
        </div>

        {/* Bouncing dots */}
        <motion.div className="flex gap-2 mt-1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}>
          {[0, 0.15, 0.3].map((d, i) => (
            <motion.div
              key={i}
              className="w-2 h-2 rounded-full"
              style={{ background: color.main }}
              animate={{ y: [0, -8, 0], opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 0.7, delay: d, repeat: Infinity }}
            />
          ))}
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

// ── Timeline node ───────────────────────────────────────────────────
export default function LuxuryTimelineNode({ study, index, isLast, onStudyCompleted }) {
  const Icon = areaIcons[study.area] || FlaskConical;
  const isCompleted = study.status === 'completed';
  const isCurrent   = study.status === 'in_progress';
  const isPending   = study.status === 'pending';
  const color = getColor(index);
  const steps = getSteps(study.study_name);

  // Progressively tick steps when study completes, then fire onStudyCompleted
  const checkedCount = useProgressiveSteps(
    isCompleted,
    steps.length,
    onStudyCompleted || (() => {})
  );

  return (
    <motion.div
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="relative flex gap-5"
      style={{ paddingBottom: isLast ? 8 : 0 }}
    >
      {/* Connector line */}
      {!isLast && (
        <div
          className="absolute z-0"
          style={{
            left: 27, top: 58, bottom: 0, width: 2,
            background: isCompleted
              ? `linear-gradient(to bottom, ${color.dark}, rgba(0,0,0,0.06))`
              : 'rgba(0,0,0,0.06)',
            borderRadius: 4,
          }}
        />
      )}

      {/* Circle node */}
      <div className="relative z-10 flex-shrink-0" style={{ width: 56 }}>
        {isCompleted && (
          <motion.div
            key="done"
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 16 }}
            className="w-14 h-14 rounded-full flex items-center justify-center"
            style={{
              background: `linear-gradient(135deg, ${color.main}, ${color.dark})`,
              boxShadow: `0 4px 20px ${color.shadow}`,
            }}
          >
            <Check className="w-6 h-6 text-white" strokeWidth={2.5} />
          </motion.div>
        )}

        {isCurrent && (
          <>
            <motion.div
              className="absolute inset-0 rounded-full"
              animate={{ scale: [1, 1.4, 1], opacity: [0.4, 0, 0.4] }}
              transition={{ duration: 2.4, repeat: Infinity }}
              style={{ background: `radial-gradient(circle, ${color.shadow} 0%, transparent 70%)` }}
            />
            <motion.div
              className="absolute inset-0 rounded-full"
              animate={{ scale: [1, 1.7, 1], opacity: [0.2, 0, 0.2] }}
              transition={{ duration: 2.4, repeat: Infinity, delay: 0.4 }}
              style={{ background: `radial-gradient(circle, ${color.light} 0%, transparent 70%)` }}
            />
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center relative z-10"
              style={{
                background: `linear-gradient(135deg, ${color.main}, ${color.dark})`,
                boxShadow: `0 0 0 4px ${color.light}, 0 8px 32px ${color.shadow}`,
              }}
            >
              <Icon className="w-6 h-6 text-white" />
            </div>
          </>
        )}

        {isPending && (
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center"
            style={{ background: '#f5f5f7', border: '2px solid #e5e5ea' }}
          >
            <Icon className="w-5 h-5 text-gray-300" />
          </div>
        )}
      </div>

      {/* Content card */}
      <motion.div
        className="flex-1 rounded-2xl p-4 mb-5"
        style={{
          background: isCompleted ? color.light : isCurrent ? color.light : 'rgba(0,0,0,0.02)',
          border: `1px solid ${isCompleted || isCurrent ? color.main + '40' : 'rgba(0,0,0,0.06)'}`,
        }}
        animate={{
          boxShadow: isCurrent
            ? [`0 4px 16px ${color.shadow.replace('0.45', '0.1')}`, `0 8px 28px ${color.shadow.replace('0.45', '0.2')}`, `0 4px 16px ${color.shadow.replace('0.45', '0.1')}`]
            : '0 2px 8px rgba(0,0,0,0.04)',
        }}
        transition={{ duration: 2.5, repeat: isCurrent ? Infinity : 0 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <h3
            className="font-bold text-sm"
            style={{
              fontFamily: '-apple-system, SF Pro Display, sans-serif',
              color: isCompleted || isCurrent ? color.dark : '#8e8e93',
            }}
          >
            {study.study_name}
          </h3>
          {isCurrent && (
            <motion.span
              animate={{ opacity: [1, 0.5, 1] }}
              transition={{ duration: 1.6, repeat: Infinity }}
              className="text-[9px] font-bold tracking-widest uppercase px-2.5 py-1 rounded-full"
              style={{ background: color.light, color: color.dark }}
            >
              Ahora
            </motion.span>
          )}
          {isCompleted && (
            <span
              className="text-[9px] font-bold tracking-widest uppercase px-2.5 py-1 rounded-full flex items-center gap-1"
              style={{ background: color.light, color: color.dark }}
            >
              <Check className="w-2.5 h-2.5" strokeWidth={3} /> Listo
            </span>
          )}
          {isPending && (
            <span className="text-[9px] font-medium text-gray-300 uppercase tracking-wider">Pendiente</span>
          )}
        </div>

        {/* Area + time */}
        <div className="flex items-center gap-2 mb-3">
          <p className="text-[11px] text-gray-400">{study.area}</p>
          <span className="w-1 h-1 rounded-full bg-gray-200" />
          <p className="text-[11px] text-gray-400 flex items-center gap-1">
            <Clock className="w-2.5 h-2.5" /> ~{study.estimated_minutes} min
          </p>
        </div>

        {/* Cubicle */}
        {study.cubicle && isCurrent && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl mb-3"
            style={{ background: color.light, border: `1px solid ${color.main}40` }}
          >
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: color.dark }} />
            <span className="text-xs font-semibold" style={{ color: color.dark }}>Cubículo {study.cubicle}</span>
          </motion.div>
        )}

        {/* Prep note */}
        {study.preparation_note && !isCompleted && (
          <div
            className="text-xs px-3 py-2 rounded-xl mb-3"
            style={{ background: 'rgba(255,196,0,0.07)', border: '1px solid rgba(255,196,0,0.2)', color: '#8a6800' }}
          >
            💡 {study.preparation_note}
          </div>
        )}

        {/* Steps list — shown always when current/pending, and during tick-off when completing */}
        {(isCurrent || isPending || isCompleted) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="space-y-2 border-t pt-3 mt-1"
            style={{ borderColor: color.main + '25' }}
          >
            {steps.map((step, si) => {
              const StepIcon = step.icon;
              const isDone = isCompleted && si < checkedCount;
              return (
                <motion.div
                  key={si}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: si * 0.08 + 0.2 }}
                  className="flex items-start gap-2.5"
                >
                  {/* Icon / check */}
                  <motion.div
                    className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                    style={{ background: isDone ? color.light : isCurrent ? color.light : 'rgba(0,0,0,0.04)' }}
                    animate={isDone ? { scale: [1, 1.3, 1] } : {}}
                    transition={{ duration: 0.35 }}
                  >
                    <AnimatePresence mode="wait">
                      {isDone ? (
                        <motion.div
                          key="check"
                          initial={{ scale: 0, rotate: -90 }}
                          animate={{ scale: 1, rotate: 0 }}
                          exit={{ scale: 0 }}
                          transition={{ type: 'spring', stiffness: 400, damping: 14 }}
                        >
                          <Check className="w-3 h-3" style={{ color: color.dark }} strokeWidth={3} />
                        </motion.div>
                      ) : (
                        <motion.div key="icon" initial={{ scale: 1 }} animate={{ scale: 1 }}>
                          <StepIcon className="w-3 h-3" style={{ color: isCurrent ? color.dark : '#bbb' }} />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>

                  {/* Label with strikethrough animation */}
                  <div className="relative pt-1 overflow-hidden">
                    <p className="text-xs leading-snug" style={{ color: isDone ? color.dark : isCurrent ? '#444' : '#bbb', opacity: isDone ? 0.6 : 1 }}>
                      {step.label}
                    </p>
                    {/* Strikethrough line sweeping left to right */}
                    <AnimatePresence>
                      {isDone && (
                        <motion.div
                          className="absolute top-1/2 left-0 h-px"
                          style={{ background: color.dark, top: '50%' }}
                          initial={{ width: 0 }}
                          animate={{ width: '100%' }}
                          exit={{ width: '100%' }}
                          transition={{ duration: 0.35, ease: 'easeOut' }}
                        />
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
}