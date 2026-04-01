import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { token } = await req.json();

    if (!token) {
      return Response.json({ error: 'Token requerido' }, { status: 400 });
    }

    // Find patient by QR token
    const patients = await base44.asServiceRole.entities.Patient.filter({ qr_token: token });
    if (!patients || patients.length === 0) {
      return Response.json({ error: 'Paciente no encontrado' }, { status: 404 });
    }
    const patient = patients[0];

    // Find journey by patient_id
    let journeys = await base44.asServiceRole.entities.ClinicalJourney.filter({ patient_id: patient.id });
    if (!journeys || journeys.length === 0) {
      journeys = await base44.asServiceRole.entities.ClinicalJourney.filter({ patient_name: patient.name });
    }
    if (!journeys || journeys.length === 0) {
      return Response.json({ error: 'Trayecto no encontrado' }, { status: 404 });
    }

    return Response.json({ patient, journey: journeys[0] });

  } catch (error) {
    return Response.json({ error: error.message || String(error) }, { status: 500 });
  }
});