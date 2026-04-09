/**
 * useClinicManager — React hook wrapping ClinicController
 * Drop into any component to get real-time scheduling with alerts.
 *
 * Usage:
 *   const { controller, queue, rooms, alerts } = useClinicManager();
 *
 *   // When staff completes all steps of a study:
 *   await controller.handleStudyCompletion(journeyId, studyType, roomId);
 *
 *   // When patient physically arrives:
 *   controller.checkIn(journeyId, studyType);
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { api } from '@/api/client';
import { ClinicController } from '@/lib/ClinicController';

export function useClinicManager() {
  const controllerRef = useRef(null);
  const [queue, setQueue]   = useState([]);
  const [rooms, setRooms]   = useState({});
  const [alerts, setAlerts] = useState([]);

  const refresh = useCallback(() => {
    if (!controllerRef.current) return;
    setQueue([...controllerRef.current.getQueueSnapshot()]);
    setRooms({ ...controllerRef.current.getRoomSnapshot() });
  }, []);

  const addAlert = useCallback((msg) => {
    const entry = { id: Date.now(), msg, ts: new Date().toLocaleTimeString() };
    setAlerts(prev => [entry, ...prev].slice(0, 30)); // keep last 30
  }, []);

  // Bootstrap
  useEffect(() => {
    const ctrl = new ClinicController({
      onAlert:      (msg) => { addAlert(msg); console.warn('[ClinicController]', msg); },
      onAssignment: ({ patient, studyType, room }) => {
        addAlert(`✅ ${patient.patientName} asignado a ${studyType} (${room.roomId})`);
        refresh();
      },
      onNoShow: (patient) => {
        addAlert(`🚫 NO SHOW: ${patient.patientName}`);
        refresh();
      },
    });
    controllerRef.current = ctrl;

    // Initial sync
    ctrl.syncJourneys().then(refresh);

    // Real-time subscription: reload queue whenever a journey changes
    const unsub = api.entities.ClinicalJourney.subscribe((event) => {
      if (event.type === 'create' || event.type === 'update') {
        if (event.data) ctrl.loadJourney(event.data);
      } else if (event.type === 'delete') {
        ctrl.getQueueSnapshot(); // will naturally drop it
      }
      refresh();
    });

    // Poll wait-time alerts every 2 min
    const alertInterval = setInterval(() => {
      ctrl.syncJourneys().then(refresh);
    }, 2 * 60 * 1000);

    return () => {
      unsub();
      clearInterval(alertInterval);
      ctrl.destroy();
    };
  }, []);

  // ── Exposed helpers (memoized wrappers) ─────────────────────────
  const handleStudyCompletion = useCallback(async (journeyId, studyType, roomId) => {
    await controllerRef.current?.handleStudyCompletion(journeyId, studyType, roomId);
    refresh();
  }, [refresh]);

  const checkIn = useCallback((journeyId, studyType) => {
    controllerRef.current?.checkIn(journeyId, studyType);
    refresh();
  }, [refresh]);

  const markUrgent = useCallback(async (journeyId) => {
    await controllerRef.current?.markUrgent(journeyId);
    refresh();
  }, [refresh]);

  const dismissAlert = useCallback((id) => {
    setAlerts(prev => prev.filter(a => a.id !== id));
  }, []);

  return {
    controller:           controllerRef.current,
    queue,
    rooms,
    alerts,
    handleStudyCompletion,
    checkIn,
    markUrgent,
    dismissAlert,
    refresh,
  };
}