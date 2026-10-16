import { AlertTriangle } from "lucide-react";
import {
  ChainViewer,
  FinishChecklist,
  LocatorLane,
  RouteCards,
  SectionHead,
  TrackStrip,
} from "../components/guide/sections";

const NAV = [
  { href: "#template", label: "Template" },
  { href: "#arrangement", label: "Arrangement" },
  { href: "#chains", label: "Device chains" },
  { href: "#cross-daw", label: "Cross-DAW" },
  { href: "#checklist", label: "Checklist" },
];

export default function GuidePage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center gap-8">
          <a href="#top" className="font-bold tracking-tight flex items-center gap-2">
            <span className="size-2.5 rounded-full bg-primary" />
            Finish the Song
          </a>
          <nav className="hidden md:flex gap-6 text-sm text-muted-foreground">
            {NAV.map((n) => (
              <a key={n.href} href={n.href} className="hover:text-foreground transition-colors">
                {n.label}
              </a>
            ))}
          </nav>
          <a href="/alignment" className="ml-auto text-sm text-primary">Align vocals</a>
          <a href="/companion" className=" text-sm text-muted-foreground hidden lg:block">Mac remote</a>
          <a href="/sessions" className=" text-sm font-semibold text-primary whitespace-nowrap">My sessions</a>
          <span className="font-mono text-[11px] text-muted-foreground hidden sm:block">
            ABLETON LIVE 12 · MAC
          </span>
        </div>
      </header>

      <main id="top">
        {/* Hero */}
        <section className="relative overflow-hidden grain border-b border-border">
          <div
            className="absolute -right-40 -top-40 size-[640px] rounded-full opacity-30 blur-3xl pointer-events-none"
            style={{ background: "radial-gradient(circle, #FF8A3D 0%, transparent 65%)" }}
          />
          <div className="relative max-w-6xl mx-auto px-6 pt-24 pb-20 md:pt-32 md:pb-28">
            <p className="rise font-mono text-xs text-primary tracking-widest">
              ABLETON TEMPLATE + BANDLAB / LOGIC WORKFLOW
            </p>
            <h1
              className="rise mt-6 text-5xl md:text-7xl lg:text-8xl font-extrabold tracking-tight leading-[0.95] max-w-4xl"
              style={{ animationDelay: "0.1s" }}
            >
              Stop building sessions.
              <br />
              <span className="text-primary">Start finishing songs.</span>
            </h1>
            <p
              className="rise mt-8 text-lg md:text-xl text-muted-foreground max-w-2xl"
              style={{ animationDelay: "0.2s" }}
            >
              One Ableton Live template you build once and reuse on every song, with transient
              shaping, your Xvox vocal chain and three shared returns already set up. Plus a simple
              way to move ideas between BandLab and Logic without anything drifting out of time.
            </p>
            <div className="rise mt-10 flex flex-wrap gap-3" style={{ animationDelay: "0.3s" }}>
              <a
                href="#template"
                className="px-6 py-3 rounded-md bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors"
              >
                Build the template
              </a>
              <a
                href="#cross-daw"
                className="px-6 py-3 rounded-md border border-border font-semibold hover:bg-card transition-colors"
              >
                Cross-DAW workflow
              </a>
            </div>
            <div
              className="rise mt-16 grid grid-cols-3 max-w-lg gap-6 font-mono"
              style={{ animationDelay: "0.4s" }}
            >
              {[
                ["14", "tracks + returns"],
                ["10", "named sections"],
                ["~15", "min to build once"],
              ].map(([n, l]) => (
                <div key={l}>
                  <div className="text-3xl font-medium text-foreground">{n}</div>
                  <div className="text-[11px] text-muted-foreground uppercase mt-1">{l}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Template */}
        <section id="template" className="max-w-6xl mx-auto px-6 py-24 scroll-mt-14">
          <SectionHead index="01" kicker="SESSION" title="The track layout">
            Build these top to bottom, color them by group, and put Drums and Vocals in Group Tracks so
            the mixer fits on a laptop screen.
          </SectionHead>
          <TrackStrip />
          <div className="mt-10 rounded-lg border border-primary/40 bg-primary/5 p-6 grid md:grid-cols-[auto_1fr] gap-4">
            <span className="font-mono text-xs text-primary pt-0.5">MAKE IT DEFAULT</span>
            <p className="text-sm text-foreground/85 leading-relaxed">
              Once it's built: <b>File › Save Live Set As Template…</b>, then in the browser's{" "}
              <b>Templates</b> section right-click it and choose <b>Set Default Live Set</b>. Every new
              project now opens with this layout. (Older Live versions keep this under Preferences ›
              File/Folder.)
            </p>
          </div>
        </section>

        {/* Arrangement */}
        <section id="arrangement" className="border-y border-border bg-card/40 scroll-mt-14">
          <div className="max-w-6xl mx-auto px-6 py-24">
            <SectionHead index="02" kicker="ARRANGEMENT" title="Name the sections first">
              Most unfinished songs stall on an 8-bar loop. Set up the song structure before you write.
            </SectionHead>
            <LocatorLane />
          </div>
        </section>

        {/* Chains */}
        <section id="chains" className="max-w-6xl mx-auto px-6 py-24 scroll-mt-14">
          <SectionHead index="03" kicker="DEVICE CHAINS" title="What goes on each track">
            Live doesn't have a device called "Transient Shaper". Drum Buss's Transients knob is the
            built-in one. For more precise control, add the Transient Machines pack or a free Max for
            Live shaper.
          </SectionHead>
          <ChainViewer />
        </section>

        {/* Cross DAW */}
        <section id="cross-daw" className="border-y border-border bg-card/40 scroll-mt-14">
          <div className="max-w-6xl mx-auto px-6 py-24">
            <SectionHead index="04" kicker="CROSS-DAW" title="BandLab ↔ Ableton ↔ Logic">
              These apps can't open each other's projects or share one interface. Every handoff is
              stems + MIDI + a note of the tempo and key.
            </SectionHead>
            <RouteCards />
            <div className="mt-8 rounded-lg border border-destructive/40 bg-destructive/5 p-6 flex gap-4">
              <AlertTriangle className="size-5 text-destructive shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold">What causes drift in every handoff</div>
                <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                  Tempo and start point. Match the tempo <i>before</i> importing. Drop every stem at
                  bar 1, beat 1. In Live, turn off Auto-Warp Long Samples (Settings › Record, Warp &
                  Launch) so full-length stems play back unchanged. Only nudge a stem if you can
                  actually hear drift.
                </p>
              </div>
            </div>
            <div className="mt-4 grid md:grid-cols-3 gap-4 text-sm">
              {[
                ["BandLab", "Sketch ideas on your phone, away from the rig."],
                ["Ableton", "Arrange and mix here. Your template, transient chain and Xvox live here."],
                ["Logic", "Only when you need a Logic-only instrument or plugin."],
              ].map(([k, v]) => (
                <div key={k} className="rounded-md border border-border p-4">
                  <div className="font-mono text-[11px] text-primary uppercase">{k}</div>
                  <div className="mt-1 text-foreground/85">{v}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Checklist */}
        <section id="checklist" className="max-w-6xl mx-auto px-6 py-24 scroll-mt-14">
          <SectionHead index="05" kicker="FINISH" title="The finish-a-song checklist">
            Tick them off as you go. Your progress saves in this browser.
          </SectionHead>
          <FinishChecklist />
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="max-w-6xl mx-auto px-6 py-10 flex flex-wrap gap-4 justify-between font-mono text-[11px] text-muted-foreground">
          <span>FINISH THE SONG · ABLETON TEMPLATE GUIDE</span>
          <span>Xvox is a Nuro Audio product. Ableton, Logic and BandLab are trademarks of their owners.</span>
        </div>
      </footer>
    </div>
  );
}
