import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Fetch all active journeys
    const journeys = await base44.asServiceRole.entities.ClinicalJourney.filter({ status: 'active' });

    let updated = 0;

    for (const journey of journeys) {
      const studies = journey.studies || [];
      let changed = false;

      // Find current in_progress study
      const inProgressIdx = studies.findIndex(s => s.status === 'in_progress');

      if (inProgressIdx === -1) {
        // No in_progress — find first pending and start it
        const pendingIdx = studies.findIndex(s => s.status === 'pending');
        if (pendingIdx !== -1) {
          studies[pendingIdx] = { ...studies[pendingIdx], status: 'in_progress', steps_done: 0 };
          changed = true;
        }
      } else {
        const study = studies[inProgressIdx];
        const totalSteps = 3; // all studies have 3 steps
        const currentSteps = study.steps_done || 0;

        if (currentSteps < totalSteps - 1) {
          // Advance one step
          studies[inProgressIdx] = { ...study, steps_done: currentSteps + 1 };
          changed = true;
        } else {
          // Complete this study
          studies[inProgressIdx] = {
            ...study,
            status: 'completed',
            steps_done: totalSteps,
            completed_at: new Date().toISOString(),
          };

          // Start next pending
          const nextPendingIdx = studies.findIndex(s => s.status === 'pending');
          if (nextPendingIdx !== -1) {
            studies[nextPendingIdx] = { ...studies[nextPendingIdx], status: 'in_progress', steps_done: 0 };
          }
          changed = true;
        }
      }

      if (changed) {
        const allDone = studies.every(s => s.status === 'completed');
        await base44.asServiceRole.entities.ClinicalJourney.update(journey.id, {
          studies,
          status: allDone ? 'completed' : 'active',
        });
        if (allDone) {
          await base44.asServiceRole.entities.Patient.update(journey.patient_id, {
            current_status: 'completed',
          });
        }
        updated++;
      }
    }

    return Response.json({ ok: true, updated, total: journeys.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});