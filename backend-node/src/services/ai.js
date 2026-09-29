import fs from 'node:fs/promises';

const assemblyHeaders = () => ({ authorization: process.env.ASSEMBLYAI_API_KEY });

export const transcribeAudio = async (filePath) => {
  if (!process.env.ASSEMBLYAI_API_KEY) throw new Error('ASSEMBLYAI_API_KEY is not configured.');

  const audio = await fs.readFile(filePath);
  const uploadResponse = await fetch('https://api.assemblyai.com/v2/upload', {
    method: 'POST',
    headers: { ...assemblyHeaders(), 'content-type': 'application/octet-stream' },
    body: audio
  });
  if (!uploadResponse.ok) throw new Error(`AssemblyAI upload failed: ${await uploadResponse.text()}`);
  const { upload_url: audioUrl } = await uploadResponse.json();

  const transcriptResponse = await fetch('https://api.assemblyai.com/v2/transcript', {
    method: 'POST',
    headers: { ...assemblyHeaders(), 'content-type': 'application/json' },
    body: JSON.stringify({ audio_url: audioUrl, speaker_labels: true, speech_models: ['universal-2', 'universal-3-pro'] })
  });
  if (!transcriptResponse.ok) throw new Error(`AssemblyAI transcription request failed: ${await transcriptResponse.text()}`);
  const { id } = await transcriptResponse.json();

  for (;;) {
    const response = await fetch(`https://api.assemblyai.com/v2/transcript/${id}`, { headers: assemblyHeaders() });
    if (!response.ok) throw new Error(`AssemblyAI polling failed: ${await response.text()}`);
    const result = await response.json();
    if (result.status === 'completed') {
      if (!result.utterances?.length) return result.text || '';
      return result.utterances.map(({ speaker, text }) => `Speaker ${speaker}:\n${text}`).join('\n\n');
    }
    if (result.status === 'error') throw new Error(`AssemblyAI transcription failed: ${result.error || 'Unknown error'}`);
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }
};

const summaryToText = (summary) => {
  if (Array.isArray(summary)) return summary.map((item) => `• ${item}`).join('\n');
  if (summary && typeof summary === 'object') {
    const lines = [];
    if (Array.isArray(summary.key_points)) lines.push('Key Points:', ...summary.key_points.map((item) => `• ${item}`));
    if (Array.isArray(summary.action_items)) lines.push('', 'Action Items:', ...summary.action_items.map((item) => `• ${item}`));
    return lines.join('\n').trim() || JSON.stringify(summary);
  }
  return typeof summary === 'string' ? summary : 'Summary unavailable.';
};

export const generateTitleAndSummary = async (transcript) => {
  if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY is not configured.');
  const model = process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite-preview';
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: `You are an expert meeting assistant. Return JSON with a short professional title (max 6 words) and a concise bulleted summary of key points and action items.\n\nTranscript:\n${transcript}` }] }],
      generationConfig: { responseMimeType: 'application/json' }
    })
  });
  if (!response.ok) throw new Error(`Gemini API failed: ${await response.text()}`);
  const result = await response.json();
  const rawText = result.candidates?.[0]?.content?.parts?.[0]?.text || '';
  const jsonText = rawText.slice(rawText.indexOf('{'), rawText.lastIndexOf('}') + 1);
  if (!jsonText || jsonText === '}') throw new Error('Gemini did not return a valid JSON object.');
  const parsed = JSON.parse(jsonText);
  return {
    title: parsed.title || parsed.meeting_title || 'Meeting Update',
    summary: summaryToText(parsed.summary)
  };
};