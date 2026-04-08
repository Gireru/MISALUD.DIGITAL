import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { QrCode, UserPlus, CheckCircle2, Copy, Phone, AlertCircle, Mic, MapPin, ChevronLeft } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import confetti from 'canvas-confetti';
import SplashScreen from '@/components/register/SplashScreen';
import BranchSelector from '@/components/register/BranchSelector';
import StudySelector, { ALL_STUDIES } from '@/components/register/StudySelector';

// STEP FLOW: splash → studies → branch → form → success

export default function RegisterPatient() {
  const [showSplash, setShowSplash] = useState(true);
  const [step, setStep] = useState('studies'); // 'studies' | 'branch' | 'form'
  const [selectedStudies, setSelectedStudies] = useState([]);
  const [branch, setBranch] = useState(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  // Services needed for branch filtering
  const requiredServices = ALL_STUDIES
    .filter(s => selectedStudies.includes(s.name))
    .map(s => s.service);

  // Confetti on success
  useEffect(() => {
    if (!result) return;
    const end = Date.now() + 2000;
    const colors = ['#7ED957', '#5cca38', '#008F4C', '#fff'];
    const frame = () => {
      confetti({ particleCount: 6, angle: 60,  spread: 55, origin: { x: 0 }, colors });
      confetti({ particleCount: 6, angle: 120, spread: 55, origin: { x: 1 }, colors });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();
  }, [result]);

  const handleRegister = async () => {
    if (!name.trim() || !phone.trim()) {
      setError('Ingresa nombre y teléfono.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const studiesData = ALL_STUDIES.filter(s => selectedStudies.includes(s.name));
      const response = await base44.functions.invoke('registerPatient', {
        name: name.trim(),
        phone: phone.trim(),
        selectedStudies,
        availableStudies: studiesData,
        branchName: branch?.name,
      });
      const data = response.data;
      if (data.error) { setError(data.error); setLoading(false); return; }
      const patientUrl = `${window.location.origin}/patient/view?token=${data.qrToken}`;
      setResult({ ...data, patientUrl });
      setName(''); setPhone(''); setSelectedStudies([]);
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || 'Error al conectar con el servidor');
    } finally {
      setLoading(false);
    }
  };

  // ── SPLASH ──────────────────────────────────────────────────────
  if (showSplash) {
    return (
      <AnimatePresence>
        <SplashScreen onDone={() => setShowSplash(false)} />
      </AnimatePresence>
    );
  }

  // ── SUCCESS ─────────────────────────────────────────────────────
  if (result) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', damping: 18, stiffness: 220 }}
          className="w-full max-w-xs text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', damping: 12, stiffness: 300, delay: 0.1 }}
            className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-4"
            style={{ background: 'rgba(0,143,76,0.1)' }}
          >
            <CheckCircle2 className="w-10 h-10" style={{ color: '#008F4C' }} />
          </motion.div>

          <h2 className="font-heading text-2xl font-bold mb-1">¡Registro exitoso!</h2>
          <p className="text-sm mb-1" style={{ color: '#888' }}>
            {result.patientName} · ETA: {result.totalEta} min
          </p>
          <p className="text-xs mb-7 flex items-center justify-center gap-1" style={{ color: '#7ED957' }}>
            <MapPin className="w-3 h-3" /> {branch?.name}
          </p>

          <div className="flex flex-col items-center mb-5">
            <div className="p-5 bg-white rounded-3xl border shadow-sm inline-block mb-3">
              <QRCodeSVG value={result.patientUrl} size={200} level="H" />
            </div>
            <button
              onClick={() => navigator.clipboard.writeText(result.patientUrl)}
              className="flex items-center gap-1.5 text-xs px-4 py-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <Copy className="w-3.5 h-3.5" /> Copiar enlace del QR
            </button>
          </div>

          <a
            href={result.patientUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full h-14 rounded-2xl text-base font-semibold text-white mb-3"
            style={{ background: 'linear-gradient(135deg, #7ED957, #5cca38)', boxShadow: '0 8px 24px rgba(126,217,87,0.35)' }}
          >
            <QrCode className="w-5 h-5" /> Ver mi trayecto
          </a>

          <button
            onClick={() => { setResult(null); setBranch(null); setStep('studies'); }}
            className="flex items-center justify-center gap-2 w-full h-11 rounded-xl border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 transition-colors mb-2"
          >
            <UserPlus className="w-4 h-4" /> Nuevo registro
          </button>
          <a
            href="/mis-trayectos"
            className="flex items-center justify-center gap-2 w-full h-11 rounded-xl border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 transition-colors mb-2"
          >
            <Phone className="w-4 h-4" /> Mis trayectos
          </a>
          <a
            href="/voice-register"
            className="flex items-center justify-center gap-2 w-full h-11 rounded-xl border border-green-300 text-sm text-green-700 hover:bg-green-50 transition-colors"
          >
            <Mic className="w-4 h-4" /> Registro por voz
          </a>
        </motion.div>
      </div>
    );
  }

  // ── STEP 1: STUDY SELECTOR ───────────────────────────────────────
  if (step === 'studies') {
    return (
      <StudySelector
        selected={selectedStudies}
        onChange={(studies, proceed) => {
          setSelectedStudies(studies);
          if (proceed) setStep('branch');
        }}
      />
    );
  }

  // ── STEP 2: BRANCH SELECTOR ─────────────────────────────────────
  if (step === 'branch') {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
        <button
          onClick={() => setStep('studies')}
          className="fixed top-5 left-5 z-50 flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700 transition-colors bg-white/90 backdrop-blur px-3 py-1.5 rounded-full border border-gray-200"
        >
          <ChevronLeft className="w-3.5 h-3.5" /> Cambiar estudios
        </button>
        <BranchSelector
          requiredServices={requiredServices}
          onSelect={(b) => { setBranch(b); setStep('form'); }}
        />
      </motion.div>
    );
  }

  // ── STEP 3: PATIENT DATA FORM ────────────────────────────────────
  return (
    <div className="min-h-screen bg-white">
      <div className="p-6 max-w-lg mx-auto space-y-6">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <button
            onClick={() => setStep('branch')}
            className="flex items-center gap-1.5 text-xs text-gray-400 mb-4 hover:text-gray-600 transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" /> Cambiar sucursal
          </button>

          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-3"
            style={{ background: 'rgba(126,217,87,0.1)', border: '1px solid rgba(126,217,87,0.25)' }}
          >
            <MapPin className="w-3.5 h-3.5" style={{ color: '#7ED957' }} />
            <span className="text-xs font-semibold" style={{ color: '#3dba1e' }}>{branch?.name}</span>
          </div>

          <h1 className="font-heading text-2xl font-bold">Tus datos</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {selectedStudies.length} estudio{selectedStudies.length !== 1 ? 's' : ''} seleccionado{selectedStudies.length !== 1 ? 's' : ''}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border rounded-2xl p-5 space-y-5 shadow-sm"
        >
          <div className="flex flex-wrap gap-1.5">
            {selectedStudies.map(s => (
              <span
                key={s}
                className="text-[11px] px-2.5 py-1 rounded-full font-medium"
                style={{ background: 'rgba(126,217,87,0.1)', color: '#3dba1e' }}
              >
                {s}
              </span>
            ))}
          </div>

          <div>
            <Label className="text-xs font-semibold text-gray-600 mb-1.5 block">Nombre completo</Label>
            <Input
              value={name}
              onChange={e => { setName(e.target.value); setError(''); }}
              placeholder="Ej. María García López"
            />
          </div>

          <div>
            <Label className="text-xs font-semibold text-gray-600 mb-1.5 block">Teléfono</Label>
            <Input
              value={phone}
              onChange={e => { setPhone(e.target.value); setError(''); }}
              placeholder="Ej. 55 1234 5678"
              type="tel"
            />
            <p className="text-[11px] text-muted-foreground mt-1">📲 Por este número podrás consultar tus resultados.</p>
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            onClick={handleRegister}
            disabled={loading || !name.trim() || !phone.trim()}
            className="w-full h-12 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 transition-opacity disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #7ED957, #5cca38)' }}
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <><QrCode className="w-4 h-4" /> Registrar y generar trayecto</>
            )}
          </button>
        </motion.div>
      </div>
    </div>
  );
}