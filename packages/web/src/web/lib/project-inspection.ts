export interface ProjectInfo { creator: string; tracks: string[]; returns: number; references: number }
export async function inspectAls(file: File): Promise<ProjectInfo> {
  if (file.size > 10 * 1024 ** 2) throw new Error('ALS inspection limit is 10 MB. The project can still be uploaded.');
  const bytes = new Uint8Array(await file.arrayBuffer());
  const stream = bytes[0] === 31 && bytes[1] === 139 ? file.stream().pipeThrough(new DecompressionStream('gzip')) : file.stream();
  const reader = stream.getReader();
  const parts: Uint8Array[] = []; let length = 0;
  while (true) { const chunk = await reader.read(); if (chunk.done) break; length += chunk.value.byteLength; if (length > 32 * 1024 ** 2) { await reader.cancel(); throw new Error('Expanded ALS exceeds the 32 MB inspection limit.'); } parts.push(chunk.value); }
  const all = new Uint8Array(length); let at = 0; for (const part of parts) { all.set(part,at); at += part.length; }
  const xml = new TextDecoder().decode(all);
  if (/<!DOCTYPE|<!ENTITY/i.test(xml)) throw new Error('Unsupported XML declarations.');
  const doc = new DOMParser().parseFromString(xml,'application/xml');
  if (doc.querySelector('parsererror') || doc.documentElement.tagName !== 'Ableton') throw new Error('Could not read this Ableton set.');
  const tracks = Array.from(doc.querySelector('LiveSet > Tracks')?.children ?? []);
  return { creator: doc.documentElement.getAttribute('Creator') || 'Ableton Live', tracks: tracks.filter(t => ['AudioTrack','MidiTrack','GroupTrack'].includes(t.tagName)).map(t => t.querySelector('Name > EffectiveName')?.getAttribute('Value') || t.tagName), returns: tracks.filter(t => t.tagName === 'ReturnTrack').length, references: doc.querySelectorAll('SampleRef').length };
}