/**
 * ClinicController — Preemptive Dynamic Scheduler with Penalty-Based Retry Logic
 * Integrates with Base44's ClinicalJourney entity for real-time patient-to-room assignment.
 */

import { base44 } from '@/api/base44Client';

// ── Constants ────────────────────────────────────────────────────────
const MAX_WAIT_MINUTES    = 25;
const PENALTY_DURATION_MS = 15 * 60 * 1000;  // 15 min
const NOSHOW_WINDOW_MS    = 5  * 60 * 1000;  // 5 min to check-in
const MAX_RETRY_COUNT     = 3;
const ROOMS_PER_STUDY     = 4;

// ── Room State ───────────────────────────────────────────────────────
class RoomManager {
  constructor() {
    this._rooms = {};
  }

  _ensureStudy(studyType) {
    if (!this._rooms[studyType]) {
      this._rooms[studyType] = Array.from({ length: ROOMS_PER_STUDY }, (_, i) => ({
        roomId: `${studyType}-R${i + 1}`,
        isOccupied: false,
        currentPatientId: null,
        lastStatusChange: Date.now(),
      }));
    }
  }

  getFreeRoom(studyType) {
    this._ensureStudy(studyType);
    return this._rooms[studyType]
      .filter(r => !r.isOccupied)
      .sort((a, b) => a.lastStatusChange - b.lastStatusChange)[0] || null;
  }

  occupyRoom(studyType, roomId, patientId) {
    this._ensureStudy(studyType);
    const room = this._rooms[studyType].find(r => r.roomId === roomId);
    if (room) {
      room.isOccupied       = true;
      room.currentPatientId = patientId;
      room.lastStatusChange = Date.now();
    }
  }

  freeRoom(studyType, roomId) {
    this._ensureStudy(studyType);
    const room = this._rooms[studyType].find(r => r.roomId === roomId);
    if (room) {
      room.isOccupied       = false;
      room.currentPatientId = null;
      room.lastStatusChange = Date.now();
    }
  }

  getAll() { return this._rooms; }
}

// ── Patient Queue ────────────────────────────────────────────────────
class PatientQueue {
  constructor() {
    this._patients = {};
  }

  upsert(journey) {
    const existing = this._patients[journey.id] || {};

    // Priority: red (emergency/urgency) = 0, yellow = 1, green = 2
    const priorityMap = { red: 0, yellow: 1, green: 2, auto: 2 };
    const rawPriority = journey.priority_color || 'auto';
    const urgencyLevel = priorityMap[rawPriority] ?? 2;

    this._patients[journey.id] = {
      journeyId:       journey.id,
      patientId:       journey.patient_id,
      patientName:     journey.patient_name,
      urgencyLevel,                          // 0 = emergency, 1 = elevated, 2 = normal
      priority_color:  rawPriority,
      requiredStudies: (journey.studies || [])
        .filter(s => s.status !== 'completed')
        .map(s => s.study_name),
      allStudies:      journey.studies || [],
      status:          existing.status || 'waiting',
      retryCount:      journey.penalty_count ?? existing.retryCount ?? 0,
      waitingSince:    existing.waitingSince || Date.now(),
      lockoutUntil:    existing.lockoutUntil || null,
      createdDate:     journey.created_date,
    };
  }

  remove(journeyId) { delete this._patients[journeyId]; }
  get(journeyId)    { return this._patients[journeyId] || null; }

  /** Candidates for a given studyType — sorted by priority then wait time */
  getCandidatesFor(studyType) {
    const now = Date.now();
    return Object.values(this._patients)
      .filter(p =>
        p.status === 'waiting' &&
        p.requiredStudies.includes(studyType) &&
        (!p.lockoutUntil || p.lockoutUntil <= now)
      );
  }

  setStatus(journeyId, status) {
    if (this._patients[journeyId]) this._patients[journeyId].status = status;
  }

  setPenalized(journeyId) {
    const p = this._patients[journeyId];
    if (!p) return;
    p.retryCount   += 1;
    p.lockoutUntil  = Date.now() + PENALTY_DURATION_MS;
    p.status        = 'penalized';
  }

  markNoShow(journeyId) {
    if (this._patients[journeyId]) this._patients[journeyId].status = 'noshow';
  }

