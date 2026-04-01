import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { QrCode, UserPlus, CheckCircle2, Copy, Phone } from 'lucide-react';

const AVAILABLE_STUDIES = [
  { name: 'Análisis de Sangre', area: 'Laboratorio', minutes: 15, prep: 'Requiere ayuno de 8 horas' },
  { name: 'Radiografía de Tórax', area: 'Rayos X', minutes: 10, prep: '' },
  { name: 'Ultrasonido Abdominal', area: 'Ultrasonido', minutes: 20, prep: 'Vejiga llena recomendada' },
  { name: 'Electrocardiograma', area: 'Cardiología', minutes: 12, prep: 'Evitar cafeína 2 horas antes' },
  { name: 'Examen de Vista', area: 'Oftalmología', minutes: 15, prep: '' },
  { name: 'Vacunación', area: 'Vacunación', minutes: 8, prep: '' },
  { name: 'Otro', area: 'Otro', minutes: 10, prep: '' },
];

export default function RegisterPatient() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedStudies, setSelectedStudies] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  const toggleStudy = (studyName) => {
    setSelectedStudies(prev =>
      prev.includes(studyName)
        ? prev.filter(s => s !== studyName)
        : [...prev, studyName]
    );
  };

  const handleRegister = async () => {
    if (!name.trim() || !phone.trim() || selectedStudies.length === 0) {
      toast.error('Ingresa nombre, teléfono y selecciona al menos un estudio');
      return;
    }

    setIsSubmitting(true);

    const qrToken = crypto.randomUUID().replace(/-/g, '').slice(0, 16);

    const patient = await base44.entities.Patient.create({
      name: name.trim(),
      phone,
      qr_token: qrToken,
      current_status: 'in_progress',
    });

    // Build studies with stochastic routing (sort by least wait)
    const modules = await base44.entities.ClinicalModule.list();
    const moduleMap = {};
    modules.forEach(m => { moduleMap[m.area_name] = m; });

    const studies = selectedStudies.map(sName => {
      const study = AVAILABLE_STUDIES.find(s => s.name === sName);
      const mod = moduleMap[study.area];
      return {
        study_name: study.name,
        area: study.area,
        status: 'pending',
        estimated_minutes: study.minutes + (mod?.avg_wait_minutes || 0),
        cubicle: '',
        preparation_note: study.prep,
        _wait: mod?.avg_wait_minutes || 0,
      };
    });

    // Sort by wait time (stochastic routing: lowest wait first)
    studies.sort((a, b) => a._wait - b._wait);
    studies.forEach(s => delete s._wait);

    // First study is in_progress
    if (studies.length > 0) studies[0].status = 'in_progress';

    const totalEta = studies.reduce((sum, s) => sum + s.estimated_minutes, 0);

    await base44.entities.ClinicalJourney.create({
      patient_id: patient.id,
      patient_name: name.trim(),
      studies,
      total_eta_minutes: totalEta,
      status: 'active',
    });

    setResult({ qrToken, patientName: name.trim(), totalEta });
    setIsSubmitting(false);
    setName('');
    setPhone('');
    setSelectedStudies([]);
  };

  const patientUrl = result ? `${window.location.origin}/patient/view?token=${result.qrToken}` : '';

  return (
    <div className="p-6 md:p-8 max-w-2xl mx-auto font-body space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="font-heading text-3xl font-bold">Registro de Paciente</h1>
        <p className="text-muted-foreground text-sm mt-1">Genera un trayecto clínico optimizado</p>
      </motion.div>

      {result ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-card border rounded-2xl p-8 text-center"
        >
          <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-accent" />
          </div>
          <h2 className="font-heading text-xl font-bold mb-1">¡Registro exitoso!</h2>
          <p className="text-sm text-muted-foreground mb-6">
            {result.patientName} · ETA: {result.totalEta} min
          </p>

          <div className="bg-muted rounded-xl p-4 mb-4">
            <p className="text-xs text-muted-foreground mb-2">Enlace del paciente (simula QR)</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs bg-background rounded-lg px-3 py-2 text-left truncate">
                {patientUrl}
              </code>
              <Button
                size="icon"
                variant="outline"
                onClick={() => { navigator.clipboard.writeText(patientUrl); toast.success('Enlace copiado'); }}
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <Button className="flex-1" onClick={() => setResult(null)}>
                <UserPlus className="w-4 h-4 mr-2" /> Nuevo registro
              </Button>
              <Button variant="outline" className="flex-1" asChild>
                <a href={patientUrl} target="_blank" rel="noopener noreferrer">
                  <QrCode className="w-4 h-4 mr-2" /> Ver trayecto
                </a>
              </Button>
            </div>
            <Button variant="ghost" className="w-full text-xs text-muted-foreground" asChild>
              <a href="/mis-trayectos" target="_blank" rel="noopener noreferrer">
                <Phone className="w-3.5 h-3.5 mr-2" /> Ver todos mis trayectos con mi teléfono
              </a>
            </Button>
          </div>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card border rounded-2xl p-6 space-y-5"
        >
          <div className="space-y-3">
            <div>
              <Label className="text-xs font-medium">Nombre completo</Label>
              <Input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Ej. María García López"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs font-medium">Teléfono <span className="text-red-500">*</span></Label>
              <Input
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="Ej. 55 1234 5678"
                className="mt-1"
                required
              />
              <p className="text-[11px] text-muted-foreground mt-1.5">📲 Por este número podrás consultar tus resultados de estudios.</p>
            </div>
          </div>

          <div>
            <Label className="text-xs font-medium mb-3 block">Estudios requeridos</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {AVAILABLE_STUDIES.map(study => {
                const isSelected = selectedStudies.includes(study.name);
                return (
                  <button
                    key={study.name}
                    onClick={() => toggleStudy(study.name)}
                    className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-all ${
                      isSelected ? 'border-primary/30 bg-primary/5' : 'border-border hover:bg-muted/50'
                    }`}
                  >
                    <Checkbox checked={isSelected} className="pointer-events-none" />
                    <div>
                      <p className="text-sm font-medium">{study.name}</p>
                      <p className="text-[11px] text-muted-foreground">{study.area} · ~{study.minutes} min</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <Button
            onClick={handleRegister}
            disabled={isSubmitting || !name.trim() || !phone.trim() || selectedStudies.length === 0}
            className="w-full h-12 rounded-xl text-sm font-medium"
          >
            {isSubmitting ? (
              <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <QrCode className="w-4 h-4 mr-2" /> Registrar y generar trayecto
              </>
            )}
          </Button>
        </motion.div>
      )}
    </div>
  );
}