export type Daw = 'ableton' | 'logic' | 'bandlab';
export const DAW_LABELS = { ableton: 'Ableton Live', logic: 'Logic Pro', bandlab: 'BandLab' };
const STEPS: Record<Daw, { title: string; text: string }[]> = {
  ableton: [
    { title: 'Keep the whole project', text: 'In Live, use Collect All and Save. ZIP the project folder with its Samples folder, then upload it below. An .als file stores the set, not its audio.' },
    { title: 'Render in Ableton', text: 'Choose the same Arrangement start/end for every track. File → Export Audio/Video → All Individual Tracks (or Selected Tracks Only). Use WAV and disable normalization. For dry alignment vocals, bypass vocal effects and leave return/master effects off. Export a separate wet set if needed.' },
    { title: 'Bring the WAVs back', text: 'Open your saved session and add the exported WAVs together. Pick a lead and backing below to open alignment. Keep Warp off when importing aligned audio back into Live.' },
  ],
  logic: [
    { title: 'Keep the whole project', text: 'Save with audio assets included, then compress the project folder or .logicx package on your Mac. Upload the ZIP; the browser cannot render the Logic project.' },
    { title: 'Render in Logic', text: 'File → Export → All Tracks as Audio Files. Use WAV with a common start/end and normalization off. Choose whether to bypass effect plug-ins and include volume/pan automation; export dry vocals for alignment. Bus/aux processing may require separate bounces in Logic.' },
    { title: 'Bring the WAVs back', text: 'Add the rendered WAVs to the same saved session. Select the lead and backing for alignment. Return the aligned output to the same timeline origin in Logic.' },
  ],
  bandlab: [
    { title: 'Keep your BandLab revision', text: 'Save the revision in BandLab. This app does not fetch cloud projects or sign into BandLab. Upload any project backup you already have, or create a session with exported tracks.' },
    { title: 'Export in BandLab', text: 'Open the project in BandLab Studio on the web. Use each track’s three-dot menu → Export as Audio/MIDI. Choose audio for rendered tracks. Check the exports against the mix for effects and timing; use a common timeline origin and WAV vocals for alignment.' },
    { title: 'Bring the audio back', text: 'Add the exported tracks together to your BandLab session here. ZIPs are stored, not unpacked: upload the audio files separately for playback and WAV alignment.' },
  ],
};
const SOURCES = { ableton: 'https://help.ableton.com/hc/en-us/articles/360000843404-Importing-and-exporting-stems', logic: 'https://support.apple.com/guide/logicpro/export-tracks-as-audio-files-lgcp9b1f4fb0/mac', bandlab: 'https://help.bandlab.com/hc/en-us/articles/115002959774-Downloading-Mixdowns-and-Tracks' };
export function DawWorkflow({ daw, onChange }: { daw: Daw; onChange: (d: Daw) => void }) {
  return <section className="mb-9 border border-border rounded-lg overflow-hidden bg-card">
    <div className="flex border-b border-border" role="tablist" aria-label="Project DAW">{(Object.keys(DAW_LABELS) as Daw[]).map(d => <button key={d} role="tab" id={`tab-${d}`} aria-controls="daw-workflow" aria-selected={d === daw} onClick={() => onChange(d)} className={`flex-1 py-4 text-sm font-semibold border-b-2 ${d === daw ? 'text-primary border-primary bg-primary/5' : 'text-muted-foreground border-transparent'}`}>{DAW_LABELS[d]}</button>)}</div>
    <div id="daw-workflow" role="tabpanel" aria-labelledby={`tab-${daw}`} className="p-5 md:p-7"><p className="font-mono text-xs text-primary mb-5">PROJECT → RENDER IN {DAW_LABELS[daw].toUpperCase()} → IMPORT STEMS</p><div className="grid md:grid-cols-3 gap-7">{STEPS[daw].map((s,i) => <div key={s.title}><span className="font-mono text-xs text-muted-foreground">0{i+1}</span><h2 className="text-sm font-semibold my-2">{s.title}</h2><p className="text-xs text-muted-foreground leading-relaxed">{s.text}</p></div>)}</div><div className="border-t border-border mt-6 pt-4 flex flex-wrap gap-3 justify-between text-xs"><p className="text-muted-foreground">Rendering stays in the source DAW. No automatic extraction, plug-in hosting or project execution.</p><a href={SOURCES[daw]} target="_blank" rel="noreferrer" className="text-primary">Export documentation ↗</a></div></div>
  </section>;
}