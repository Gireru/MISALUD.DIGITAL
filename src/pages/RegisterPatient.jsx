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

function makeToken() {
  return Array.from({ length: 16 }, () => Math.floor(Math.random() * 36).toString(36)).join('');
}

// STEP: 'form' | 'loading' | 'duplicate' | 'success' | 'error'
export default function RegisterPatient() {
  const [step, setStep] = useState('form');
  const [errorMsg, setErrorMsg] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedStudies, setSelectedStudies] = useState([]);
  const [result, setResult] = useState(null);
  const [dupData, setDupData] = useState(null);

  useEffect(() => {
    if (step === 'success') {
      const end = Date.now() + 2000;
      const colors = ['#4B0082', '#7B00CC', '#008F4C', '#ffffff'];
      const frame = () => {
        confetti({ particleCount: 6, angle: 60, spread: 55, origin: { x: 0 }, colors });
        confetti({ particleCount: 6, angle: 120, spread: 55, origin: { x: 1 }, colors });
        if (Date.now() < end) requestAnimationFrame(frame);
      };
      frame();
    }
  }, [step]);

  const toggleStudy = (studyName) => {
    setSelectedStudies(prev =>
      prev.includes(studyName)
        ? prev.filter(s => s !== studyName)
        : [...prev, studyName]
    );
  };

  async function buildStudies(studies) {
    let modules = [];
    try {
      modules = await base44.entities.ClinicalModule.list();
    } catch (e) {
      modules = [];
    }
    const moduleMap = {};
    modules.forEach(m => { moduleMap[m.area_name] = m; });

    const built = studies.map(sName => {
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

    built.sort((a, b) => a._wait - b._wait);
    built.forEach(s => delete s._wait);
    if (built.length > 0) built[0].status = 'in_progress';
    return built;
  }

  async function createJourney(patientId, patientName, studies) {
    const built = await buildStudies(studies);
    const totalEta = built.reduce((sum, s) => sum + s.estimated_minutes, 0);
    await base44.entities.ClinicalJourney.create({
      patient_id: patientId,
      patient_name: patientName,
      studies: built,
      total_eta_minutes: totalEta,
      status: 'active',
    });
    return totalEta;
  }

  const handleRegister = async () => {
    if (!name.trim() || !phone.trim() || selectedStudies.length === 0) {
      toast.error('Ingresa nombre, teléfono y selecciona al menos un estudio');
      return;
    }

    setStep('loading');

    try {
      let existingPatients = [];
      try {
        existingPatients = await base44.entities.Patient.filter({ name: name.trim(), phone: phone.trim() });
      } catch (e) {
        existingPatients = [];
      }

      if (existingPatients.length > 0) {
        const existing = existingPatients[0];
        let journeys = [];
        try {
          journeys = await base44.entities.ClinicalJourney.filter({ patient_id: existing.id });
        } catch (e) {
          journeys = [];
        }
        const activeJourney = journeys.find(j => j.status === 'active') || journeys[0];

        if (activeJourney) {
          if (isSameDay(activeJourney.created_date)) {
            setResult({ qrToken: existing.qr_token, patientName: existing.name, totalEta: activeJourney.total_eta_minutes, existing: true });
            setStep('success');
            return;
          } else {
            setDupData({ patient: existing, journey: activeJourney, dateStr: formatDate(activeJourney.created_date) });
            setStep('duplicate');
            return;
          }
        }
      }

      // New patient
      const qrToken = makeToken();
      const patient = await base44.entities.Patient.create({
        name: name.trim(),
        phone: phone.trim(),
        qr_token: qrToken,
        current_status: 'in_progress',
      });
      const totalEta = await createJourney(patient.id, name.trim(), selectedStudies);
      setResult({ qrToken, patientName: name.trim(), totalEta });
      setName('');
      setPhone('');
      setSelectedStudies([]);
      setStep('success');
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || String(err) || 'Error desconocido';
      console.error('Register error:', msg, err);
      setErrorMsg(msg);
      setStep('error');
    }
  };

  const handleViewOldJourney = () => {
    const { patient, journey } = dupData;
    setResult({ qrToken: patient.qr_token, patientName: patient.name, totalEta: journey.total_eta_minutes, existing: true });
    setStep('success');
  };

  const handleCreateNewForExisting = async () => {
    const { patient } = dupData;
    setStep('loading');
    try {
      const totalEta = await createJourney(patient.id, patient.name, selectedStudies);
      setResult({ qrToken: patient.qr_token, patientName: patient.name, totalEta });
      setName('');
      setPhone('');
      setSelectedStudies([]);
      setStep('success');
    } catch (err) {
      console.error(err);
      toast.error('Error al crear trayecto. Intenta de nuevo.');
      setStep('form');
    }
  };

  const patientUrl = result ? `${window.location.origin}/patient/view?token=${result.qrToken}` : '';

  return (
    <div className="p-6 md:p-8 max-w-2xl mx-auto font-body space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="font-heading text-3xl font-bold">Registro de Paciente</h1>
      </motion.div>

      <AnimatePresence mode="wait">

        {/* LOADING */}
        {step === 'loading' && (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-10 h-10 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
            <p className="text-sm text-muted-foreground">Registrando paciente…</p>
          </motion.div>
        )}

        {/* ERROR */}
        {step === 'error' && (
          <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center space-y-4">
            <AlertCircle className="w-10 h-10 text-red-400 mx-auto" />
            <h3 className="font-semibold text-red-700">Error al registrar</h3>
            <p className="text-sm text-red-600 break-all font-mono">{errorMsg}</p>
            <Button variant="outline" className="rounded-xl" onClick={() => setStep('form')}>
              Volver al formulario
            </Button>
          </motion.div>
        )}

        {/* DUPLICATE DIALOG */}
        {step === 'duplicate' && dupData && (
          <motion.div key="duplicate"
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
            className="bg-card border border-yellow-200 rounded-2xl p-6 space-y-4"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-yellow-50 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5 text-yellow-500" />
              </div>
              <div>
                <h3 className="font-semibold text-base">Paciente ya registrado</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Encontramos un registro de <strong>{dupData.patient.name}</strong> del <strong>{dupData.dateStr}</strong>.
                  ¿Es el mismo trayecto o deseas iniciar uno nuevo hoy?
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Button className="w-full rounded-xl h-11" onClick={handleViewOldJourney}>
                <QrCode className="w-4 h-4 mr-2" /> Ver trayecto del {dupData.dateStr}
              </Button>
              <Button variant="outline" className="w-full rounded-xl h-11" onClick={handleCreateNewForExisting}>
                <UserPlus className="w-4 h-4 mr-2" /> Crear nuevo trayecto para hoy
              </Button>
              <Button variant="ghost" className="w-full rounded-xl h-10 text-sm text-muted-foreground" onClick={() => setStep('form')}>
                Cancelar
              </Button>
            </div>
          </motion.div>
        )}

        {/* SUCCESS */}
        {step === 'success' && result && (
          <motion.div key="success"
            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', damping: 18, stiffness: 200 }}
            className="bg-card border rounded-2xl p-8 text-center"
          >
            <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="w-8 h-8 text-accent" />
            </div>
            <h2 className="font-heading text-xl font-bold mb-1">
              {result.existing ? '¡Trayecto encontrado!' : '¡Registro exitoso!'}
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
              {result.patientName} · ETA: {result.totalEta} min
            </p>

            <div className="flex flex-col items-center mb-5">
              <div className="p-4 bg-white rounded-2xl border shadow-sm inline-block mb-3">
                <QRCodeSVG value={patientUrl} size={180} level="H" />
              </div>
              <Button
                variant="outline" size="sm" className="text-xs rounded-xl"
                onClick={() => { navigator.clipboard.writeText(patientUrl); toast.success('Enlace copiado'); }}
              >
                <Copy className="w-3.5 h-3.5 mr-1.5" /> Copiar enlace del QR
              </Button>
            </div>

            <div className="mb-4">
              <a
                href={patientUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full h-14 rounded-2xl text-base font-semibold text-white"
                style={{ background: 'linear-gradient(135deg, #4B0082, #7B00CC)', boxShadow: '0 8px 24px rgba(75,0,130,0.35)' }}
              >
                <QrCode className="w-5 h-5" /> Ver mi trayecto
              </a>
            </div>

            <div className="flex flex-col gap-2">
              <Button variant="outline" className="w-full rounded-xl text-sm h-11" onClick={() => { setResult(null); setStep('form'); }}>
                <UserPlus className="w-4 h-4 mr-2 shrink-0" /> Nuevo registro
              </Button>
              <Button variant="outline" className="w-full rounded-xl text-sm h-11" asChild>
                <a href="/mis-trayectos" target="_blank" rel="noopener noreferrer">
                  <Phone className="w-4 h-4 mr-2 shrink-0" /> Mis trayectos
                </a>
              </Button>
            </div>
          </motion.div>
        )}

        {/* FORM */}
        {step === 'form' && (
          <motion.div key="form"
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
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
                  type="tel"
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
                    <div
                      key={study.name}
                      role="button"
                      tabIndex={0}
                      onClick={() => toggleStudy(study.name)}
                      onKeyDown={e => e.key === 'Enter' && toggleStudy(study.name)}
                      className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-all cursor-pointer select-none ${
                        isSelected ? 'border-primary/30 bg-primary/5' : 'border-border hover:bg-muted/50'
                      }`}
                    >
                      <Checkbox checked={isSelected} className="pointer-events-none shrink-0" />
                      <div>
                        <p className="text-sm font-medium">{study.name}</p>
                        <p className="text-[11px] text-muted-foreground">{study.area} · ~{study.minutes} min</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <Button
              onClick={handleRegister}
              disabled={!name.trim() || !phone.trim() || selectedStudies.length === 0}
              className="w-full h-12 rounded-xl text-sm font-medium"
            >
              <QrCode className="w-4 h-4 mr-2" /> Registrar y generar trayecto
            </Button>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}