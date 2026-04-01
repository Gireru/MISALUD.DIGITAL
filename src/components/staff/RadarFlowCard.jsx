import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FlaskConical, Scan, Stethoscope, Heart, Syringe, Eye, Edit2 } from 'lucide-react';
import EditModuleModal from './EditModuleModal';

const areaIcons = {
  'Laboratorio': FlaskConical,
  'Rayos X': Scan,
  'Ultrasonido': Stethoscope,
  'Cardiología': Heart,
  'Vacunación': Syringe,
  'Oftalmología': Eye,
};

const saturationConfig = {
  low: { color: '#008F4C', label: 'Disponible', trackColor: 'rgba(0,143,76,0.12)' },
  medium: { color: '#f5a623', label: 'Moderado', trackColor: 'rgba(245,166,35,0.12)' },
  high: { color: '#ff6b35', label: 'Alto', trackColor: 'rgba(255,107,53,0.12)' },
  critical: { color: '#ff2d55', label: 'Crítico', trackColor: 'rgba(255,45,85,0.12)' },
};

const RADIUS = 34;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function RadarFlowCard({ mod, index, onUpdate }) {
  const [editOpen, setEditOpen] = useState(false);
  const Icon = areaIcons[mod.area_name] || FlaskConical;
  const config = saturationConfig[mod.saturation_level] || saturationConfig.low;
  const percent = mod.max_capacity > 0 ? mod.current_capacity / mod.max_capacity : 0;
  const strokeDash = CIRCUMFERENCE * percent;

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.07, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="relative flex flex-col items-center p-6 rounded-3xl cursor-pointer hover:shadow-lg transition-shadow group"
        style={{
          background: 'white',
          boxShadow: '0 2px 20px rgba(0,0,0,0.06)',
          border: '1px solid rgba(0,0,0,0.05)',
        }}
        onClick={() => setEditOpen(true)}
      >
      {/* Ring */}
      <div className="relative w-20 h-20 mb-4">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80">
          {/* Track */}
          <circle
            cx="40" cy="40" r={RADIUS}
            fill="none"
            stroke={config.trackColor}
            strokeWidth="6"
          />
          {/* Progress */}
          <motion.circle
            cx="40" cy="40" r={RADIUS}
            fill="none"
            stroke={`url(#grad-${mod.id || index})`}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            initial={{ strokeDashoffset: CIRCUMFERENCE }}
            animate={{ strokeDashoffset: CIRCUMFERENCE - strokeDash }}
            transition={{ duration: 1.2, delay: index * 0.07 + 0.3, ease: 'easeOut' }}
          />
          <defs>
            <linearGradient id={`grad-${mod.id || index}`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#4B0082" />
              <stop offset="100%" stopColor={config.color} />
            </linearGradient>
          </defs>
        </svg>

        {/* Center icon */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: config.trackColor }}
          >
            <Icon className="w-4 h-4" style={{ color: config.color }} />
          </div>
        </div>

        {/* Critical pulse */}
        {mod.saturation_level === 'critical' && (
          <motion.div
            className="absolute inset-0 rounded-full"
            animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            style={{ background: 'radial-gradient(circle, rgba(255,45,85,0.2) 0%, transparent 70%)' }}
          />
        )}
      </div>

      <h3
        className="font-semibold text-sm text-center mb-1 text-gray-800"
        style={{ fontFamily: '-apple-system, SF Pro Display, sans-serif' }}
      >
        {mod.area_name}
      </h3>

      <div className="flex items-center gap-1.5 mb-3">
        <motion.div
          className="w-1.5 h-1.5 rounded-full"
          style={{ background: config.color }}
          animate={{ scale: [1, 1.4, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
        <span className="text-[11px] font-medium" style={{ color: config.color }}>
          {config.label}
        </span>
      </div>

      <div className="flex items-center justify-between w-full">
        <div className="text-center">
          <p className="text-xl font-bold text-gray-900" style={{ fontFamily: '-apple-system, SF Pro Display, sans-serif' }}>
            {Math.round(percent * 100)}%
          </p>
          <p className="text-[10px] text-gray-400 mt-0.5">Ocupación</p>
        </div>
        <div className="text-center">
          <p className="text-xl font-bold text-gray-900" style={{ fontFamily: '-apple-system, SF Pro Display, sans-serif' }}>
            {mod.avg_wait_minutes || 0}
            <span className="text-sm font-normal text-gray-400 ml-0.5">m</span>
          </p>
          <p className="text-[10px] text-gray-400 mt-0.5">Espera</p>
        </div>
      </div>

      {/* Edit button hint */}
      <motion.div
        initial={{ opacity: 0 }}
        whileHover={{ opacity: 1 }}
        className="absolute top-3 right-3 p-1.5 rounded-lg bg-gray-900/5 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <Edit2 className="w-3.5 h-3.5 text-gray-600" />
      </motion.div>
      </motion.div>

      {/* Edit modal */}
      {editOpen && (
        <EditModuleModal
          module={mod}
          onClose={() => setEditOpen(false)}
          onUpdate={onUpdate}
        />
      )}
    </>
  );
}