/**
 * server.js
 * Servidor Express local que replaza las funciones serverless que antes
 * corrían en la infraestructura de terceros.
 *
 * Ejecutar con: node server.js
 * (json-server corre en el puerto 3001, este servidor en el 3001 también
 *  actuando como wrapper — o usar npm run server que llama a este archivo)
 */

import express from 'express';
import cors from 'cors';
import { createRequire } from 'module';
import { readFileSync, writeFileSync } from 'fs';
import { randomUUID } from 'crypto';

const require = createRequire(import.meta.url);
const app = express();
app.use(cors());
app.use(express.json());

const DB_PATH = './db.json';

function readDB() {
  return JSON.parse(readFileSync(DB_PATH, 'utf-8'));
}

function writeDB(data) {
  writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

// ── REST CRUD (json-server behavior) ─────────────────────────────────────────

function makeEntityRouter(collection) {
  const router = express.Router();

  router.get('/', (req, res) => {
    const db = readDB();
    let records = db[collection] || [];
    // Simple filter support
    for (const [key, val] of Object.entries(req.query)) {
      records = records.filter(r => String(r[key]) === String(val));
    }
    res.json(records);
  });

  router.get('/:id', (req, res) => {
    const db = readDB();
    const record = (db[collection] || []).find(r => r.id === req.params.id);
    if (!record) return res.status(404).json({ error: 'Not found' });
    res.json(record);
  });

  router.post('/', (req, res) => {
    const db = readDB();
    const record = { id: randomUUID(), ...req.body };
    db[collection] = [...(db[collection] || []), record];
    writeDB(db);
    res.status(201).json(record);
  });

  router.patch('/:id', (req, res) => {
    const db = readDB();
    const idx = (db[collection] || []).findIndex(r => r.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Not found' });
    db[collection][idx] = { ...db[collection][idx], ...req.body };
    writeDB(db);
    res.json(db[collection][idx]);
  });

  router.delete('/:id', (req, res) => {
    const db = readDB();
    db[collection] = (db[collection] || []).filter(r => r.id !== req.params.id);
    writeDB(db);
    res.status(204).end();
  });

  return router;
}

app.use('/patients',         makeEntityRouter('patients'));
app.use('/clinicalJourneys', makeEntityRouter('clinicalJourneys'));
app.use('/clinicalModules',  makeEntityRouter('clinicalModules'));
app.use('/journeyComments',  makeEntityRouter('journeyComments'));
app.use('/adminCredentials', makeEntityRouter('adminCredentials'));
app.use('/emergencyCodes',   makeEntityRouter('emergencyCodes'));
app.use('/users',            makeEntityRouter('users'));

// ── Functions ─────────────────────────────────────────────────────────────────

app.post('/functions/registerPatient', (req, res) => {
  const db = readDB();
  const { name, phone, selectedStudies = [], availableStudies = [], branchName } = req.body;

  if (!name || !phone) {
    return res.status(400).json({ error: 'Nombre y teléfono son requeridos' });
  }

  // Build patient
  const qrToken = randomUUID();
  const patientId = randomUUID();
  const patient = { id: patientId, name, phone, qr_token: qrToken, current_status: 'registered', created_date: new Date().toISOString() };
  db.patients.push(patient);

  // Build studies
  const studiesData = availableStudies
    .filter(s => selectedStudies.includes(s.name))
    .map(s => ({
      study_name: s.name,
      area: s.area || s.name,
      status: 'pending',
      estimated_minutes: s.estimatedMinutes || 20,
      steps_done: 0,
      steps_total: s.steps || 3,
      cubicle: null,
    }));

  const totalEta = studiesData.reduce((sum, s) => sum + s.estimated_minutes, 0);
  const journeyId = randomUUID();
  const journey = {
    id: journeyId,
    patient_id: patientId,
    patient_name: name,
    studies: studiesData,
    status: 'active',
    priority_color: 'auto',
    penalty_count: 0,
    branch: branchName || '',
    created_date: new Date().toISOString(),
  };
  db.clinicalJourneys.push(journey);
  writeDB(db);

  res.json({ patientName: name, qrToken, journeyId, totalEta });
});

app.post('/functions/getPatientByToken', (req, res) => {
  const db = readDB();
  const { token } = req.body;
  const patient = db.patients.find(p => p.qr_token === token);
  if (!patient) return res.json({ error: 'Paciente no encontrado' });

  let journey = db.clinicalJourneys.find(j => j.patient_id === patient.id);
  if (!journey) {
    journey = db.clinicalJourneys.find(j => j.patient_name === patient.name);
  }
  res.json({ patient, journey: journey || null });
});

app.post('/functions/chatAssistant', (req, res) => {
  const { message = '', patientName = '' } = req.body;
  // Stub response — integrate a real LLM API here if desired
  const replies = [
    `Hola ${patientName || 'paciente'}! Puedo ayudarte con información sobre tu visita.`,
    'Por favor, sigue las instrucciones del personal médico para cada estudio.',
    'Si tienes dudas sobre tiempos de espera, puedes preguntar en recepción.',
    'Recuerda mantener tu código QR a la mano para el seguimiento.',
  ];
  const reply = message.length
    ? `Entiendo tu consulta sobre "${message}". ${replies[Math.floor(Math.random() * replies.length)]}`
    : replies[0];
  res.json({ reply });
});

app.post('/functions/triggerEmergencyCode', (req, res) => {
  const db = readDB();
  const { code_type, location, description } = req.body;
  const record = {
    id: randomUUID(),
    code_type,
    location,
    description,
    status: 'active',
    created_date: new Date().toISOString(),
  };
  db.emergencyCodes.push(record);
  writeDB(db);
  res.json({ success: true, id: record.id });
});

app.post('/functions/voiceRegistrationFlow', (req, res) => {
  res.json({ success: true, message: 'Flujo de voz procesado' });
});

app.post('/functions/transcribeVoiceNote', (req, res) => {
  res.json({ transcription: '' });
});

app.post('/functions/seedDemoJourneys', (req, res) => {
  res.json({ success: true, message: 'Demo journeys seeded' });
});

app.post('/functions/checkPatientAbsence', (req, res) => {
  res.json({ success: true });
});

app.post('/functions/simulatePatientFlow', (req, res) => {
  res.json({ success: true });
});

// ── Integrations stubs ────────────────────────────────────────────────────────

app.post('/integrations/llm', (req, res) => {
  res.json({ result: 'El asistente no está disponible en modo local.' });
});

app.post('/integrations/email', (_req, res) => res.json({ success: true }));
app.post('/integrations/upload', (_req, res) => res.json({ url: '' }));

// ── Start ─────────────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`\n✅ MISALUD API Server corriendo en http://localhost:${PORT}`);
  console.log(`   Entidades: /patients, /clinicalJourneys, /clinicalModules, ...`);
  console.log(`   Funciones: /functions/registerPatient, /functions/getPatientByToken, ...\n`);
});
