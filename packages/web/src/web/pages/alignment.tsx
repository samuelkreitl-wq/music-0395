import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'wouter';
import { ArrowLeft, AudioLines, Play, Square, Upload, FlaskConical } from 'lucide-react';
import { analyzeOffset, decodeWav, envelope, shiftStem, testStems, type AlignmentResult, type Stem } from '../lib/alignment';
import { AlignmentExport } from '../components/alignment-export';
import { useDesktop } from '../hooks/use-desktop';

function WaveLane({ stem, label, color, shift = 0, total }: { stem: Stem | null; label: string; color: string; shift?: number; total: number }) {
  const bars = useMemo(() => {
    if (!stem) return [];
    const env = envelope(stem), max = Math.max(...env, 0.001);
    const count = 360, length = stem.channels[0]!.length / stem.sampleRate;
    return Array.from({ length: count }, (_, i) => {
      const time = i / count * total - shift / 1000;
      const index = Math.floor(time / length * env.length);
      const v = index >= 0 && index < env.length ? env[index]! / max : 0;
      return { x: i / count * 1000, height: v * 68 };
    });
  }, [stem, shift, total]);
  return <div className="align-lane"><div className="flex items-center gap-3 mb-3"><span className="font-mono text-[10px] tracking-widest" style={{ color }}>{label}</span><span className="text-xs text-muted-foreground truncate">{stem?.name ?? 'No stem loaded'}</span></div><svg viewBox="0 0 1000 100" preserveAspectRatio="none" className="w-full h-24" aria-label={`${label} amplitude envelope`}><path d="M0 50H1000" stroke="#30303a" />{bars.map((b,i) => <path key={i} d={`M${b.x} ${50-b.height/2}v${b.height || 1}`} stroke={color} strokeWidth="1.7" opacity={b.height ? 0.9 : 0.2} />)}</svg></div>;
}

