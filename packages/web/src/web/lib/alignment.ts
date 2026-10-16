export interface Stem { name: string; sampleRate: number; channels: Float32Array[] }
export interface AlignmentResult { offsetMs: number; score: number; separation: number; accepted: boolean; reason: string }
const BIN_MS = 5;

export function envelope(stem: Stem) {
  const hop = Math.max(1, Math.round(stem.sampleRate * BIN_MS / 1000));
  const length = stem.channels[0]?.length ?? 0;
  const result = new Float32Array(Math.ceil(length / hop));
  for (let b = 0; b < result.length; b++) {
    let power = 0;
    const end = Math.min(length, (b + 1) * hop);
    for (const channel of stem.channels) for (let i = b * hop; i < end; i++) power += (channel[i] ?? 0) ** 2;
    result[b] = Math.sqrt(power / Math.max(1, (end - b * hop) * stem.channels.length));
  }
  return result;
}

/** Positive lag means the backing is late. Envelopes ignore fundamental pitch. */
export function analyzeOffset(lead: Stem, backing: Stem, windowMs = 1000): AlignmentResult {
  const a = envelope(lead), b = envelope(backing);
  const fail = (reason: string): AlignmentResult => ({ offsetMs: 0, score: 0, separation: 0, accepted: false, reason });
  if (Math.min(a.length, b.length) < 100) return fail('Use at least half a second of audio.');
  const rms = (x: Float32Array) => Math.sqrt(x.reduce((s, v) => s + v * v, 0) / x.length);
  if (rms(a) < 0.0003 || rms(b) < 0.0003) return fail('Audio is silent or too quiet for reliable analysis.');
  const limit = Math.round(windowMs / BIN_MS);
  const scores: { lag: number; score: number }[] = [];
  for (let lag = -limit; lag <= limit; lag++) {
    const start = Math.max(0, -lag), end = Math.min(a.length, b.length - lag);
    const n = end - start;
    if (n < Math.min(a.length, b.length) * 0.7) continue;
    let sa = 0, sb = 0, aa = 0, bb = 0, ab = 0;
    for (let i = start; i < end; i++) { const x = a[i]!, y = b[i + lag]!; sa += x; sb += y; aa += x * x; bb += y * y; ab += x * y; }
    const va = aa - sa * sa / n, vb = bb - sb * sb / n;
    const score = va > 1e-8 && vb > 1e-8 ? (ab - sa * sb / n) / Math.sqrt(va * vb) : 0;
    scores.push({ lag, score });
  }
  scores.sort((x, y) => y.score - x.score);
  const best = scores[0];
  if (!best) return fail('Not enough overlapping audio in the search window.');
  const rival = scores.find(x => Math.abs(x.lag - best.lag) > 12);
  const separation = best.score - (rival?.score ?? 0);
  const edge = Math.abs(best.lag) >= limit - 1;
  const accepted = best.score >= 0.55 && separation >= 0.035 && !edge;
  return { offsetMs: best.lag * BIN_MS, score: best.score, separation, accepted,
    reason: edge ? 'Best match reaches the search boundary. Check the start points manually.' : accepted ? 'A distinct overall timing match was found. Listen before saving.' : 'No reliable unique match. Use a manual nudge or try cleaner, related stems.' };
}

/** Fixed-length integer sample translation. Vacated edges are zero; moved-out audio is cropped. */
export function shiftStem(stem: Stem, shiftMs: number): Stem {
  const shift = Math.round(shiftMs * stem.sampleRate / 1000);
  return { ...stem, channels: stem.channels.map(input => {
    const output = new Float32Array(input.length);
    const start = Math.max(0, -shift), end = Math.min(input.length, input.length - shift);
    if (end > start) output.set(input.subarray(start, end), start + shift);
    return output;
  }) };
}

/** IEEE float WAV avoids quantization/clipping of the decoded samples. */
export function encodeWav(stem: Stem): ArrayBuffer {
  const count = stem.channels.length, frames = stem.channels[0]?.length ?? 0;
  const bytes = frames * count * 4;
  const buffer = new ArrayBuffer(56 + bytes), view = new DataView(buffer);
  const text = (at: number, s: string) => { for (let i = 0; i < s.length; i++) view.setUint8(at + i, s.charCodeAt(i)); };
  text(0, 'RIFF'); view.setUint32(4, 48 + bytes, true); text(8, 'WAVE'); text(12, 'fmt ');
  view.setUint32(16, 16, true); view.setUint16(20, 3, true); view.setUint16(22, count, true);
  view.setUint32(24, stem.sampleRate, true); view.setUint32(28, stem.sampleRate * count * 4, true);
  view.setUint16(32, count * 4, true); view.setUint16(34, 32, true);
  text(36, 'fact'); view.setUint32(40, 4, true); view.setUint32(44, frames, true);
  text(48, 'data'); view.setUint32(52, bytes, true);
  for (let i = 0; i < frames; i++) for (let c = 0; c < count; c++) view.setFloat32(56 + (i * count + c) * 4, stem.channels[c]![i]!, true);
  return buffer;
}

