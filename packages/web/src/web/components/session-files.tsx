import { useState } from "react";
import { Download, FileAudio, FileArchive, Loader2, Play, Trash2, Upload } from "lucide-react";
import { client } from "../lib/api";
import { ACCEPTED_FILES, fileSize, uploadSessionFile } from "../lib/session-upload";
import { useAudioUrl, useRefreshSessions } from "../queries/sessions";

type SessionFile = { id: number; name: string; size: number; contentType: string | null };

function AudioPreview({ fileId }: { fileId: number }) {
  const audio = useAudioUrl(fileId, true);
  if (audio.isPending) return <p className="text-xs text-muted-foreground py-4">Loading audio…</p>;
  if (audio.isError) return <p role="alert" className="text-xs text-destructive py-4">{audio.error.message}</p>;
  return <div className="mt-3"><audio aria-label="Uploaded audio preview" controls preload="metadata" src={audio.data.url} className="w-full" onError={(e) => {
    const note = e.currentTarget.nextElementSibling; if (note) note.textContent = "This audio format cannot play in this browser. Download it, or export WAV/MP3 from your DAW.";
  }}><track kind="captions" /></audio><p className="text-xs text-muted-foreground mt-2">Individual file playback. Stems are not mixed or synchronized here.</p></div>;
}

export function SessionFileRow({ file }: { file: SessionFile }) {
  const [preview, setPreview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const refresh = useRefreshSessions();
  const audio = /\.(wav|mp3|m4a|aiff?|flac|ogg)$/i.test(file.name);
  return <div className="border-b border-border last:border-0 py-4">
    <div className="flex items-center gap-3">
      {audio ? <FileAudio className="size-5 text-primary shrink-0" /> : <FileArchive className="size-5 text-muted-foreground shrink-0" />}
      <div className="min-w-0 flex-1"><p className="text-sm break-all">{file.name}</p><p className="text-xs font-mono text-muted-foreground">{fileSize(file.size)} · {audio ? "AUDIO EXPORT" : "PROJECT / FILE"}</p></div>
      {audio && <button aria-label={`Preview ${file.name}`} title="Listen" onClick={() => setPreview(!preview)} className="session-icon"><Play className="size-4" /></button>}
      <button disabled={busy} aria-label={`Download ${file.name}`} className="session-icon" onClick={async () => {
        setBusy(true); setError("");
        try { const { url } = await client.sessions.downloadUrl({ fileId: file.id }); const a = document.createElement("a"); a.href = url; a.download = file.name; a.click(); }
        catch (e) { setError(e instanceof Error ? e.message : "Download failed"); }
        finally { setBusy(false); }
      }}><Download className="size-4" /></button>
      <button disabled={busy} aria-label={`Delete ${file.name}`} className="session-icon hover:text-destructive" onClick={async () => {
        if (!window.confirm(`Permanently delete ${file.name}?`)) return;
        setBusy(true); setError("");
        try { await client.sessions.removeFile({ fileId: file.id }); await refresh(); }
        catch (e) { setError(e instanceof Error ? e.message : "Delete failed"); }
        finally { setBusy(false); }
      }}><Trash2 className="size-4" /></button>
    </div>
    {preview && <AudioPreview fileId={file.id} />}
    {error && <p role="alert" className="text-destructive text-xs mt-2">{error}</p>}
  </div>;
}

export function AddSessionFiles({ sessionId }: { sessionId: number }) {
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const refresh = useRefreshSessions();
  return <div className="mt-5">
    <label className={`session-button secondary inline-flex ${busy ? "opacity-50 pointer-events-none" : "cursor-pointer"}`}>
      {busy ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />} Add project or audio files
      <input aria-label="Add files to session" type="file" multiple accept={ACCEPTED_FILES} disabled={busy} className="sr-only" onChange={async (e) => {
        const files = Array.from(e.target.files ?? []); e.target.value = "";
        setBusy(true); setError("");
        try { for (const file of files) { setProgress(`${file.name} · preparing`); await uploadSessionFile(sessionId, file, (p) => setProgress(`${file.name} · ${p}%`)); } setProgress("All files saved."); }
        catch (e) { setError(e instanceof Error ? e.message : "Upload failed"); }
        finally { await refresh(); setBusy(false); }
      }} />
    </label>
    {progress && <output className="block text-xs text-muted-foreground mt-3 break-all">{progress}</output>}
    {error && <p role="alert" className="text-sm text-destructive mt-3">{error} Files already saved remain in this session. Add the failed file again to retry.</p>}
  </div>;
}