import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { QrCode, UserPlus, CheckCircle2, Copy, Phone, AlertCircle } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import confetti from 'canvas-confetti';

const AVAILABLE_STUDIES = [
  { name: 'Análisis de Sangre', area: 'Laboratorio', minutes: 15, prep: 'Requiere ayuno de 8 horas' },
  { name: 'Radiografía de Tórax', area: 'Rayos X', minutes: 10, prep: '' },
  { name: 'Ultrasonido Abdominal', area: 'Ultrasonido', minutes: 20, prep: 'Vejiga llena recomendada' },
  { name: 'Electrocardiograma', area: 'Cardiología', minutes: 12, prep: 'Evitar cafeína 2 horas antes' },
  { name: 'Examen de Vista', area: 'Oftalmología', minutes: 15, prep: '' },
  { name: 'Vacunación', area: 'Vacunación', minutes: 8, prep: '' },
  { name: 'Otro', area: 'Otro', minutes: 10, prep: '' },
];

function isSameDay(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function RegisterPatient() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedStudies, setSelectedStudies] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  // Duplicate detection dialog
  const [dupDialog, setDupDialog] = useState(null); // { patient, journey, dateStr }

  useEffect(() => {
    if (result) {
      const end = Date.now() + 2000;
      const colors = ['#4B0082', '#7B00CC', '#008F4C', '#ffffff'];
      const frame = () => {
        confetti({ particleCount: 6, angle: 60, spread: 55, origin: { x: 0 }, colors });
        confetti({ particleCount: 6, angle: 120, spread: 55, origin: { x: 1 }, colors });
        if (Date.now() < end) requestAnimationFrame(frame);
      };
      frame();
    }
  }, [result]);

  const toggleStudy = (studyName) => {
    setSelectedStudies(prev =>
      prev.includes(studyName)
        ? prev.filter(s => s !== studyName)
        : [...prev, studyName]
    );
  };

  const createNewJourney = async (patientId, patientName) => {
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

    studies.sort((a, b) => a._wait - b._wait);
    studies.forEach(s => delete s._wait);
    if (studies.length > 0) studies[0].status = 'in_progress';
    const totalEta = studies.reduce((sum, s) => sum + s.estimated_minutes, 0);

    await base44.entities.ClinicalJourney.create({
      patient_id: patientId,
      patient_name: patientName,
      studies,
      total_eta_minutes: totalEta,
      status: 'active',
    });

    return totalEta;
  };

  const handleRegister = async () => {
    if (!name.trim() || !phone.trim() || selectedStudies.length === 0) {
      toast.error('Ingresa nombre, teléfono y selecciona al menos un estudio');
      return;
    }

    setIsSubmitting(true);

    // Check for existing patient with same name + phone
    const existingPatients = await base44.entities.Patient.filter({
      name: name.trim(),
      phone: phone.trim(),
    });

    if (existingPatients.length > 0) {
      const existing = existingPatients[0];

      // Find their most recent active journey
      const journeys = await base44.entities.ClinicalJourney.filter({ patient_id: existing.id });
      const activeJourney = journeys.find(j => j.status === 'active') || journeys[0];

      if (activeJourney) {
        const createdDate = activeJourney.created_date;

        if (isSameDay(createdDate)) {
          // Same day → redirect to existing journey directly
          setIsSubmitting(false);
          const url = `${window.location.origin}/patient/view?token=${existing.qr_token}`;
          setResult({ qrToken: existing.qr_token, patientName: existing.name, totalEta: activeJourney.total_eta_minutes, existing: true });
          return;
        } else {
          // Different day → ask patient
          setIsSubmitting(false);
          setDupDialog({
            patient: existing,
            journey: activeJourney,
            dateStr: formatDate(createdDate),
          });
          return;
        }
      }
    }

    // No duplicate → create fresh patient + journey
    const qrToken = crypto.randomUUID().replace(/-/g, '').slice(0, 16);
    const patient = await base44.entities.Patient.create({
      name: name.trim(),
      phone: phone.trim(),
      qr_token: qrToken,
      current_status: 'in_progress',
    });

    const totalEta = await createNewJourney(patient.id, name.trim());

    setResult({ qrToken, patientName: name.trim(), totalEta });
    setIsSubmitting(false);
    setName('');
    setPhone('');
    setSelectedStudies([]);
  };

  // User chose "view old journey"
  const handleViewOldJourney = () => {
    const { patient, journey } = dupDialog;
    setDupDialog(null);
    setResult({ qrToken: patient.qr_token, patientName: patient.name, totalEta: journey.total_eta_minutes, existing: true });
  };

  // User chose "create new journey for same patient"
  const handleCreateNewForExisting = async () => {
    const { patient } = dupDialog;
    setDupDialog(null);
    setIsSubmitting(true);

    const totalEta = await createNewJourney(patient.id, patient.name);
    setResult({ qrToken: patient.qr_token, patientName: patient.name, totalEta });
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
      </motion.div>

      {/* Duplicate dialog */}
      <AnimatePresence>
        {dupDialog && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-card border border-yellow-200 rounded-2xl p-6 space-y-4"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-yellow-50 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5 text-yellow-500" />
              </div>
              <div>
                <h3 className="font-semibold text-base">Paciente ya registrado</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Encontramos un registro de <strong>{dupDialog.patient.name}</strong> del <strong>{dupDialog.dateStr}</strong>.
                  ¿Es el mismo trayecto o deseas iniciar uno nuevo hoy?
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Button className="w-full rounded-xl h-11" onClick={handleViewOldJourney}>
                <QrCode className="w-4 h-4 mr-2" /> Ver trayecto del {dupDialog.dateStr}
              </Button>
              <Button variant="outline" className="w-full rounded-xl h-11" onClick={handleCreateNewForExisting}>
                <UserPlus className="w-4 h-4 mr-2" /> Crear nuevo trayecto para hoy
              </Button>
              <Button variant="ghost" className="w-full rounded-xl h-10 text-sm text-muted-foreground" onClick={() => setDupDialog(null)}>
                Cancelar
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {result ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', damping: 18, stiffness: 200 }}
          className="bg-card border rounded-2xl p-8 text-center"
        >
          {/* Header */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', damping: 12, stiffness: 300, delay: 0.1 }}
            className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-3"
          >
            <CheckCircle2 className="w-8 h-8 text-accent" />
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="font-heading text-xl font-bold mb-1"
          >
            {result.existing ? '¡Trayecto encontrado!' : '¡Registro exitoso!'}
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-sm text-muted-foreground mb-6"
          >
            {result.patientName} · ETA: {result.totalEta} min
          </motion.p>

          {/* QR Code */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="flex flex-col items-center mb-5"
          >
            <div className="p-4 bg-white rounded-2xl border shadow-sm inline-block mb-3">
              <QRCodeSVG value={patientUrl} size={180} level="H" />
            </div>
            <Button
              variant="outline"
              size="sm"
              className="text-xs rounded-xl"
              onClick={() => { navigator.clipboard.writeText(patientUrl); toast.success('Enlace copiado'); }}
            >
              <Copy className="w-3.5 h-3.5 mr-1.5" /> Copiar enlace del QR
            </Button>
          </motion.div>

          {/* Primary CTA */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45, type: 'spring', stiffness: 260, damping: 18 }}
            className="mb-4"
          >
            <motion.a
              href={patientUrl}
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="flex items-center justify-center gap-2 w-full h-14 rounded-2xl text-base font-semibold text-white"
              style={{ background: 'linear-gradient(135deg, #4B0082, #7B00CC)', boxShadow: '0 8px 24px rgba(75,0,130,0.35)' }}
            >
              <QrCode className="w-5 h-5" /> Ver mi trayecto
            </motion.a>
          </motion.div>

          {/* Secondary buttons */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.55 }}
            className="flex flex-col gap-2"
          >
            <Button variant="outline" className="w-full rounded-xl text-sm h-11" onClick={() => setResult(null)}>
              <UserPlus className="w-4 h-4 mr-2 shrink-0" /> Nuevo registro
            </Button>
            <Button variant="outline" className="w-full rounded-xl text-sm h-11" asChild>
              <a href="/mis-trayectos" target="_blank" rel="noopener noreferrer">
                <Phone className="w-4 h-4 mr-2 shrink-0" /> Mis trayectos
              </a>
            </Button>
          </motion.div>
        </motion.div>
      ) : !dupDialog && (
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