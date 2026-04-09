import React from 'react';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle2, ArrowRight, Clock, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/api/client';

export default function PatientJourneyCard({ journey, index, onUpdate }) {
  const studies = journey.studies || [];
  const completedCount = studies.filter(s => s.status === 'completed').length;
  const currentStudy = studies.find(s => s.status === 'in_progress');
  const progress = studies.length > 0 ? (completedCount / studies.length) * 100 : 0;

  const markStudyComplete = async (studyIndex) => {
    const updatedStudies = [...studies];
    updatedStudies[studyIndex].status = 'completed';
    updatedStudies[studyIndex].completed_at = new Date().toISOString();

    // Advance next pending to in_progress
    const nextPending = updatedStudies.findIndex(s => s.status === 'pending');
    if (nextPending !== -1) {
      updatedStudies[nextPending].status = 'in_progress';
    }

    const allDone = updatedStudies.every(s => s.status === 'completed');
    await api.entities.ClinicalJourney.update(journey.id, {
      studies: updatedStudies,
      status: allDone ? 'completed' : 'active'
    });

    if (allDone) {
      await api.entities.Patient.update(journey.patient_id, { current_status: 'completed' });
    }

    onUpdate?.();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      className="bg-card border rounded-2xl p-5 hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-heading font-semibold text-sm">{journey.patient_name}</h3>
            <p className="text-xs text-muted-foreground">ID: {journey.patient_id?.slice(-6)}</p>
          </div>
        </div>
        <Badge className={cn(
          'text-[10px]',
          journey.status === 'completed' ? 'bg-accent/10 text-accent border-accent/20' : 'bg-primary/10 text-primary border-primary/20'
        )}>
          {completedCount}/{studies.length} estudios
        </Badge>
      </div>

      {/* Progress */}
      <div className="w-full bg-muted rounded-full h-1.5 mb-3 overflow-hidden">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-primary to-accent"
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>

      {/* Study pills */}
      <div className="space-y-2">
        {studies.map((study, si) => (
          <div key={si} className={cn(
            'flex items-center justify-between rounded-xl px-3 py-2 text-xs',
            study.status === 'completed' && 'bg-accent/5',
            study.status === 'in_progress' && 'bg-primary/5 border border-primary/20',
            study.status === 'pending' && 'bg-muted/50'
          )}>
            <div className="flex items-center gap-2">
              {study.status === 'completed' ? (
                <CheckCircle2 className="w-4 h-4 text-accent" />
              ) : study.status === 'in_progress' ? (
                <div className="w-4 h-4 rounded-full border-2 border-primary animate-pulse" />
              ) : (
                <div className="w-4 h-4 rounded-full border-2 border-border" />
              )}
              <span className={cn(
                study.status === 'completed' && 'text-accent line-through',
                study.status === 'in_progress' && 'text-primary font-medium',
                study.status === 'pending' && 'text-muted-foreground'
              )}>
                {study.study_name}
              </span>
            </div>
            {study.status === 'in_progress' && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => markStudyComplete(si)}
                className="h-7 text-xs text-accent hover:text-accent hover:bg-accent/10 gap-1"
              >
                <CheckCircle2 className="w-3 h-3" /> Completar
              </Button>
            )}
          </div>
        ))}
      </div>

      {currentStudy && (
        <div className="mt-3 flex items-center gap-1 text-xs text-primary">
          <ArrowRight className="w-3 h-3" />
          <span>En curso: {currentStudy.study_name}</span>
          {currentStudy.cubicle && <span className="text-muted-foreground">· {currentStudy.cubicle}</span>}
        </div>
      )}
    </motion.div>
  );
}