  getAll() { return Object.values(this._patients); }
}

// ── ClinicController ─────────────────────────────────────────────────
export class ClinicController {
  constructor({ onAlert, onAssignment, onNoShow } = {}) {
    this._rooms    = new RoomManager();
    this._queue    = new PatientQueue();
    this._locks    = new Set();
    this._timers   = {};
    this._onAlert      = onAlert      || console.warn;
    this._onAssignment = onAssignment || (() => {});
    this._onNoShow     = onNoShow     || (() => {});
  }

  // ── Public API ───────────────────────────────────────────────────

  async syncJourneys() {
    const journeys = await base44.entities.ClinicalJourney.filter({ status: 'active' });
    journeys.forEach(j => this._queue.upsert(j));
    this._checkWaitAlerts();
  }

  loadJourney(journey) {
    this._queue.upsert(journey);
    this._checkWaitAlertFor(this._queue.get(journey.id));
  }

  /**
   * Called when staff completes all steps of a study (Tachar final).
   */
  async handleStudyCompletion(journeyId, studyType, roomId) {
    this._rooms.freeRoom(studyType, roomId);

    const patient = this._queue.get(journeyId);
    if (patient) {
      patient.requiredStudies = patient.requiredStudies.filter(s => s !== studyType);
      patient.status = patient.requiredStudies.length > 0 ? 'waiting' : 'completed';
      patient.waitingSince = Date.now();
    }

    await this._dispatchNextPatient(studyType);
  }

  /**
   * Called when 5-min no-show window expires.
   * 1st and 2nd infraction → 15-min penalty.
   * 3rd infraction → cancel journey (eliminates from active flow).
   */
  async handleNoShow(journeyId, studyType) {
    const patient = this._queue.get(journeyId);
    if (!patient) return;

    const newCount = patient.retryCount + 1;

    if (newCount < MAX_RETRY_COUNT) {
      // Penalize: 15-min lockout
      this._queue.setPenalized(journeyId);
      this._onAlert(`⚠️ ${patient.patientName} no se presentó al estudio "${studyType}". Penalización: 15 min de espera. (Falta ${newCount}/${MAX_RETRY_COUNT})`);

      // Persist penalty count to DB
      await base44.entities.ClinicalJourney.update(journeyId, {
        penalty_count: newCount,
        penalty_until: new Date(Date.now() + PENALTY_DURATION_MS).toISOString(),
      });
    } else {
      // 3 strikes → cancel
      this._queue.markNoShow(journeyId);
      this._onNoShow(patient);
      this._onAlert(`🚫 ${patient.patientName} eliminado del flujo activo por ${MAX_RETRY_COUNT} ausencias consecutivas.`);

      await base44.entities.ClinicalJourney.update(journeyId, {
        status: 'cancelled',
        penalty_count: newCount,
      });
    }

    // Free room and dispatch next patient
    this._rooms.freeRoom(studyType, patient.journeyId);
    await this._dispatchNextPatient(studyType);
  }

  /**
   * Mark patient as urgent/emergency — moves to front of queue.
   * Persists priority_color='red' to DB.
   */
  async markUrgent(journeyId) {
    const patient = this._queue.get(journeyId);
    if (!patient) return;

    patient.urgencyLevel = 0;
    patient.priority_color = 'red';
    if (patient.lockoutUntil) {
      patient.lockoutUntil = null; // lift penalty lockout for emergencies
      patient.status = 'waiting';
    }

    await base44.entities.ClinicalJourney.update(journeyId, { priority_color: 'red' });
    this._onAlert(`🚨 ${patient.patientName} marcado como URGENTE — prioridad máxima activada.`);

    // Immediately try to dispatch for each of their pending studies
    for (const studyType of patient.requiredStudies) {
      await this._dispatchNextPatient(studyType);
    }
  }

  checkIn(journeyId, studyType) {
    const timerKey = `${journeyId}-${studyType}`;
    if (this._timers[timerKey]) {
      clearTimeout(this._timers[timerKey]);
      delete this._timers[timerKey];
    }
    this._queue.setStatus(journeyId, 'in_consultation');
  }

  getQueueSnapshot() { return this._queue.getAll(); }
  getRoomSnapshot()  { return this._rooms.getAll(); }

