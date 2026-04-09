import React, { useState } from 'react';
import { api } from '@/api/client';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Phone, ChevronRight, CheckCircle2, Clock, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export default function MisTrayectos() {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [patients, setPatients] = useState(null);
  const [journeys, setJourneys] = useState([]);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSearch = async () => {
    const cleaned = phone.replace(/\s/g, '');
    if (!cleaned) return;
    setLoading(true);
    setError('');
    setPatients(null);
    setJourneys([]);

    const found = await api.entities.Patient.filter({ phone: cleaned });
    if (!found || found.length === 0) {
      setError('No encontramos registros con ese número de teléfono.');
      setLoading(false);
      return;
    }

    setPatients(found);

    const allJourneys = [];
    for (const p of found) {
      const pJourneys = await api.entities.ClinicalJourney.filter({ patient_id: p.id });
      pJourneys.forEach(j => allJourneys.push({ ...j, _patientPhone: p.phone }));
    }

    allJourneys.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    setJourneys(allJourneys);
    setLoading(false);
  };

  const statusConfig = {
    active: { label: 'En curso', color: '#4B0082', bg: 'rgba(75,0,130,0.08)' },
    completed: { label: 'Completado', color: '#008F4C', bg: 'rgba(0,143,76,0.08)' },
    cancelled: { label: 'Cancelado', color: '#8e8e93', bg: 'rgba(142,142,147,0.1)' },
  };

  return (
    <div
      className="min-h-screen bg-white px-5 pt-14 pb-16 max-w-md mx-auto"
      style={{ fontFamily: '-apple-system, SF Pro Display, BlinkMacSystemFont, Segoe UI, sans-serif' }}
    >
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-7 h-7 rounded-xl bg-[#4B0082] flex items-center justify-center">
            <Activity className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-[11px] font-semibold tracking-widest text-[#4B0082] uppercase">SD-NEXUS</span>
        </div>
        <h1 className="text-3xl font-light text-gray-900">Mis <span className="font-semibold">Trayectos</span></h1>
        <p className="text-gray-400 text-sm mt-1.5 font-light">Ingresa tu teléfono para ver tu historial</p>
      </motion.div>

      {/* Search box */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <div className="flex gap-2 mb-2">
          <div className="relative flex-1">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              value={phone}
              onChange={e => setPhone(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder="Ej. 55 1234 5678"
              className="pl-9 rounded-2xl border-gray-200 text-sm"
              type="tel"
            />
          </div>
          <Button
            onClick={handleSearch}
            disabled={loading || !phone.trim()}
            className="rounded-2xl px-5 shrink-0"
            style={{ background: '#4B0082' }}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Buscar'}
          </Button>
        </div>
        {error && (
          <p className="text-xs text-red-500 mt-2 px-1">{error}</p>
        )}
      </motion.div>

      {/* Results */}
      <AnimatePresence>
        {journeys.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-8 space-y-3"
          >
            <p className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase mb-4">
              {journeys.length} trayecto{journeys.length !== 1 ? 's' : ''} encontrado{journeys.length !== 1 ? 's' : ''}
            </p>

            {journeys.map((journey, i) => {
              const studies = journey.studies || [];
              const completed = studies.filter(s => s.status === 'completed').length;
              const cfg = statusConfig[journey.status] || statusConfig.active;
              const date = new Date(journey.created_date).toLocaleDateString('es-MX', {
                day: 'numeric', month: 'short', year: 'numeric'
              });

              return (
                <motion.button
                  key={journey.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                  onClick={() => navigate(`/patient/view?token=${patients.find(p => p.id === journey.patient_id)?.qr_token}`)}
                  className="w-full text-left rounded-3xl p-5 flex items-center gap-4"
                  style={{
                    background: 'white',
                    boxShadow: '0 2px 20px rgba(0,0,0,0.06)',
                    border: '1px solid rgba(0,0,0,0.05)',
                  }}
                >
                  <div
                    className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
                    style={{ background: cfg.bg }}
                  >
                    {journey.status === 'completed'
                      ? <CheckCircle2 className="w-5 h-5" style={{ color: cfg.color }} />
                      : <Clock className="w-5 h-5" style={{ color: cfg.color }} />
                    }
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-gray-900 truncate">{journey.patient_name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{date} · {completed}/{studies.length} estudios</p>
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <div className="w-1.5 h-1.5 rounded-full" style={{ background: cfg.color }} />
                      <span className="text-[11px] font-medium" style={{ color: cfg.color }}>{cfg.label}</span>
                    </div>
                  </div>

                  <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
                </motion.button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}