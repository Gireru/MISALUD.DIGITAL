import React, { useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Users, Clock, TrendingUp, CheckCircle2, Zap } from 'lucide-react';
import RadarFlowCard from '../components/staff/RadarFlowCard';
import PatientBubbleFlow from '../components/staff/PatientBubbleFlow';
import FloatingAlerts from '../components/staff/FloatingAlerts';

const SF = '-apple-system, SF Pro Display, BlinkMacSystemFont, Segoe UI, sans-serif';

export default function StaffDashboard() {
  const queryClient = useQueryClient();

  const { data: modules = [] } = useQuery({
    queryKey: ['clinical-modules'],
    queryFn: () => base44.entities.ClinicalModule.list(),
  });

  const { data: journeys = [] } = useQuery({
    queryKey: ['all-journeys'],
    queryFn: () => base44.entities.ClinicalJourney.filter({ status: 'active' }, '-created_date', 50),
  });

  const { data: allPatients = [] } = useQuery({
    queryKey: ['all-patients'],
    queryFn: () => base44.entities.Patient.list(),
  });

  useEffect(() => {
    const u1 = base44.entities.ClinicalJourney.subscribe(() => queryClient.invalidateQueries({ queryKey: ['all-journeys'] }));
    const u2 = base44.entities.ClinicalModule.subscribe(() => queryClient.invalidateQueries({ queryKey: ['clinical-modules'] }));
    return () => { u1(); u2(); };
  }, [queryClient]);

  const handleJourneyUpdate = () => queryClient.invalidateQueries({ queryKey: ['all-journeys'] });

  const activeCount = allPatients.filter(p => p.current_status === 'in_progress').length;
  const completedCount = allPatients.filter(p => p.current_status === 'completed').length;
  const avgWait = modules.length > 0
    ? Math.round(modules.reduce((sum, m) => sum + (m.avg_wait_minutes || 0), 0) / modules.length)
    : 0;
  const throughput = activeCount + completedCount;

  const stats = [
    { label: 'Activos', value: activeCount, icon: Users, from: '#4B0082', to: '#7B00CC' },
    { label: 'Completados', value: completedCount, icon: CheckCircle2, from: '#008F4C', to: '#00b85e' },
    { label: 'Espera prom.', value: `${avgWait}m`, icon: Clock, from: '#f5a623', to: '#ff9500' },
    { label: 'Throughput', value: throughput, icon: TrendingUp, from: '#007aff', to: '#00c7ff' },
  ];

  return (
    <div
      className="min-h-screen p-6 md:p-8 max-w-7xl mx-auto space-y-8"
      style={{ background: '#fafafa', fontFamily: SF }}
    >
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-2 mb-1">
          <motion.div
            className="w-2 h-2 rounded-full bg-[#008F4C]"
            animate={{ scale: [1, 1.5, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <span className="text-[11px] font-semibold tracking-widest text-[#008F4C] uppercase">En vivo</span>
        </div>
        <h1 className="text-3xl font-semibold text-gray-900">Mission Control</h1>
        <p className="text-sm text-gray-400 mt-1 font-light">Toma de decisiones en tiempo real</p>
      </motion.div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="rounded-3xl p-6 relative overflow-hidden"
              style={{ background: 'white', boxShadow: '0 2px 20px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.04)' }}
            >
              <div
                className="absolute top-0 right-0 w-20 h-20 rounded-full opacity-10 translate-x-6 -translate-y-6"
                style={{ background: `linear-gradient(135deg, ${stat.from}, ${stat.to})` }}
              />
              <div
                className="w-10 h-10 rounded-2xl flex items-center justify-center mb-4"
                style={{ background: `linear-gradient(135deg, ${stat.from}, ${stat.to})` }}
              >
                <Icon className="w-5 h-5 text-white" />
              </div>
              <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
              <p className="text-xs text-gray-400 mt-1">{stat.label}</p>
            </motion.div>
          );
        })}
      </div>

      {/* Radar + Copilot */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Radar Flow */}
        <div className="lg:col-span-2">
          <div className="flex items-center gap-2 mb-5">
            <h2 className="text-lg font-semibold text-gray-900">Radar de Flujo</h2>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#4B0082]/8 text-[#4B0082] font-semibold tracking-wider uppercase">
              Saturación
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {modules.map((mod, i) => (
              <RadarFlowCard key={mod.id} mod={mod} index={i} />
            ))}
          </div>
        </div>

        {/* Copilot */}
        <div>
          <div className="flex items-center gap-2 mb-5">
            <div
              className="w-7 h-7 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #4B0082, #7B00CC)' }}
            >
              <Zap className="w-3.5 h-3.5 text-white" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Copiloto IA</h2>
          </div>
          <FloatingAlerts modules={modules} />
        </div>
      </div>

      {/* Active journeys */}
      <div>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-gray-900">Trayectos Activos</h2>
          <span
            className="text-xs px-3 py-1 rounded-full font-semibold"
            style={{ background: 'rgba(75,0,130,0.08)', color: '#4B0082' }}
          >
            {journeys.length} pacientes
          </span>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          <PatientBubbleFlow journeys={journeys} onUpdate={handleJourneyUpdate} />
        </div>
      </div>
    </div>
  );
}