export default function AlignmentPage() {
  const desktop = useDesktop();
  const [lead, setLead] = useState<Stem | null>(null), [backing, setBacking] = useState<Stem | null>(null);
  const [result, setResult] = useState<AlignmentResult | null>(null);
  const [shift, setShift] = useState(0), [strength, setStrength] = useState(100);
  const [mode, setMode] = useState<'original' | 'aligned'>('original');
  const [synthetic, setSynthetic] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [playing, setPlaying] = useState(false), [position, setPosition] = useState(0);
  const ctx = useRef<AudioContext | null>(null), sources = useRef<AudioBufferSourceNode[]>([]);
  const started = useRef(0), from = useRef(0);
  const applied = shift * strength / 100;
  const aligned = useMemo(() => backing ? shiftStem(backing, applied) : null, [backing, applied]);
  const duration = Math.max(lead ? lead.channels[0]!.length / lead.sampleRate : 0, backing ? backing.channels[0]!.length / backing.sampleRate : 0, 8);
  const stop = () => { sources.current.forEach(s => { try { s.stop(); } catch { /* already ended */ } }); sources.current = []; setPlaying(false); };
  const play = async (nextMode = mode, at = position) => {
    if (!lead || !backing || !aligned) return;
    stop(); const context = ctx.current ?? new AudioContext(); ctx.current = context; await context.resume();
    const start = context.currentTime + 0.035; started.current = start; from.current = at;
    for (const stem of [lead, nextMode === 'aligned' ? aligned : backing]) {
      if (at >= stem.channels[0]!.length / stem.sampleRate) continue;
      const buffer = context.createBuffer(stem.channels.length, stem.channels[0]!.length, stem.sampleRate);
      stem.channels.forEach((c,i) => buffer.copyToChannel(new Float32Array(c), i));
      const source = context.createBufferSource(), gain = context.createGain(); gain.gain.value = 0.45;
      source.buffer = buffer; source.connect(gain).connect(context.destination); source.start(start, at); sources.current.push(source);
    }
    setPlaying(true);
  };
  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(() => { const pos = from.current + Math.max(0, (ctx.current?.currentTime ?? 0) - started.current); setPosition(Math.min(pos, duration)); if (pos >= duration) { sources.current = []; setPlaying(false); setPosition(0); } }, 50);
    return () => clearInterval(timer);
  }, [playing, duration]);
  useEffect(() => () => { sources.current.forEach(s => { try { s.stop(); } catch { /* ended */ } }); void ctx.current?.close(); }, []);
  const reset = () => { stop(); setPosition(0); setResult(null); setShift(0); setStrength(100); setError(''); };
  const load = async (file: File | undefined, role: 'lead' | 'backing') => {
    if (!file) return;
    setBusy(true); reset();
    try { if (file.size > 100 * 1024 ** 2) throw new Error('Maximum WAV size: 100 MB.'); const stem = decodeWav(await file.arrayBuffer(), file.name); if (role === 'lead') setLead(stem); else setBacking(stem); setSynthetic(false); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not read WAV'); }
    finally { setBusy(false); }
  };
  return <div className="min-h-screen grain">
    <header className="border-b border-border bg-background"><div className="max-w-7xl mx-auto px-5 md:px-8 h-16 flex gap-5 items-center"><Link href="/companion" className="text-muted-foreground" aria-label="Back to companion"><ArrowLeft className="size-4" /></Link><Link href="/" className="font-semibold text-sm">Finish the Song</Link><span className="text-xs text-primary ml-auto">Vocal alignment</span><Link href="/sessions" className="text-xs text-muted-foreground">Sessions</Link></div></header>
    <main className="max-w-7xl mx-auto px-5 md:px-8 py-10 md:py-14">
      <div className="flex flex-wrap gap-6 justify-between items-end mb-9"><div><p className="font-mono text-[11px] tracking-widest text-primary mb-3">COMPANION LAB / 01 · GLOBAL TIMING</p><h1 className="text-4xl md:text-6xl font-bold tracking-tight">One lead.<br/>A tighter stack.</h1><p className="text-sm text-muted-foreground mt-5 max-w-xl">Find the overall timing difference between a lead and a double or harmony. Shift the backing without changing its pitch.</p></div><button className="session-button secondary" disabled={busy} onClick={() => { reset(); const stems = testStems(); setLead(stems.lead); setBacking(stems.backing); setSynthetic(true); }}><FlaskConical className="size-4" />Load test audio</button></div>
      <div className="flex flex-wrap gap-x-6 gap-y-2 font-mono text-[10px] text-muted-foreground border-y border-border py-3 mb-7"><span>{desktop ? 'ELECTRON COMPANION RENDERER' : 'BROWSER TEST PREVIEW · NOT AN INSTALLED MAC APP'}</span><span>NO PITCH CORRECTION</span><span>NO PHRASE WARPING</span><span>NOT A MAX FOR LIVE DEVICE</span></div>
      {synthetic && <p className="text-xs text-primary mb-5 border-l-2 border-primary pl-3">Synthetic harmonic bursts: backing is 180 ms late and pitched a major third above the lead. This tests offset correction, not real-vocal quality.</p>}
      {error && <p role="alert" className="text-sm text-destructive mb-5">{error}</p>}
      <div className="grid lg:grid-cols-[minmax(0,1fr)_320px] gap-6">
        <section className="min-w-0"><div className="flex flex-wrap gap-3 mb-5">{(['lead','backing'] as const).map(role => <label key={role} className="session-button secondary cursor-pointer"><Upload className="size-4" />{role === 'lead' ? 'Load lead WAV' : 'Load backing WAV'}<input aria-label={role === 'lead' ? 'Lead WAV file' : 'Backing WAV file'} type="file" accept=".wav,audio/wav" className="sr-only" disabled={busy} onChange={e => { void load(e.target.files?.[0], role); e.target.value = ''; }} /></label>)}</div>
          <div className="border border-border bg-card rounded-lg overflow-hidden relative"><div className="px-5 pt-4 font-mono text-[10px] text-muted-foreground flex justify-between">{[0,1,2,3,4].map(i => <span key={i}>{(i*duration/4).toFixed(1)}s</span>)}</div><WaveLane stem={lead} label="01 / LEAD REFERENCE" color="#67d5c6" total={duration} /><WaveLane stem={backing} label={`02 / BACKING · ${mode.toUpperCase()}`} color="#ff8a3d" shift={mode === 'aligned' ? applied : 0} total={duration} /><div className="px-5 pb-5"><input aria-label="Playback position" type="range" min="0" max={duration} step="0.01" value={position} className="w-full accent-primary" onChange={e => { stop(); setPosition(Number(e.target.value)); }} /></div></div>
          <div className="border border-border bg-card mt-4 p-4 rounded-lg flex flex-wrap items-center gap-3"><button aria-label={playing ? 'Stop audition' : 'Play audition'} className="session-button" disabled={!lead || !backing} onClick={() => { if (playing) stop(); else void play().catch(e => setError(String(e))); }}>{playing ? <Square className="size-4" /> : <Play className="size-4" />}{playing ? 'Stop' : 'Audition'}</button><div className="inline-flex border border-border rounded p-1">{(['original','aligned'] as const).map(m => <button key={m} aria-pressed={mode === m} className={`px-3 py-2 text-xs rounded ${mode === m ? 'bg-secondary text-primary' : 'text-muted-foreground'}`} onClick={() => { setMode(m); if (playing) void play(m).catch(e => setError(String(e))); }}>{m === 'original' ? 'Original' : 'Aligned'}</button>)}</div><span className="font-mono text-xs text-muted-foreground ml-auto">{position.toFixed(1)} / {duration.toFixed(1)}s</span></div>
          <p className="text-xs text-muted-foreground mt-4">A/B plays lead + backing at the same position, at reduced gain. Waveforms show amplitude envelopes, not pitch. Different sample rates keep their source rate on export; playback may resample to your audio device.</p>
          <div className="mt-8 border-t border-border pt-5 text-xs text-muted-foreground leading-relaxed"><h2 className="text-sm font-semibold text-foreground mb-2">Bring clean, related stems</h2>Export both from the same timeline origin. Mono/stereo PCM or 32-bit float WAV; up to 120 seconds and 100 MB each. Dry vocals work best. Room noise, effects, different phrasing and repeated patterns can defeat this simple overall-offset analysis. Native Mac packaging, real vocals and Live testing are still pending.</div>
        </section>
        <aside className="border border-border rounded-lg bg-card p-5 h-fit"><div className="flex gap-2 items-center font-mono text-xs mb-5"><AudioLines className="size-4 text-primary" />TIMING ENGINE</div><button className="session-button w-full" disabled={!lead || !backing || busy} onClick={() => { stop(); setError(''); if (!lead || !backing) return; const r = analyzeOffset(lead, backing); setResult(r); setShift(r.accepted ? -r.offsetMs : 0); setStrength(100); }}>Analyze overall offset</button>
          <div className="mt-6 mb-5"><p className="text-[10px] font-mono text-muted-foreground">APPLIED BACKING SHIFT</p><div className="font-mono text-4xl mt-2" data-testid="applied-offset">{applied > 0 ? '+' : ''}{applied.toFixed(1)}<span className="text-sm text-muted-foreground ml-2">ms</span></div><p className="text-xs text-muted-foreground mt-2">Negative = earlier · positive = later</p></div>
          {result && <output className={`block text-xs border-l-2 pl-3 mb-5 ${result.accepted ? 'border-green-400' : 'border-destructive'}`}><p className="font-mono mb-2">{result.accepted ? 'MATCH FOUND' : 'AUTO SHIFT REJECTED'} · r={result.score.toFixed(2)}</p>{result.reason}<p className="text-muted-foreground mt-2">Estimate: backing {Math.abs(result.offsetMs).toFixed(0)} ms {result.offsetMs >= 0 ? 'late' : 'early'} · ±1000 ms search · 5 ms resolution. Not a confidence probability.</p></output>}
          <label className="session-label mb-4">Manual shift (ms)<input className="session-input" type="number" aria-label="Manual shift (ms)" min="-1000" max="1000" step="1" value={shift} disabled={!backing} onChange={e => { stop(); setShift(Math.max(-1000,Math.min(1000, Number(e.target.value)))); }} /></label>
          <label className="session-label">Timing strength · {strength}%<input type="range" aria-label="Timing strength" min="0" max="100" value={strength} disabled={!backing} className="accent-primary" onChange={e => { stop(); setStrength(Number(e.target.value)); }} /></label>
          <p className="text-[11px] text-muted-foreground mt-4">One sample shift for the whole file. Length stays fixed: shifted-out edges are cropped and vacated edges padded with silence. Harmonies keep every note.</p>
          {aligned && <AlignmentExport key={backing?.name} stem={aligned} shiftMs={applied} />}
        </aside>
      </div>
    </main>
  </div>;
}