import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { name, phone, selectedStudies, availableStudies } = await req.json();

    if (!name || !phone || !selectedStudies || selectedStudies.length === 0) {
      return Response.json({ error: 'Faltan datos requeridos' }, { status: 400 });
    }

    // Generate QR token
    const qrToken = Array.from({ length: 16 }, () => Math.floor(Math.random() * 36).toString(36)).join('');

    // 1. Create patient as service role (no auth required from public user)
    const patient = await base44.asServiceRole.entities.Patient.create({
      name: name.trim(),
      phone: phone.trim(),
      qr_token: qrToken,
      current_status: 'in_progress',
    });

    // 2. Get modules to calculate wait times
    let modules = [];
    try {
      modules = await base44.asServiceRole.entities.ClinicalModule.list();
    } catch (_) {
      modules = [];
    }
    const moduleMap = {};
    modules.forEach(m => { moduleMap[m.area_name] = m; });

    // 3. Build studies list
    const studies = selectedStudies.map(sName => {
      const study = availableStudies.find(s => s.name === sName);
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

    // 4. Create journey
    await base44.asServiceRole.entities.ClinicalJourney.create({
      patient_id: patient.id,
      patient_name: name.trim(),
      studies,
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