import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { api } from '@/api/client';

export default function EditModuleModal({ module, onClose, onUpdate }) {
  const [currentCapacity, setCurrentCapacity] = useState(module.current_capacity || 0);
  const [maxCapacity, setMaxCapacity] = useState(module.max_capacity || 1);
  const [avgWait, setAvgWait] = useState(module.avg_wait_minutes || 0);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.entities.ClinicalModule.update(module.id, {
        current_capacity: parseInt(currentCapacity) || 0,
        max_capacity: parseInt(maxCapacity) || 1,
        avg_wait_minutes: parseInt(avgWait) || 0,
      });
      onUpdate?.();
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.92 }}
          onClick={e => e.stopPropagation()}
          className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 space-y-4"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-semibold text-lg text-gray-900">
                Editar: {module.area_name}
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">Actualiza ocupación y tiempos de espera</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>

          {/* Capacity section */}
          <div className="space-y-3 p-4 rounded-2xl bg-gray-50">
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-2">
                Ocupación actual
              </label>
              <input
                type="number"
                value={currentCapacity}
                onChange={e => setCurrentCapacity(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                min="0"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-2">
                Capacidad máxima
              </label>
              <input
                type="number"
                value={maxCapacity}
                onChange={e => setMaxCapacity(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                min="1"
              />
            </div>

            {/* Percentage display */}
            <div className="text-center pt-2 border-t border-gray-200">
              <p className="text-2xl font-bold text-gray-900">
                {Math.round((currentCapacity / maxCapacity) * 100)}%
              </p>
              <p className="text-xs text-gray-400 mt-1">Ocupación</p>
            </div>
          </div>

          {/* Wait time */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-600 block">
              Tiempo de espera promedio (minutos)
            </label>
            <input
              type="number"
              value={avgWait}
              onChange={e => setAvgWait(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
              min="0"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-4 border-t border-gray-200">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-lg border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 py-2.5 rounded-lg bg-purple-600 text-white text-sm font-semibold hover:bg-purple-700 transition-colors disabled:opacity-50"
            >
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}