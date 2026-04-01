import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { QrCode, UserPlus, CheckCircle2, Copy, Phone } from 'lucide-react';
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

function makeToken() {
  return Array.from({ length: 16 }, () => Math.floor(Math.random() * 36).toString(36)).join('');
}

export default function RegisterPatient() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedStudies, setSelectedStudies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null); // { qrToken, patientName, totalEta, patientUrl }

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

  const handleRegister = async () => {
    if (!name.trim() || !phone.trim() || selectedStudies.length === 0) {
      toast.error('Ingresa nombre, teléfono y selecciona al menos un estudio');
      return;
    }

    setLoading(true);

    const qrToken = makeToken();
    const patientUrl = `${window.location.origin}/patient/view?token=${qrToken}`;

    // 1. Create patient
    const patient = await base44.entities.Patient.create({
      name: name.trim(),
      phone: phone.trim(),
      qr_token: qrToken,
      current_status: 'in_progress',
    });

    // 2. Build studies
    let modules = [];
    try { modules = await base44.entities.ClinicalModule.list(); } catch (e) { modules = []; }
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

    // 3. Create journey
    await base44.entities.ClinicalJourney.create({
      patient_id: patient.id,
      patient_name: name.trim(),
      studies,
      total_eta_minutes: totalEta,
      status: 'active',
    });

    setResult({ qrToken, patientName: name.trim(), totalEta, patientUrl });
    setName('');
    setPhone('');
    setSelectedStudies([]);
    setLoading(false);
  };

  // ── SUCCESS SCREEN ──
  if (result) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', damping: 18, stiffness: 200 }}
          className="w-full max-w-sm text-center"
        >
          {/* Icon */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', damping: 12, stiffness: 300, delay: 0.1 }}
            className="w-20 h-20 rounded-3xl bg-accent/10 flex items-center justify-center mx-auto mb-5"
          >
            <CheckCircle2 className="w-10 h-10 text-accent" />
          </motion.div>

          <h2 className="font-heading text-2xl font-bold mb-1">¡Registro exitoso!</h2>
          <p className="text-muted-foreground text-sm mb-8">
            {result.patientName} · ETA: {result.totalEta} min
          </p>

          {/* QR */}
          <div className="flex flex-col items-center mb-6">
            <div className="p-5 bg-white rounded-3xl border shadow-sm inline-block mb-4">
              <QRCodeSVG value={result.patientUrl} size={200} level="H" />
            </div>
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl text-xs gap-1.5"
              onClick={() => { navigator.clipboard.writeText(result.patientUrl); toast.success('Enlace copiado'); }}
            >
              <Copy className="w-3.5 h-3.5" /> Copiar enlace del QR
            </Button>
          </div>

          {/* CTA */}
          <a
            href={result.patientUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full h-14 rounded-2xl text-base font-semibold text-white mb-3"
            style={{ background: 'linear-gradient(135deg, #4B0082, #7B00CC)', boxShadow: '0 8px 24px rgba(75,0,130,0.35)' }}
          >
            <QrCode className="w-5 h-5" /> Ver mi trayecto
          </a>

          <div className="flex flex-col gap-2">
            <Button variant="outline" className="w-full rounded-xl h-11 text-sm" onClick={() => setResult(null)}>
              <UserPlus className="w-4 h-4 mr-2" /> Nuevo registro
            </Button>
            <Button variant="outline" className="w-full rounded-xl h-11 text-sm" asChild>
              <a href="/mis-trayectos" target="_blank" rel="noopener noreferrer">
                <Phone className="w-4 h-4 mr-2" /> Mis trayectos
              </a>
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  // ── FORM SCREEN ──
  return (
    <div className="p-6 md:p-8 max-w-2xl mx-auto font-body space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="font-heading text-3xl font-bold">Registro de Paciente</h1>
      </motion.div>

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
              type="tel"
            />
            <p className="text-[11px] text-muted-foreground mt-1.5">📲 Por este número podrás consultar tus resultados.</p>
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
          disabled={loading || !name.trim() || !phone.trim() || selectedStudies.length === 0}
          className="w-full h-12 rounded-xl text-sm font-medium"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
          ) : (
            <><QrCode className="w-4 h-4 mr-2" /> Registrar y generar trayecto</>
          )}
        </Button>
      </motion.div>
    </div>
  );
}