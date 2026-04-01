import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { audioBase64, action, currentData } = body;

    if (!audioBase64) {
      return Response.json({ error: 'No audio provided' }, { status: 400 });
    }

    // Clean base64 data
    const cleanBase64 = audioBase64.replace(/^data:audio\/\w+;base64,/, '');
    
    // Convert base64 to File-like object
    const binaryData = Uint8Array.from(atob(cleanBase64), c => c.charCodeAt(0));
    const blob = new Blob([binaryData], { type: 'audio/webm' });

    // Upload file and get URL
    const uploadRes = await base44.integrations.Core.UploadFile({
      file: blob
    });

    // Use Gemini with the uploaded file URL
    const transcriptionResult = await base44.integrations.Core.InvokeLLM({
      prompt: `Transcribe the following audio to text in Spanish. Only return the transcribed text, nothing else.`,
      file_urls: [uploadRes.file_url],
      model: 'gemini_3_flash',
    });

    const transcript = transcriptionResult?.trim() || '';

    return Response.json({
      transcript,
      action,
      currentData,
    });
  } catch (error) {
    console.error('Transcription error:', error);
    return Response.json(
      { error: 'Transcription failed', details: error.message },
      { status: 500 }
    );
  }
});