/**
 * ClinicController — Preemptive Dynamic Scheduler with Penalty-Based Retry Logic
 * Integrates with Base44's ClinicalJourney entity for real-time patient-to-room assignment.
 */

import { base44 } from '@/api/base44Client';

// ── Constants ────────────────────────────────────────────────────────
const MAX_WAIT_MINUTES      = 25;
const PENALTY_DURATION_MS   = 15 * 60 * 1000;  // 15 min
const NOSHOW_WINDOW_MS      = 5  * 60 * 1000;  // 5 min to check-in
const MAX_RETRY_COUNT       = 3;
const ROOMS_PER_STUDY       = 4;

// ── Room State ───────────────────────────────────────────────────────
// Managed in-memory; keyed by studyType → array of room slots
class RoomManager {
  constructor() {
    // { [studyType]: [{ roomId, isOccupied, currentPatientId, lastStatusChange }] }
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
    // Balance: pick the room that has been free the longest
    return this._rooms[studyType]
      .filter(r => !r.isOccupied)
      .sort((a, b) => a.lastStatusChange - b.lastStatusChange)[0] || null;
  }

  occupyRoom(studyType, roomId, patientId) {
    this._ensureStudy(studyType);
    const room = this._rooms[studyType].find(r => r.roomId === roomId);
    if (room) {
      room.isOccupied         = true;
      room.currentPatientId   = patientId;
      room.lastStatusChange   = Date.now();
    }
  }

  freeRoom(studyType, roomId) {
    this._ensureStudy(studyType);
    const room = this._rooms[studyType].find(r => r.roomId === roomId);
    if (room) {
      room.isOccupied         = false;
      room.currentPatientId   = null;
      room.lastStatusChange   = Date.now();
    }
  }

  getAll() { return this._rooms; }
}

// ── Patient Queue ────────────────────────────────────────────────────
// Wraps ClinicalJourney records with local state extensions
class PatientQueue {
  constructor() {
    // { [journeyId]: { urgencyLevel, requiredStudies, status, retryCount, waitingSince, lockoutUntil } }
    this._patients = {};
  }

  upsert(journey) {
    const existing = this._patients[journey.id] || {};
    this._patients[journey.id] = {
      journeyId:       journey.id,
      patientId:       journey.patient_id,
      patientName:     journey.patient_name,
      urgencyLevel:    journey.priority_color === 'red' ? 0 : 1, // 0 = Emergency
      requiredStudies: (journey.studies || [])
        .filter(s => s.status !== 'completed')
        .map(s => s.study_name),
      allStudies:      journey.studies || [],
      status:          existing.status || 'waiting',
      retryCount:      existing.retryCount || 0,
      waitingSince:    existing.waitingSince || Date.now(),
      lockoutUntil:    existing.lockoutUntil || null,
      createdDate:     journey.created_date,
    };
  }

  remove(journeyId) {
    delete this._patients[journeyId];
  }

  get(journeyId) {
    return this._patients[journeyId] || null;
  }

