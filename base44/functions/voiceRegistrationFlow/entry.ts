import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { action, currentData, transcript } = await req.json();

    if (action === 'start') {
      return Response.json({
        nextStep: 'ask_name',
        message: 'Hola, bienvenido a SD-NEXUS. Voy a ayudarte a registrarte. ¿Cuál es tu nombre completo?',
        data: { name: '', phone: '', studies: [] }
      });
    }

    if (action === 'process_name') {
      return Response.json({
        nextStep: 'ask_phone',
        message: `Perfecto, ${transcript}. Ahora dime tu número de teléfono.`,
        data: { ...currentData, name: transcript }
      });
    }

    if (action === 'process_phone') {
      const cleanPhone = transcript.replace(/\s/g, '');
      return Response.json({
        nextStep: 'ask_studies',
        message: `Gracias. Tu teléfono es ${cleanPhone}. Ahora, ¿qué estudios necesitas? Puedes decir análisis de sangre, radiografía, ultrasonido, electrocardiograma, examen de vista, vacunación, u otro.`,
        data: { ...currentData, phone: cleanPhone }
      });
    }

    if (action === 'process_studies') {
      const STUDIES = [
        'análisis de sangre', 'radiografía de tórax', 'ultrasonido abdominal',
        'electrocardiograma', 'examen de vista', 'vacunación'
      ];
      
      const mentionedStudies = STUDIES.filter(s => transcript.toLowerCase().includes(s));
      const updatedStudies = [...new Set([...currentData.studies, ...mentionedStudies])];

      const confirming = transcript.toLowerCase().includes('listo') || 
                        transcript.toLowerCase().includes('eso es todo') ||
                        transcript.toLowerCase().includes('perfecto');

      if (confirming || mentionedStudies.length > 0) {
        return Response.json({
          nextStep: confirming ? 'confirm' : 'ask_studies_more',
          message: confirming ? 
            `Perfecto. Tus estudios son: ${updatedStudies.join(', ')}. ¿Es correcto?` :
            `Añadí ${mentionedStudies.join(' y ')} a tu lista. ¿Necesitas más estudios o eso es todo?`,
          data: { ...currentData, studies: updatedStudies }
        });
      }

      return Response.json({
        nextStep: 'ask_studies',
        message: 'No entendí bien. Por favor, dime qué estudios necesitas.',
        data: currentData
      });
    }

    if (action === 'complete_registration') {
      const { name, phone, studies } = currentData;

      if (!name || !phone || studies.length === 0) {
        return Response.json({
          error: 'Faltan datos',
          nextStep: 'ask_name'
        }, { status: 400 });
      }

      const AVAILABLE_STUDIES = [
        { name: 'Análisis de Sangre',    area: 'Laboratorio',  minutes: 15 },
        { name: 'Radiografía de Tórax',  area: 'Rayos X',      minutes: 10 },
        { name: 'Ultrasonido Abdominal', area: 'Ultrasonido',   minutes: 20 },
        { name: 'Electrocardiograma',    area: 'Cardiología',   minutes: 12 },
        { name: 'Examen de Vista',       area: 'Oftalmología',  minutes: 15 },
        { name: 'Vacunación',            area: 'Vacunación',    minutes: 8 },
      ];

      const res = await base44.functions.invoke('registerPatient', {
        name,
        phone,
        selectedStudies: studies,
        availableStudies: AVAILABLE_STUDIES,
      });

      if (res.data.error) {
        return Response.json({
          error: res.data.error,
          nextStep: 'ask_name'
        }, { status: 400 });
      }

      return Response.json({
        nextStep: 'complete',
        message: `¡Perfecto ${name}! Tu registro está completo. Tu tiempo estimado es ${res.data.totalEta} minutos. Tu trayecto está listo.`,
        registrationData: res.data
      });
    }

    return Response.json({ error: 'Acción no reconocida' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});