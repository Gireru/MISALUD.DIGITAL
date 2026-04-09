import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const ROOMS_PER_STUDY = 4;

/**
 * Returns the cubicle ID with the least active patients for a given study.
 * e.g. "Laboratorio-R2"
 */
function pickBestCubicle(studyName, allActiveJourneys) {
  // Count how many patients are currently assigned to each room for this study
  const counts = {};
  for (let i = 1; i <= ROOMS_PER_STUDY; i++) {
    counts[`${studyName}-R${i}`] = 0;
  }

  for (const journey of allActiveJourneys) {
    for (const s of (journey.studies || [])) {
      if (s.study_name === studyName && s.cubicle && counts[s.cubicle] !== undefined) {
        if (s.status === 'in_progress') {
          counts[s.cubicle]++;
        }
      }
    }
  }

  // Pick room with lowest count (least loaded)
  return Object.entries(counts).sort((a, b) => a[1] - b[1])[0][0];
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { name, phone, selectedStudies, availableStudies, branchName } = await req.json();

    if (!name || !phone || !selectedStudies || selectedStudies.length === 0) {
      return Response.json({ error: 'Faltan datos requeridos' }, { status: 400 });
    }

    // Generate QR token
    const qrToken = Array.from({ length: 16 }, () => Math.floor(Math.random() * 36).toString(36)).join('');

    // 1. Create patient
    const patient = await base44.asServiceRole.entities.Patient.create({
      name: name.trim(),
      phone: phone.trim(),
      qr_token: qrToken,
      current_status: 'in_progress',
    });

    // 2. Get modules for wait times
    let modules = [];
    try {
      modules = await base44.asServiceRole.entities.ClinicalModule.list();
    } catch (_) {
      modules = [];
    }
    const moduleMap = {};
    modules.forEach(m => { moduleMap[m.area_name] = m; });

    // 3. Fetch all active journeys to compute room load
    let activeJourneys = [];
    try {
      activeJourneys = await base44.asServiceRole.entities.ClinicalJourney.filter({ status: 'active' });
    } catch (_) {
      activeJourneys = [];
    }

    // 4. Build studies list, sorted by avg_wait ascending (shortest wait first)
    const studiesRaw = selectedStudies.map(sName => {
      const study = availableStudies.find(s => s.name === sName);
      const mod = moduleMap[study?.area] || {};
      return {
        study_name: study.name,
        area: study?.area || '',
        status: 'pending',
        estimated_minutes: (study?.minutes || 10) + (mod.avg_wait_minutes || 0),
        cubicle: '',
        preparation_note: study?.prep || '',
        _wait: mod.avg_wait_minutes || 0,
      };
    });

    // Sort: fewest-load studies first to maximize throughput
    studiesRaw.sort((a, b) => a._wait - b._wait);
    studiesRaw.forEach(s => delete s._wait);

    // 5. Assign cubicle to the first (active) study using least-loaded room
    if (studiesRaw.length > 0) {
      studiesRaw[0].status = 'in_progress';
      studiesRaw[0].cubicle = pickBestCubicle(studiesRaw[0].study_name, activeJourneys);
    }

    const totalEta = studiesRaw.reduce((sum, s) => sum + s.estimated_minutes, 0);

    // 6. Create journey
    await base44.asServiceRole.entities.ClinicalJourney.create({
      patient_id: patient.id,
      patient_name: name.trim(),
      studies: studiesRaw,
      total_eta_minutes: totalEta,
      status: 'active',
    });

    return Response.json({
      success: true,
      qrToken,
      patientName: name.trim(),
      totalEta,
    });

  } catch (error) {
    return Response.json({ error: error.message || String(error) }, { status: 500 });
  }
});