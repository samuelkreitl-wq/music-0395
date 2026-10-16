import { useState } from "react";
import { Link } from "wouter";
import { ChevronDown, FolderOpen, Loader2, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { authClient } from "../lib/auth";
import { client } from "../lib/api";
import { useRefreshSessions, useSessions } from "../queries/sessions";
import { SessionAuth } from "../components/session-auth";
import { NewSession } from "../components/new-session";
import { AddSessionFiles, SessionFileRow } from "../components/session-files";
import { fileSize } from "../lib/session-upload";

const COLORS: Record<string, string> = { ableton: "#ff8a3d", logic: "#a3a3ff", bandlab: "#f0553f", other: "#8a8a99" };
const LABELS: Record<string, string> = { ableton: "Ableton Live", logic: "Logic Pro", bandlab: "BandLab", other: "Other DAW" };

function Library() {
  const sessions = useSessions();
  const refresh = useRefreshSessions();
  const [create, setCreate] = useState(false);
  const [open, setOpen] = useState<number | null>(null);
  const [filter, setFilter] = useState("all");
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState("");
  const rows = sessions.data?.filter(s => filter === "all" || s.daw === filter) ?? [];
  return <>
    <div className="flex items-center justify-between gap-4 mb-8">
      <div className="flex flex-wrap gap-2">{["all", "ableton", "logic", "bandlab", "other"].map(d => <button key={d} onClick={() => setFilter(d)} className={`px-3 py-2 text-xs rounded border transition-colors ${d === filter ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground"}`}>{d === "all" ? "All sessions" : LABELS[d]}</button>)}</div>
      <button onClick={() => setCreate(true)} className="session-button whitespace-nowrap"><Plus className="size-4" />New session</button>
    </div>
    {create && <NewSession onClose={() => setCreate(false)} />}
    {sessions.isPending && <div className="py-20 flex gap-3 justify-center text-muted-foreground"><Loader2 className="size-5 animate-spin" />Loading your sessions…</div>}
    {sessions.isError && <div role="alert" className="p-6 border border-destructive/40 rounded-lg text-destructive">{sessions.error.message}<button onClick={() => sessions.refetch()} className="session-button secondary ml-4">Retry</button></div>}
    {error && <p role="alert" className="text-destructive mb-4">{error}</p>}
    {!sessions.isPending && !sessions.isError && rows.length === 0 && <div className="border border-dashed border-border rounded-xl p-12 md:p-20 text-center"><FolderOpen className="size-10 mx-auto text-primary mb-5" /><h2 className="text-2xl font-bold">{filter === "all" ? "Every project. One place." : "No sessions from this DAW yet."}</h2><p className="text-muted-foreground max-w-md mx-auto mt-3">Keep the original project safe alongside the audio you can listen to. Upload your first session to start.</p><button onClick={() => setCreate(true)} className="session-button mt-6"><Plus className="size-4" />Upload a session</button></div>}
    <div className="space-y-3">{rows.map(s => <article key={s.id} className="border border-border rounded-lg bg-card overflow-hidden">
      <button className="w-full p-5 flex gap-4 items-center text-left hover:bg-secondary/40" onClick={() => setOpen(open === s.id ? null : s.id)} aria-expanded={open === s.id}>
        <div className="size-11 rounded flex items-center justify-center shrink-0" style={{ background: `${COLORS[s.daw]}18`, color: COLORS[s.daw] }}><FolderOpen className="size-5" /></div>
        <div className="min-w-0 flex-1"><h2 className="font-semibold truncate">{s.title}</h2><p className="text-xs text-muted-foreground mt-1">{LABELS[s.daw]}{s.bpm ? ` · ${s.bpm} BPM` : ""}{s.musicalKey ? ` · ${s.musicalKey}` : ""}</p></div>
        <div className="hidden sm:block text-right"><p className="text-xs font-mono">{s.files.length} FILES</p><p className="text-xs text-muted-foreground">{fileSize(s.files.reduce((n, f) => n + f.size, 0))}</p></div>
        <ChevronDown className={`size-4 text-muted-foreground transition-transform ${open === s.id ? "rotate-180" : ""}`} />
      </button>
      {open === s.id && <div className="border-t border-border px-5 md:px-8 pt-5 pb-6">
        {s.notes && <p className="text-sm text-muted-foreground whitespace-pre-wrap mb-5">{s.notes}</p>}
        <p className="text-xs font-mono text-muted-foreground mb-2">PROJECT FILES & AUDIO EXPORTS</p>
        {s.files.map(f => <SessionFileRow key={f.id} file={f} />)}
        {s.files.length === 0 && <p className="text-sm text-muted-foreground py-4">No files saved yet. Add your project archive and audio below.</p>}
        <AddSessionFiles sessionId={s.id} />
        <div className="mt-6 pt-4 border-t border-border flex justify-between items-center gap-4 text-xs text-muted-foreground"><span>Created {new Date(s.createdAt).toLocaleDateString()}</span><button disabled={busy === s.id} className="flex gap-2 items-center hover:text-destructive disabled:opacity-50" onClick={async () => {
          if (!window.confirm(`Permanently delete “${s.title}” and all its files?`)) return;
          setBusy(s.id); setError("");
          try { await client.sessions.remove({ id: s.id }); await refresh(); }
          catch (e) { setError(e instanceof Error ? e.message : "Delete failed"); }
          finally { setBusy(null); }
        }}><Trash2 className="size-3.5" />Delete session</button></div>
      </div>}
    </article>)}</div>
  </>;
}

export default function SessionsPage() {
  const { data: session, isPending } = authClient.useSession();
  const [authError, setAuthError] = useState("");
  return <div className="min-h-screen">
    <header className="border-b border-border"><div className="max-w-6xl mx-auto px-6 h-16 flex items-center gap-6"><Link href="/" className="font-bold flex items-center gap-2"><span className="size-2.5 rounded-full bg-primary" />Finish the Song</Link><Link href="/" className="text-sm text-muted-foreground hidden sm:block">Guide</Link><span className="text-sm text-primary">Sessions</span>{session && <button onClick={async () => { const result = await authClient.signOut(); if (result.error) setAuthError(result.error.message ?? "Sign out failed"); }} className="ml-auto text-xs text-muted-foreground hover:text-primary">Sign out</button>}</div></header>
    <main className="max-w-6xl mx-auto px-6 py-12 md:py-16">
      <p className="font-mono text-xs text-primary tracking-widest mb-4">YOUR PRIVATE PROJECT LIBRARY</p>
      <h1 className="text-4xl md:text-6xl font-bold tracking-tight">From every DAW.<br /><span className="text-primary">All together.</span></h1>
      <p className="text-muted-foreground mt-5 mb-8 max-w-2xl">Store your Ableton, Logic and BandLab work, then listen to your exported stems and mixes. Original sessions stay intact for reopening in their source DAW.</p>
      <div className="grid md:grid-cols-3 gap-3 mb-10">{[
        ["Ableton Live", "Collect All and Save in Live, then ZIP the whole project folder with its Samples. An .als file alone doesn’t include external audio."],
        ["Logic Pro", "Save with audio assets included, then compress the project folder or .logicx package on your Mac. Upload that ZIP."],
        ["BandLab", "Export your mix and individual tracks. Upload those audio files here; this site doesn’t log into BandLab or fetch cloud sessions."],
      ].map(([title, text]) => <div key={title} className="border border-border rounded-lg p-5"><h2 className="font-semibold text-sm mb-2">{title}</h2><p className="text-xs text-muted-foreground leading-relaxed">{text}</p></div>)}</div>
      <p className="flex gap-2 text-xs text-muted-foreground mb-8"><ShieldCheck className="size-4 shrink-0 text-primary" />Private account storage · WAV/MP3 recommended for playback · No DAW plugin hosting or vocal-cleanup processing yet</p>
      {authError && <p role="alert" className="text-destructive">{authError}</p>}
      {isPending ? <div className="py-12 flex items-center gap-3 text-muted-foreground"><Loader2 className="size-5 animate-spin" />Checking sign-in…</div> : session ? <Library /> : <SessionAuth />}
    </main>
  </div>;
}