export function decodeWav(buffer: ArrayBuffer, name: string): Stem {
  const v = new DataView(buffer);
  const text = (at: number, n: number) => String.fromCharCode(...new Uint8Array(buffer, at, n));
  if (buffer.byteLength < 44 || text(0, 4) !== 'RIFF' || text(8, 4) !== 'WAVE') throw new Error('Use a PCM or float WAV file. Export other formats to WAV in your DAW.');
  let format = 0, count = 0, sampleRate = 0, bits = 0, block = 0, offset = 0, bytes = 0;
  for (let at = 12; at + 8 <= buffer.byteLength;) {
    const size = v.getUint32(at + 4, true), body = at + 8;
    if (body + size > buffer.byteLength) throw new Error('Truncated WAV file.');
    if (text(at, 4) === 'fmt ' && size >= 16) {
      format = v.getUint16(body, true); count = v.getUint16(body + 2, true); sampleRate = v.getUint32(body + 4, true); block = v.getUint16(body + 12, true); bits = v.getUint16(body + 14, true);
      if (format === 65534 && size >= 40) format = v.getUint16(body + 24, true);
    }
    if (text(at, 4) === 'data') { offset = body; bytes = size; }
    at = body + size + (size % 2);
  }
  if (!offset || !count || count > 2 || sampleRate < 8000 || sampleRate > 192000 || block !== count * bits / 8 || !((format === 1 && [8,16,24,32].includes(bits)) || (format === 3 && bits === 32))) throw new Error('Supported: mono/stereo PCM 8/16/24/32-bit or float 32-bit WAV, 8–192 kHz.');
  const frames = Math.floor(bytes / block);
  if (frames / sampleRate > 120) throw new Error('First-stage limit: 120 seconds per stem. Export a shorter passage.');
  const channels = Array.from({ length: count }, () => new Float32Array(frames));
  for (let i = 0; i < frames; i++) for (let c = 0; c < count; c++) {
    const at = offset + i * block + c * bits / 8;
    let value = 0;
    if (format === 3) value = v.getFloat32(at, true);
    else if (bits === 8) value = (v.getUint8(at) - 128) / 128;
    else if (bits === 16) value = v.getInt16(at, true) / 32768;
    else if (bits === 32) value = v.getInt32(at, true) / 2147483648;
    else { let n = v.getUint8(at) | v.getUint8(at + 1) << 8 | v.getUint8(at + 2) << 16; if (n & 0x800000) n -= 0x1000000; value = n / 8388608; }
    if (!Number.isFinite(value)) throw new Error('WAV contains invalid samples.');
    channels[c]![i] = value;
  }
  return { name, sampleRate, channels };
}

/** Synthetic harmonic bursts, not a recorded voice or a real-vocal quality benchmark. */
export function testStems(offsetMs = 180): { lead: Stem; backing: Stem } {
  const sampleRate = 48000, length = sampleRate * 8;
  const make = (frequency: number) => {
    const channel = new Float32Array(length);
    const phrases = [[0.4,0.37],[1.08,0.23],[1.63,0.48],[2.6,0.3],[3.13,0.57],[4.2,0.25],[4.75,0.44],[5.8,0.62],[6.77,0.33]];
    for (let i = 0; i < length; i++) { const t = i / sampleRate; let amp = 0;
      for (const [start, duration] of phrases) if (t >= start! && t < start! + duration!) amp = Math.sin(Math.PI * (t - start!) / duration!) ** 2;
      channel[i] = amp * (Math.sin(2 * Math.PI * frequency * t) * 0.27 + Math.sin(2 * Math.PI * frequency * 2 * t) * 0.08);
    }
    return channel;
  };
  const lead = { name: 'SYNTHETIC lead.wav', sampleRate, channels: [make(196)] };
  const backing = shiftStem({ name: 'SYNTHETIC harmony +180ms.wav', sampleRate, channels: [make(246.94), make(246.94)] }, offsetMs);
  return { lead, backing };
}