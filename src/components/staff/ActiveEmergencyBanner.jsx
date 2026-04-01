import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { AlertTriangle, X, User, MapPin } from 'lucide-react';

const CODE_STYLES = {
  'Código Rojo':     { bg: '#D32F2F', light: 'rgba(211,47,47,0.10)',  emoji: '🔴' },
  'Código Azul':     { bg: '#1565C0', light: 'rgba(21,101,192,0.10)', emoji: '🔵' },
  'Código Naranja':  { bg: '#E65100', light: 'rgba(230,81,0,0.10)',   emoji: '🟠' },
  'Código Amarillo': { bg: '#F9A825', light: 'rgba(249,168,37,0.10)', emoji: '🟡' },
  'Código Verde':    { bg: '#2E7D32', light: 'rgba(46,125,50,0.10)',  emoji: '🟢' },
  'Código Morado':   { bg: '#6A1B9A', light: 'rgba(106,27,154,0.10)',emoji: '🟣' },
  'Código Rosa':     { bg: '#C2185B', light: 'rgba(194,24,91,0.10)',  emoji: '🩷' },
  'Código Blanco':   { bg: '#546E7A', light: 'rgba(84,110,122,0.10)', emoji: '⚪' },
  'Código Negro':    { bg: '#212121', light: 'rgba(33,33,33,0.12)',   emoji: '⚫' },
  'Código Gris':     { bg: '#757575', light: 'rgba(117,117,117,0.10)',emoji: '🩶' },
  'Código Café':     { bg: '#5D4037', light: 'rgba(93,64,55,0.10)',   emoji: '🟤' },
  'Código Plateado': { bg: '#78909C', light: 'rgba(120,144,156,0.10)',emoji: '🩵' },
};

function getStyle(codeName) {
  return CODE_STYLES[codeName] || { bg: '#D32F2F', light: 'rgba(211,47,47,0.10)', emoji: '🚨' };
}

function timeAgo(dateStr) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return `hace ${diff}s`;
  if (diff < 3600) return `hace ${Math.floor(diff / 60)}m`;
  return `hace ${Math.floor(diff / 3600)}h`;
}

export default function ActiveEmergencyBanner() {
  const [codes, setCodes] = useState([]);
  const [dismissed, setDismissed] = useState(new Set());

  const fetchCodes = async () => {
    const active = await base44.entities.EmergencyCode.filter({ status: 'active' }, '-created_date', 20);
    setCodes(active);
  };

  useEffect(() => {
    fetchCodes();
    const unsub = base44.entities.EmergencyCode.subscribe(() => fetchCodes());
    return unsub;
  }, []);

  const visible = codes.filter(c => !dismissed.has(c.id));

  if (visible.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <motion.div
          animate={{ scale: [1, 1.3, 1] }}
          transition={{ duration: 1.2, repeat: Infinity }}
        >
          <AlertTriangle className="w-4 h-4 text-red-500" />
        </motion.div>
        <span className="text-xs font-bold tracking-widest text-red-500 uppercase">
          Emergencias Activas
        </span>
        <span className="ml-auto text-[11px] font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-500">
          {visible.length}
        </span>
      </div>

      <AnimatePresence>
        {visible.map((code) => {
          const style = getStyle(code.code_name);
          return (
            <motion.div
              key={code.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20, scale: 0.95 }}
              transition={{ type: 'spring', damping: 20 }}
              className="relative rounded-2xl p-4 overflow-hidden"
              style={{
                background: style.light,
                border: `1.5px solid ${style.bg}30`,
                boxShadow: `0 2px 12px ${style.bg}20`,
              }}
            >
              {/* Left accent */}
              <div
                className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl"
                style={{ background: style.bg }}
              />

              <div className="pl-3">
                {/* Code name + dismiss */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{style.emoji}</span>
                    <span
                      className="text-sm font-bold"
                      style={{ color: style.bg, fontFamily: '-apple-system, SF Pro Display, sans-serif' }}
                    >
                      {code.code_name}
                    </span>
                    <motion.div
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ background: style.bg }}
                      animate={{ opacity: [1, 0.2, 1] }}
                      transition={{ duration: 1, repeat: Infinity }}
                    />
                  </div>
                  <button
                    onClick={() => setDismissed(prev => new Set([...prev, code.id]))}
                    className="w-5 h-5 rounded-full flex items-center justify-center opacity-40 hover:opacity-80 transition-opacity"
                    style={{ background: style.bg + '20' }}
                  >
                    <X className="w-3 h-3" style={{ color: style.bg }} />
                  </button>
                </div>

                {/* Patient info */}
                <div className="flex items-center gap-1.5 mb-1">
                  <User className="w-3 h-3 text-gray-500" />
                  <span className="text-xs font-semibold text-gray-800">{code.patient_name}</span>
                  {code.patient_phone && (
                    <a
                      href={`tel:${code.patient_phone}`}
                      className="text-[11px] text-gray-500 hover:underline ml-1"
                    >
                      {code.patient_phone}
                    </a>
                  )}
                </div>

                {/* Location + time */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    {code.location && (
                      <>
                        <MapPin className="w-3 h-3 text-gray-400" />
                        <span className="text-[11px] text-gray-500">{code.location}</span>
                      </>
                    )}
                    {code.description && (
                      <span className="text-[11px] text-gray-400 ml-1">· {code.description}</span>
                    )}
                  </div>
                  <span className="text-[10px] text-gray-400">{timeAgo(code.created_date)}</span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}