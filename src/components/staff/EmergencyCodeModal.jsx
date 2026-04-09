import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertTriangle, Loader2 } from 'lucide-react';
import { api } from '@/api/client';

const CODES = [
  { name: 'Código Plata',    color: '#9E9E9E', textColor: 'white', desc: 'Emergencia médica' },
  { name: 'Código Azul',     color: '#1565C0', textColor: 'white', desc: 'Paro cardiorrespiratorio' },
  { name: 'Código Morado',   color: '#6A1B9A', textColor: 'white', desc: 'Balacera o tiroteo' },
  { name: 'Código Rosa',     color: '#E91E8C', textColor: 'white', desc: 'Robo o extravío de persona' },
  { name: 'Código Magenta',  color: '#C2185B', textColor: 'white', desc: 'Persona violenta u hostil' },
  { name: 'Código Rojo',     color: '#D32F2F', textColor: 'white', desc: 'Conato de incendio' },
  { name: 'Código Naranja',  color: '#E65100', textColor: 'white', desc: 'Sustancia peligrosa' },
  { name: 'Código Amarillo', color: '#F9A825', textColor: '#333',  desc: 'Inundación' },
  { name: 'Código Verde',    color: '#2E7D32', textColor: 'white', desc: 'Evacuación' },
  { name: 'Código Negro',    color: '#212121', textColor: 'white', desc: 'Artefacto explosivo' },
  { name: 'Código Gris',     color: '#757575', textColor: 'white', desc: 'Asalto o vandalismo' },
  { name: 'Código Blanco',   color: '#E0E0E0', textColor: '#333',  desc: 'Abandono de persona' },
];

export default function EmergencyCodeModal({ patient, journey, onClose }) {
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState('');

  const handleTrigger = async () => {
    if (!selected) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.functions.invoke('triggerEmergencyCode', {
        codeName: selected.name,
        patientId: patient?.id || '',
        patientName: patient?.name || journey?.patient_name || '',
        patientPhone: patient?.phone || '',
        location: journey?.studies?.find(s => s.status === 'in_progress')?.area || '',
      });
      setSuccess(res.data);
    } catch (err) {
      setError(err?.response?.data?.error || 'Error al activar el código');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl"
        style={{ fontFamily: '-apple-system, SF Pro Display, sans-serif' }}
      >
        {/* Header */}
        <div className="relative px-6 pt-6 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-red-50 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900 text-base">Códigos de Emergencia</h2>
              <p className="text-xs text-gray-400">Paciente: <span className="font-semibold text-gray-700">{patient?.name || journey?.patient_name}</span></p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="absolute top-5 right-5 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {success ? (
          /* Success state */
          <div className="p-6 text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', damping: 12 }}
              className="w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-4"
              style={{ background: selected?.color + '20' }}
            >
              <AlertTriangle className="w-8 h-8" style={{ color: selected?.color }} />
            </motion.div>
            <h3 className="font-bold text-gray-900 text-lg mb-1">{success.code} activado</h3>
            <p className="text-sm text-gray-500 mb-2">{success.description}</p>
            <p className="text-xs text-gray-400 mb-6">{success.notified} administrador(es) notificado(s)</p>
            <button
              onClick={onClose}
              className="w-full py-3 rounded-2xl text-sm font-semibold bg-gray-900 text-white"
            >
              Cerrar
            </button>
          </div>
        ) : (
          /* Code selection */
          <div className="p-4">
            <p className="text-xs text-gray-500 mb-3 px-1">Selecciona el código correspondiente a la situación:</p>
            <div className="grid grid-cols-2 gap-2 max-h-72 overflow-y-auto mb-4 pr-1">
              {CODES.map((code) => (
                <button
                  key={code.name}
                  onClick={() => setSelected(code)}
                  className="relative flex flex-col items-start px-3 py-2.5 rounded-2xl text-left transition-all"
                  style={{
                    background: selected?.name === code.name ? code.color : code.color + '18',
                    border: `2px solid ${selected?.name === code.name ? code.color : 'transparent'}`,
                  }}
                >
                  <span
                    className="font-bold text-xs"
                    style={{ color: selected?.name === code.name ? code.textColor : code.color }}
                  >
                    {code.name}
                  </span>
                  <span
                    className="text-[10px] mt-0.5 leading-tight"
                    style={{ color: selected?.name === code.name ? code.textColor + 'cc' : '#888' }}
                  >
                    {code.desc}
                  </span>
                </button>
              ))}
            </div>

            {error && (
              <p className="text-xs text-red-500 mb-3 px-1">{error}</p>
            )}

            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="flex-1 py-3 rounded-2xl text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleTrigger}
                disabled={!selected || loading}
                className="flex-1 py-3 rounded-2xl text-sm font-bold text-white flex items-center justify-center gap-2 disabled:opacity-50 transition-all"
                style={{
                  background: selected
                    ? `linear-gradient(135deg, ${selected.color}, ${selected.color}cc)`
                    : '#ccc',
                }}
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>🚨 Activar</>
                )}
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}