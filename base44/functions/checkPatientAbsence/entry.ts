import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Get all active journeys
    const journeys = await base44.asServiceRole.entities.ClinicalJourney.filter({ status: 'active' });
    const now = Date.now();

    const WARN_MINUTES = 50;       // Enviar mensaje a los 50 min
    const AUTO_ARCHIVE_MINUTES = 90; // Archivar a los 90 min si no respondió

    let warned = 0;
    let archived = 0;

    for (const journey of journeys) {
      const createdAt = new Date(journey.created_date).getTime();
      const minutesElapsed = (now - createdAt) / 60000;

      // Get patient
      const patients = await base44.asServiceRole.entities.Patient.filter({ id: journey.patient_id });
      const patient = patients[0];
      if (!patient) continue;

      // Skip if any study already in progress or completed (patient is present)
      const hasActivity = (journey.studies || []).some(s => s.status === 'completed');
      if (hasActivity) continue;

      // ── AUTO-ARCHIVE at 90 min if absence_warned is set ──
      if (minutesElapsed >= AUTO_ARCHIVE_MINUTES && journey.absence_warned) {
        await base44.asServiceRole.entities.ClinicalJourney.update(journey.id, { status: 'cancelled' });
        await base44.asServiceRole.entities.Patient.update(patient.id, { current_status: 'completed' });
        archived++;
        continue;
      }

      // ── WARN at 50 min if not already warned ──
      if (minutesElapsed >= WARN_MINUTES && !journey.absence_warned && patient.phone) {
        // Mark as warned immediately to avoid duplicate sends
        await base44.asServiceRole.entities.ClinicalJourney.update(journey.id, { absence_warned: true });

        // Send WhatsApp-style message via email as fallback (no WhatsApp API available)
        // We send an email to admins notifying about potential absence
        const admins = await base44.asServiceRole.entities.User.filter({ role: 'admin' });
        const emailPromises = admins.map(admin =>
          base44.asServiceRole.integrations.Core.SendEmail({
            to: admin.email,
            subject: `⏰ Posible ausencia: ${patient.name}`,
            body: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
                <div style="background: #F9A825; color: white; padding: 16px 24px; border-radius: 10px 10px 0 0;">
                  <h2 style="margin: 0;">⏰ Posible No-Show</h2>
                </div>
                <div style="background: #fff8e1; padding: 20px 24px; border-radius: 0 0 10px 10px; border: 1px solid #ffe082;">
                  <p><strong>Paciente:</strong> ${patient.name}</p>
                  <p><strong>Teléfono:</strong> ${patient.phone}</p>
                  <p><strong>Registrado hace:</strong> ~${Math.round(minutesElapsed)} minutos</p>
                  <p><strong>Sin actividad registrada</strong> en su trayecto.</p>
                  <hr style="border: none; border-top: 1px solid #ffe082; margin: 14px 0;">
                  <p style="color: #888; font-size: 12px;">
                    Si el paciente no confirma su asistencia, su trayecto se archivará automáticamente a los 90 minutos del registro.<br>
                    SD-NEXUS — Sistema de Gestión Clínica
                  </p>
                </div>
              </div>
            `
          }).catch(() => null)
        );
        await Promise.all(emailPromises);
        warned++;
      }
    }

    return Response.json({ success: true, warned, archived, checked: journeys.length });
  } catch (error) {
    return Response.json({ error: error.message || String(error) }, { status: 500 });
  }
});