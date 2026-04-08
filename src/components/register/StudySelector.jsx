import React from 'react';
import { motion } from 'framer-motion';
import { Checkbox } from '@/components/ui/checkbox';
import { FlaskConical, Scan, Stethoscope, Heart, Syringe, Eye, Activity, Mic } from 'lucide-react';

export const ALL_STUDIES = [
  { name: 'Análisis de Sangre',    service: 'Laboratorio',              area: 'Laboratorio',   minutes: 15, prep: 'Requiere ayuno de 8 horas' },
  { name: 'Papanicolaou',          service: 'Papanicolaou',             area: 'Ginecología',   minutes: 15, prep: '' },
  { name: 'Ultrasonido Abdominal', service: 'Ultrasonido',              area: 'Ultrasonido',   minutes: 20, prep: 'Vejiga llena recomendada' },
  { name: 'Ultrasonido 4D',        service: 'Ultrasonido (incluye 4D)', area: 'Ultrasonido',   minutes: 25, prep: 'Vejiga llena recomendada' },
  { name: 'Radiografía de Tórax',  service: 'Rayos X',                  area: 'Rayos X',       minutes: 10, prep: '' },
  { name: 'Resonancia Magnética',  service: 'Resonancia Magnética',     area: 'Resonancia',    minutes: 40, prep: 'No portar objetos metálicos' },
  { name: 'Tomografía',            service: 'Tomografía',               area: 'Tomografía',    minutes: 30, prep: '' },
  { name: 'Electrocardiograma',    service: 'Electrocardiograma',       area: 'Cardiología',   minutes: 12, prep: 'Evitar cafeína 2 horas antes' },
  { name: 'Densitometría',         service: 'Densitometría',            area: 'Densitometría', minutes: 20, prep: '' },
  { name: 'Nutrición',             service: 'Nutrición',                area: 'Nutrición',     minutes: 30, prep: '' },
  { name: 'Mastografía',           service: 'Mastografía',              area: 'Mastografía',   minutes: 15, prep: 'No usar desodorante el día del estudio' },
  { name: 'Examen de Vista',       service: 'Lentes',                   area: 'Oftalmología',  minutes: 15, prep: '' },
];

const ICONS = {
  'Laboratorio': FlaskConical,
  'Ginecología': Heart,
  'Ultrasonido': Stethoscope,
  'Rayos X': Scan,
  'Resonancia': Scan,
  'Tomografía': Scan,
  'Cardiología': Activity,
  'Densitometría': Activity,
  'Nutrición': Heart,
  'Mastografía': Scan,
  'Oftalmología': Eye,
};

export default function StudySelector({ selected, onChange }) {
  const toggle = (name) => {
    onChange(
      selected.includes(name) ? selected.filter(s => s !== name) : [...selected, name]
    );
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="px-6 pt-14 pb-6" style={{ background: 'linear-gradient(160deg, #f0faf0 0%, #ffffff 100%)' }}>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #7ED957, #3dba1e)' }}>
            <FlaskConical className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900" style={{ fontFamily: '-apple-system, SF Pro Display, sans-serif' }}>
              ¿Qué estudios necesitas?
            </h1>
            <p className="text-xs text-gray-400">Selecciona uno o más estudios</p>
          </div>
        </div>

        <a
          href="/voice-register"
          className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-green-300 text-sm text-green-700 hover:bg-green-50 transition-colors"
        >
          <Mic className="w-4 h-4" /> O usa registro por voz
        </a>
      </div>

      <div className="px-6 pb-36 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {ALL_STUDIES.map((study, i) => {
          const sel = selected.includes(study.name);
          const Icon = ICONS[study.area] || FlaskConical;
          return (
            <motion.div
              key={study.name}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              role="button"
              tabIndex={0}
              onClick={() => toggle(study.name)}
              onKeyDown={e => e.key === 'Enter' && toggle(study.name)}
              className="flex items-center gap-3 rounded-2xl border p-4 cursor-pointer select-none transition-all"
              style={{
                borderColor: sel ? 'rgba(126,217,87,0.5)' : 'rgba(0,0,0,0.08)',
                background: sel ? 'rgba(126,217,87,0.05)' : 'white',
                boxShadow: sel ? '0 4px 16px rgba(126,217,87,0.15)' : '0 1px 4px rgba(0,0,0,0.04)',
              }}
            >
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: sel ? 'rgba(126,217,87,0.15)' : 'rgba(0,0,0,0.05)' }}
              >
                <Icon className="w-4 h-4" style={{ color: sel ? '#3dba1e' : '#aaa' }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900">{study.name}</p>
                <p className="text-[11px] text-gray-400">{study.area} · ~{study.minutes} min</p>
              </div>
              <Checkbox checked={sel} className="pointer-events-none shrink-0" />
            </motion.div>
          );
        })}
      </div>

      {/* CTA */}
      {selected.length > 0 && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="fixed bottom-0 left-0 right-0 p-6 pb-8"
          style={{ background: 'linear-gradient(to top, white 70%, transparent)' }}
        >
          <button
            onClick={() => onChange(selected, true)} // second arg signals "proceed"
            className="w-full h-14 rounded-2xl text-base font-bold text-white flex items-center justify-center gap-2"
            style={{ background: 'linear-gradient(135deg, #7ED957, #3dba1e)', boxShadow: '0 8px 30px rgba(126,217,87,0.45)' }}
          >
            Continuar con {selected.length} estudio{selected.length !== 1 ? 's' : ''}
            <span className="ml-1">›</span>
          </button>
        </motion.div>
      )}
    </div>
  );
}