  destroy() {
    Object.values(this._timers).forEach(clearTimeout);
    this._timers = {};
  }

  // ── Private ──────────────────────────────────────────────────────

  async _dispatchNextPatient(studyType) {
    const room = this._rooms.getFreeRoom(studyType);
    if (!room) return;

    const candidates = this._queue.getCandidatesFor(studyType);
    if (candidates.length === 0) return;

    const now = Date.now();

    // Priority 1: Emergency (urgencyLevel 0 → red)
    let chosen = candidates
      .filter(p => p.urgencyLevel === 0)
      .sort((a, b) => a.waitingSince - b.waitingSince)[0];

    // Priority 2: Elevated (urgencyLevel 1 → yellow)
    if (!chosen) {
      chosen = candidates
        .filter(p => p.urgencyLevel === 1)
        .sort((a, b) => a.waitingSince - b.waitingSince)[0];
    }

    // Priority 3: Waiting > 15 mins (any urgency)
    if (!chosen) {
      chosen = candidates
        .filter(p => (now - p.waitingSince) / 60000 >= 15)
        .sort((a, b) => a.waitingSince - b.waitingSince)[0];
    }

    // Priority 4: Most pending studies (maximize throughput)
    if (!chosen) {
      chosen = candidates
        .sort((a, b) => b.requiredStudies.length - a.requiredStudies.length)[0];
    }

    if (!chosen) return;

    if (this._locks.has(chosen.journeyId)) return;
    this._locks.add(chosen.journeyId);

    try {
      this._rooms.occupyRoom(studyType, room.roomId, chosen.journeyId);
      this._queue.setStatus(chosen.journeyId, 'in_consultation');

      await this._persistAssignment(chosen, studyType, room.roomId);
      this._onAssignment({ patient: chosen, studyType, room });
      this._startNoShowTimer(chosen.journeyId, studyType);
    } finally {
      this._locks.delete(chosen.journeyId);
    }
  }

  async _persistAssignment(patient, studyType, roomId) {
    const journeys = await base44.entities.ClinicalJourney.filter({ id: patient.journeyId });
    const journey  = journeys[0];
    if (!journey) return;

    const allActive = await base44.entities.ClinicalJourney.filter({ status: 'active' });
    const bestRoom  = this._pickBestCubicle(studyType, allActive) || roomId;

    const updatedStudies = (journey.studies || []).map(s => {
      if (s.study_name === studyType && s.status === 'pending') {
        return { ...s, status: 'in_progress', cubicle: bestRoom };
      }
      return s;
    });

    await base44.entities.ClinicalJourney.update(patient.journeyId, { studies: updatedStudies });
  }

  _pickBestCubicle(studyName, allActiveJourneys) {
    const counts = {};
    for (let i = 1; i <= ROOMS_PER_STUDY; i++) counts[`${studyName}-R${i}`] = 0;
    for (const journey of allActiveJourneys) {
      for (const s of (journey.studies || [])) {
        if (s.study_name === studyName && s.cubicle && counts[s.cubicle] !== undefined) {
          if (s.status === 'in_progress') counts[s.cubicle]++;
        }
      }
    }
    return Object.entries(counts).sort((a, b) => a[1] - b[1])[0][0];
  }

  _startNoShowTimer(journeyId, studyType) {
    const timerKey = `${journeyId}-${studyType}`;
    if (this._timers[timerKey]) clearTimeout(this._timers[timerKey]);
    this._timers[timerKey] = setTimeout(async () => {
      delete this._timers[timerKey];
      await this.handleNoShow(journeyId, studyType);
    }, NOSHOW_WINDOW_MS);
  }

  _checkWaitAlerts() {
    this._queue.getAll().forEach(p => this._checkWaitAlertFor(p));
  }

  _checkWaitAlertFor(patient) {
    if (!patient || patient.status !== 'waiting') return;
    const waitMins = (Date.now() - patient.waitingSince) / 60000;
    if (waitMins >= MAX_WAIT_MINUTES) {
      this._onAlert(`🔴 ALERTA: ${patient.patientName} lleva ${Math.round(waitMins)} min esperando. Máximo: ${MAX_WAIT_MINUTES} min.`);
    }
  }
}