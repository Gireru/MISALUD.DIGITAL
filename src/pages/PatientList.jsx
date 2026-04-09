import React from 'react';
import { api } from '@/api/client';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { User, QrCode, CheckCircle2, Clock, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';

const statusConfig = {
  registered: { label: 'Registrado', color: 'bg-muted text-muted-foreground' },
  in_progress: { label: 'En curso', color: 'bg-primary/10 text-primary' },
  completed: { label: 'Completado', color: 'bg-accent/10 text-accent' },
};

export default function PatientList() {
  const { data: patients = [], isLoading } = useQuery({
    queryKey: ['all-patients-list'],
    queryFn: () => api.entities.Patient.list('-created_date', 100),
  });

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto font-body space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="font-heading text-3xl font-bold">Pacientes</h1>
        <p className="text-muted-foreground text-sm mt-1">Directorio de pacientes registrados</p>
      </motion.div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-3">
          {patients.map((patient, i) => {
            const status = statusConfig[patient.current_status] || statusConfig.registered;
            return (
              <motion.div
                key={patient.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="bg-card border rounded-2xl p-4 flex items-center justify-between hover:shadow-sm transition-shadow"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-heading font-semibold text-sm">{patient.name}</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-muted-foreground">Token: {patient.qr_token?.slice(0, 8)}...</span>
                      <Badge variant="secondary" className={cn('text-[10px]', status.color)}>
                        {status.label}
                      </Badge>
                    </div>
                  </div>
                </div>
                <Link
                  to={`/patient/view?token=${patient.qr_token}`}
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                >
                  <QrCode className="w-3 h-3" /> Ver trayecto
                </Link>
              </motion.div>
            );
          })}
          {patients.length === 0 && (
            <div className="text-center py-12 text-muted-foreground text-sm">
              No hay pacientes registrados
            </div>
          )}
        </div>
      )}
    </div>
  );
}