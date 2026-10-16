import { useState } from 'react';
import { client } from '../lib/api';
import { authClient } from '../lib/auth';
import { uploadSessionFile } from '../lib/session-upload';
import { useRefreshSessions, useSessions } from '../queries/sessions';
import { encodeWav, type Stem } from '../lib/alignment';
import { SessionAuth } from './session-auth';

function SavePanel({ stem, shiftMs }: { stem: Stem; shiftMs: number }) {
  const sessions = useSessions(), refresh = useRefreshSessions();
  const [selected, setSelected] = useState('');
  const [busy, setBusy] = useState(false), [progress, setProgress] = useState(0);
  const [error, setError] = useState(''), [saved, setSaved] = useState<{ url: string; shift: number; name: string } | null>(null);
  const [newId, setNewId] = useState<number | null>(null);
  return <div className="space-y-4">
    <label className="session-label">Save destination<select aria-label="Save destination" className="session-input" value={selected} disabled={busy} onChange={e => setSelected(e.target.value)}><option value="">New alignment session</option>{sessions.data?.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}</select></label>
    {sessions.isError && <p className="text-xs text-destructive">Could not load Sessions: {sessions.error.message}</p>}
    <button className="session-button w-full" disabled={busy || sessions.isPending} onClick={async () => {
      setBusy(true); setError(''); setSaved(null); setProgress(0);
      try {
        let id = selected ? Number(selected) : newId;
        if (!id) {
          const created = await client.sessions.create({ title: `Vocal alignment · ${stem.name.replace(/\.wav$/i, '')}`, daw: 'ableton', notes: 'Original global-offset alignment. No pitch correction or phrase warping. Import at the same timeline origin with Warp off.' });
          if (!created) throw new Error('Session creation failed.');
          id = created.id; setNewId(id);
        }
        const name = `${stem.name.replace(/\.wav$/i, '')}-aligned-${shiftMs.toFixed(1)}ms.wav`;
        await uploadSessionFile(id, new File([encodeWav(stem)], name, { type: 'audio/wav' }), setProgress);
        await refresh();
        const rows = await client.sessions.list();
        const file = rows.find(s => s.id === id)?.files.filter(f => f.name === name).sort((a,b) => b.id - a.id)[0];
        if (!file) throw new Error('File uploaded; open Sessions to download it.');
        const { url } = await client.sessions.downloadUrl({ fileId: file.id });
        setSaved({ url, shift: shiftMs, name });
      } catch (e) { setError(e instanceof Error ? e.message : 'Save failed'); }
      finally { setBusy(false); }
    }}>{busy ? `Saving WAV · ${progress}%` : 'Save aligned WAV to Sessions'}</button>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {saved && <output className="block text-sm text-green-400">Saved at {saved.shift.toFixed(1)} ms. <button disabled={busy} className="underline block mt-2 cursor-pointer" onClick={async () => {
      setBusy(true); setError('');
      try {
        const response = await fetch(saved.url);
        if (!response.ok) throw new Error('Download link expired. Download from Sessions.');
        const blobUrl = URL.createObjectURL(await response.blob());
        const anchor = document.createElement('a'); anchor.href = blobUrl; anchor.download = saved.name;
        document.body.append(anchor); anchor.click(); anchor.remove();
        setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
      } catch (e) { setError(e instanceof Error ? e.message : 'Download failed'); }
      finally { setBusy(false); }
    }}>Download saved WAV</button><span className="text-xs text-muted-foreground block mt-1">Link expires in 10 minutes. Sessions keeps the file.</span></output>}
  </div>;
}

export function AlignmentExport({ stem, shiftMs }: { stem: Stem; shiftMs: number }) {
  const { data: session } = authClient.useSession();
  return <section className="border-t border-border pt-6 mt-6"><h3 className="font-semibold mb-2">Keep the aligned take</h3><p className="text-xs text-muted-foreground mb-5">32-bit float WAV · {stem.sampleRate / 1000} kHz · {stem.channels.length} channel{stem.channels.length > 1 ? 's' : ''}. Uploads only the aligned backing, not the lead. Import at the original start with Warp off.</p>{session ? <SavePanel stem={stem} shiftMs={shiftMs} /> : <><p className="text-xs text-muted-foreground mb-4">Analysis and audition are local. Sign in to save the output privately to Sessions.</p><SessionAuth /></>}</section>;
}