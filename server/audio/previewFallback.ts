import path from 'path';
import fs from 'fs/promises';

const GINA_ROOT = process.env.GINA_ROOT || (process.platform === 'win32' ? 'C:\\Gina_AI' : process.cwd());
const AUDIO_ROOT = path.resolve(GINA_ROOT, 'media', 'unified_audio');

/**
 * Generates a clean 16-bit PCM WAV audio clip with an acoustic harmonic chime.
 * Used as a reliable fallback preview so Voice Database sounds are always immediately playable
 * even while local neural TTS weights are downloading or Python dependencies are repairing.
 */
export async function generateFallbackPreviewWav(voiceId: string, speakerName: string): Promise<{ url: string; path: string; bytes: number }> {
  await fs.mkdir(AUDIO_ROOT, { recursive: true });

  const filename = `preview_${voiceId.replace(/[^a-zA-Z0-9_-]/g, '_')}_sample.wav`;
  const filePath = path.join(AUDIO_ROOT, filename);

  const sampleRate = 44100;
  const durationSeconds = 1.8;
  const totalSamples = Math.floor(sampleRate * durationSeconds);

  // Derive distinctive harmonic base frequency from speaker name / voice ID
  let hash = 0;
  const str = `${speakerName || ''}:${voiceId || ''}`;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) & 0xffff;
  }
  const baseFreq = 220 + (hash % 240); // 220Hz - 460Hz range
  const thirdFreq = baseFreq * 1.2599; // Major third
  const fifthFreq = baseFreq * 1.4983; // Perfect fifth

  const numChannels = 1;
  const bytesPerSample = 2;
  const byteRate = sampleRate * numChannels * bytesPerSample;
  const blockAlign = numChannels * bytesPerSample;
  const dataSize = totalSamples * bytesPerSample;
  const buffer = Buffer.alloc(44 + dataSize);

  // 1. RIFF chunk descriptor
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);

  // 2. fmt sub-chunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // Subchunk1Size (16 for PCM)
  buffer.writeUInt16LE(1, 20);  // AudioFormat (1 for PCM)
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(16, 34); // BitsPerSample

  // 3. data sub-chunk
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  // Generate pleasant gentle chime waveform with smooth attack & exponential decay
  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    // Attack envelope: ramp up over 0.05s
    const attack = Math.min(1.0, t / 0.05);
    // Decay envelope: smooth natural ring-out
    const decay = Math.exp(-2.2 * t);
    const env = attack * decay;

    // Harmonic blend
    const wave = (
      0.55 * Math.sin(2 * Math.PI * baseFreq * t) +
      0.30 * Math.sin(2 * Math.PI * thirdFreq * t) +
      0.15 * Math.sin(2 * Math.PI * fifthFreq * t)
    );

    const sample = Math.max(-1.0, Math.min(1.0, wave * env * 0.7));
    const intSample = Math.floor(sample * 32767);
    buffer.writeInt16LE(intSample, 44 + i * 2);
  }

  await fs.writeFile(filePath, buffer);

  return {
    url: `/media/unified-audio/${filename}`,
    path: filePath,
    bytes: buffer.length
  };
}
