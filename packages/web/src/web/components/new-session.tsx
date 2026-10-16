import { useState } from "react";
import { UploadCloud, X, Loader2 } from "lucide-react";
import { client } from "../lib/api";
import { ACCEPTED_FILES, MAX_FILE_BYTES, fileSize, uploadSessionFile } from "../lib/session-upload";
import { useRefreshSessions } from "../queries/sessions";

export function NewSession({ onClose }: { onClose: () => void }) {
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState("");
  const [percent, setPercent] = useState(0);
  const [createdId, setCreatedId] = useState<number | null>(null);
  const [saved, setSaved] = useState<number[]>([]);
  const refresh = useRefreshSessions();
  function choose(incoming: File[]) {
    if (incoming.some(f => f.size > MAX_FILE_BYTES)) { setError("Each file must be 2 GB or smaller."); return; }
    setFiles(incoming); setError("");
  }
  return <section className="border border-primary/40 rounded-xl p-6 md:p-8 bg-card mb-8">
    <div className="flex justify-between gap-4 mb-6"><div><p className="font-mono text-xs text-primary mb-2">NEW SESSION</p><h2 className="text-2xl font-bold">Bring your project in.</h2></div><button disabled={busy} aria-label="Close new session" onClick={onClose} className="session-icon"><X className="size-5" /></button></div>
    <form onSubmit={async (e) => {
      e.preventDefault(); if (!files.length) { setError("Choose at least one project ZIP or audio export."); return; }
      setBusy(true); setError(""); const data = new FormData(e.currentTarget);
      try {
        let id = createdId;
        if (!id) {
          const created = await client.sessions.create({ title: String(data.get("title")).trim(), daw: String(data.get("daw")) as "ableton" | "logic" | "bandlab" | "other", bpm: data.get("bpm") ? Number(data.get("bpm")) : null, musicalKey: String(data.get("key") ?? ""), notes: String(data.get("notes") ?? "") });
          id = created.id; setCreatedId(id);
        }
        for (let i = 0; i < files.length; i++) {
          if (saved.includes(i)) continue;
          setProgress(`${i + 1} / ${files.length} · ${files[i].name}`); setPercent(0);
          await uploadSessionFile(id, files[i], setPercent);
          setSaved(prev => [...prev, i]);
        }
        await refresh(); onClose();
      } catch (e) { setError(e instanceof Error ? e.message : "Upload failed"); await refresh(); }
      finally { setBusy(false); }
    }}>
      <fieldset disabled={busy || Boolean(createdId)} className="grid sm:grid-cols-2 gap-4">
        <label className="session-label">Session name<input aria-label="title" name="title" required maxLength={200} placeholder="e.g. Midnight — vocal session" className="session-input" /></label>
        <label className="session-label">Source DAW<select aria-label="Source DAW" name="daw" className="session-input"><option value="ableton">Ableton Live</option><option value="logic">Logic Pro</option><option value="bandlab">BandLab</option><option value="other">Other DAW</option></select></label>
        <label className="session-label">Tempo (optional)<input aria-label="bpm" name="bpm" type="number" min={20} max={400} placeholder="120 BPM" className="session-input" /></label>
        <label className="session-label">Key (optional)<input aria-label="key" name="key" maxLength={20} placeholder="A minor" className="session-input" /></label>
        <label className="session-label sm:col-span-2">Notes (optional)<textarea aria-label="Notes" name="notes" maxLength={4000} rows={2} placeholder="Version, plugins used, what to finish next…" className="session-input resize-y" /></label>
      </fieldset>
      <div className={`relative border border-dashed border-border rounded-lg text-center p-8 mt-6 ${busy || createdId ? "pointer-events-none opacity-50" : "hover:border-primary"}`} onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); choose(Array.from(e.dataTransfer.files)); }}>
        <UploadCloud className="size-8 text-primary mx-auto mb-3" /><p className="font-semibold">Drop your project ZIP + audio exports</p><p className="text-xs text-muted-foreground mt-2">or click to browse · multiple files · up to 2 GB per file</p>
        <input disabled={busy || Boolean(createdId)} aria-label="Choose session files" type="file" multiple accept={ACCEPTED_FILES} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={e => choose(Array.from(e.target.files ?? []))} />
      </div>
      {files.length > 0 && <ul className="mt-4 text-sm space-y-2">{files.map((f, i) => <li key={i} className="flex gap-3 justify-between"><span className="break-all">{saved.includes(i) ? "Saved · " : ""}{f.name}</span><span className="text-muted-foreground whitespace-nowrap font-mono text-xs">{fileSize(f.size)}</span></li>)}</ul>}
      <p className="text-xs text-muted-foreground mt-4">Upload WAV/MP3 separately for listening. Files inside ZIPs are kept as an archive and aren’t extracted or played here.</p>
      {busy && <div className="mt-5"><output className="text-sm break-all">{progress} · {percent}%</output><div className="h-1.5 rounded bg-secondary mt-3"><div className="bg-primary h-full rounded transition-all" style={{ width: `${percent}%` }} /></div></div>}
      {error && <p role="alert" className="text-destructive text-sm mt-4">{error}{createdId ? " Your session and completed uploads are saved. Retry to resume the remaining files." : ""}</p>}
      <button disabled={busy} className="session-button mt-6">{busy ? <Loader2 className="size-4 animate-spin" /> : <UploadCloud className="size-4" />}{createdId ? "Retry remaining uploads" : "Create & upload session"}</button>
    </form>
  </section>;
}