  // Returns sorted candidates for a given studyType
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
    this._locks    = new Set();          // journeyIds currently being processed (race-condition guard)
    this._timers   = {};                 // { [journeyId-studyType]: timeoutId }
    this._onAlert      = onAlert      || console.warn;
    this._onAssignment = onAssignment || (() => {});
    this._onNoShow     = onNoShow     || (() => {});
  }

  // ── Public API ───────────────────────────────────────────────────

  /** Call this to load / refresh all active journeys into the queue */
  async syncJourneys() {
    const journeys = await base44.entities.ClinicalJourney.filter({ status: 'active' });
    journeys.forEach(j => this._queue.upsert(j));
    this._checkWaitAlerts();
  }

  /** Add or refresh a single journey (call after create/update events) */
  loadJourney(journey) {
    this._queue.upsert(journey);
    this._checkWaitAlertFor(this._queue.get(journey.id));
  }

  /**
   * A. handleStudyCompletion — called when staff taps "Tachar" and completes all steps
   * @param {string} journeyId  - ClinicalJourney id
   * @param {string} studyType  - e.g. "Tomografía"
   * @param {string} roomId     - e.g. "Tomografía-R2"
   */
  async handleStudyCompletion(journeyId, studyType, roomId) {
    // 1. Free the room
    this._rooms.freeRoom(studyType, roomId);

    // 2. Update local queue — remove completed study from requiredStudies
    const patient = this._queue.get(journeyId);
    if (patient) {
      patient.requiredStudies = patient.requiredStudies.filter(s => s !== studyType);
      patient.status = patient.requiredStudies.length > 0 ? 'waiting' : 'completed';
      patient.waitingSince = Date.now();
    }

    // 3. Immediately dispatch next patient for this room type
    await this._dispatchNextPatient(studyType);
  }

  /**
   * C. handleNoShow — called when 5-min window expires without checkIn
   */
  async handleNoShow(journeyId, studyType) {
    const patient = this._queue.get(journeyId);
    if (!patient) return;

    if (patient.retryCount < MAX_RETRY_COUNT - 1) {
      // Penalize: move to end of queue, lockout 15 min
      this._queue.setPenalized(journeyId);
      this._onAlert(`⚠️ ${patient.patientName} no se presentó. Penalizado por 15 min. (Intento ${patient.retryCount}/${MAX_RETRY_COUNT})`);
    } else {
      // 3 strikes → remove
      this._queue.markNoShow(journeyId);
      this._onNoShow(patient);
      this._onAlert(`🚫 ${patient.patientName} marcado como NO SHOW después de ${MAX_RETRY_COUNT} intentos.`);
      // Persist to DB
      await base44.entities.ClinicalJourney.update(journeyId, { status: 'cancelled' });
    }

    // Free room and dispatch next
    const freeRoom = this._rooms.getFreeRoom(studyType);
    if (freeRoom) await this._dispatchNextPatient(studyType);
  }

  /**
   * checkIn — patient physically arrives; clears the no-show timer
   */
  checkIn(journeyId, studyType) {
    const timerKey = `${journeyId}-${studyType}`;
    if (this._timers[timerKey]) {
      clearTimeout(this._timers[timerKey]);
      delete this._timers[timerKey];
    }
    this._queue.setStatus(journeyId, 'in_consultation');
  }

  getQueueSnapshot()  { return this._queue.getAll(); }
  getRoomSnapshot()   { return this._rooms.getAll(); }

  destroy() {
    Object.values(this._timers).forEach(clearTimeout);
    this._timers = {};
  }

  // ── Private ──────────────────────────────────────────────────────

  /**
   * B. dispatchNextPatient — the scheduling brain
   */
  async _dispatchNextPatient(studyType) {
    const room = this._rooms.getFreeRoom(studyType);
    if (!room) return; // All rooms occupied

    const candidates = this._queue.getCandidatesFor(studyType);
    if (candidates.length === 0) return;

    const now = Date.now();

    // Priority 1: Emergency (urgencyLevel 0)
    let chosen = candidates
      .filter(p => p.urgencyLevel === 0)
      .sort((a, b) => a.waitingSince - b.waitingSince)[0];

    // Priority 2: Waiting > 15 mins
    if (!chosen) {
      chosen = candidates
        .filter(p => (now - p.waitingSince) / 60000 >= 15)
        .sort((a, b) => a.waitingSince - b.waitingSince)[0];
    }

    // Priority 3: Most pending studies (keeps patients flowing)
    if (!chosen) {
      chosen = candidates
        .sort((a, b) => b.requiredStudies.length - a.requiredStudies.length)[0];
    }

    if (!chosen) return;

    // Race-condition guard
    if (this._locks.has(chosen.journeyId)) return;
    this._locks.add(chosen.journeyId);

    try {
      // Mark room as occupied
      this._rooms.occupyRoom(studyType, room.roomId, chosen.journeyId);
      this._queue.setStatus(chosen.journeyId, 'in_consultation');

      // Persist: set study to in_progress in DB
      await this._persistAssignment(chosen, studyType, room.roomId);

      // Notify
      this._onAssignment({ patient: chosen, studyType, room });

      // Start no-show timer (5 min)
      this._startNoShowTimer(chosen.journeyId, studyType);
    } finally {
      this._locks.delete(chosen.journeyId);
    }
  }

  async _persistAssignment(patient, studyType, roomId) {
    const journeys = await base44.entities.ClinicalJourney.filter({ id: patient.journeyId });
    const journey  = journeys[0];
    if (!journey) return;

    // Pick least-loaded cubicle from current active journeys
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
    for (let i = 1; i <= ROOMS_PER_STUDY; i++) {
      counts[`${studyName}-R${i}`] = 0;
    }
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