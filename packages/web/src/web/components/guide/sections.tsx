import { useEffect, useState } from "react";
import { ArrowRight, Check, ChevronRight } from "lucide-react";
import { CHAINS, CHECKLIST, LOCATORS, ROUTES, TRACKS } from "../../lib/guide-data";

export function SectionHead({ index, kicker, title, children }: {
  index: string;
  kicker: string;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="grid gap-6 md:grid-cols-[120px_1fr] mb-12">
      <div className="font-mono text-xs text-muted-foreground pt-2">
        <span className="text-primary">{index}</span> / {kicker}
      </div>
      <div className="max-w-2xl">
        <h2 className="text-3xl md:text-5xl font-bold tracking-tight leading-[1.05]">{title}</h2>
        {children && <p className="mt-5 text-muted-foreground text-lg">{children}</p>}
      </div>
    </div>
  );
}

/** Mixer-style strip of every template track. */
export function TrackStrip() {
  return (
    <div className="overflow-x-auto pb-4 -mx-6 px-6">
      <div className="flex gap-2 min-w-max">
        {TRACKS.map((t, i) => (
          <div
            key={t.name}
            className="rise w-[104px] shrink-0 rounded-md border border-border bg-card flex flex-col"
            style={{ animationDelay: `${0.05 * i}s` }}
          >
            <div className="h-1.5 rounded-t-md" style={{ background: t.color }} />
            <div className="p-3 flex-1 flex flex-col">
              <span className="font-mono text-[10px] text-muted-foreground">{t.n}</span>
              <span className="mt-1 text-[13px] font-semibold leading-tight">{t.name}</span>
              <div className="mt-6 flex items-end gap-[3px] h-16">
                {[0, 1, 2, 3].map((b) => (
                  <span
                    key={b}
                    className="meter-bar w-full rounded-sm"
                    style={{
                      height: `${40 + ((i * 17 + b * 23) % 60)}%`,
                      background: t.color,
                      opacity: 0.25 + b * 0.18,
                      animationDelay: `${(i * 0.13 + b * 0.21) % 1.4}s`,
                    }}
                  />
                ))}
              </div>
              <span className="mt-4 font-mono text-[10px] uppercase text-muted-foreground">{t.type}</span>
              <span className="font-mono text-[10px] uppercase" style={{ color: t.color }}>{t.group}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Arrangement lane with proportional locator blocks. */
export function LocatorLane() {
  const total = LOCATORS.reduce((s, l) => s + l.bars, 0);
  let bar = 1;
  return (
    <div className="rounded-lg border border-border bg-card p-4 md:p-6">
      <div className="flex font-mono text-[10px] text-muted-foreground mb-2">
        <span>BAR 1</span>
        <span className="ml-auto">BAR {total + 1}</span>
      </div>
      <div className="flex h-20 gap-[2px] overflow-hidden rounded">
        {LOCATORS.map((l) => {
          const start = bar;
          bar += l.bars;
          const chorus = l.name.toLowerCase().includes("chorus");
          return (
            <div
              key={l.name}
              className="relative flex flex-col justify-between p-2 min-w-0"
              style={{
                flex: l.bars,
                background: chorus ? "rgba(255,138,61,0.18)" : "#1C1C24",
                borderTop: `2px solid ${chorus ? "#FF8A3D" : "#3a3a48"}`,
              }}
            >
              <span className="text-[11px] font-semibold truncate">{l.name}</span>
              <span className="font-mono text-[10px] text-muted-foreground">{start}</span>
            </div>
          );
        })}
      </div>
      <p className="mt-4 text-sm text-muted-foreground">
        Add these as Locators in Arrangement View, then drag them to fit the song. Bar counts are a
        starting point, not a rule. Having named sections from the start means you never face an
        empty arrangement.
      </p>
    </div>
  );
}

/** Tabbed device chain viewer — each device renders as a rack slot. */
export function ChainViewer() {
  const [active, setActive] = useState(CHAINS[0].id);
  const chain = CHAINS.find((c) => c.id === active) ?? CHAINS[0];
  return (
    <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
      <div className="flex lg:flex-col gap-1 overflow-x-auto">
        {CHAINS.map((c) => (
          <button
            key={c.id}
            onClick={() => setActive(c.id)}
            className={`text-left px-4 py-3 rounded-md text-sm font-medium whitespace-nowrap transition-colors flex items-center justify-between gap-3 ${
              c.id === active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-card hover:text-foreground"
            }`}
          >
            {c.label}
            <ChevronRight className="size-4 hidden lg:block opacity-60" />
          </button>
        ))}
      </div>
      <div key={chain.id}>
        <p className="text-lg mb-6 max-w-2xl rise">{chain.summary}</p>
        <div className="flex flex-col md:flex-row md:flex-wrap gap-3 items-stretch">
          {chain.devices.map((d, i) => (
            <div key={d.name} className="flex md:items-center gap-3 rise" style={{ animationDelay: `${i * 0.06}s` }}>
              <div
                className={`rounded-md border bg-card p-4 md:w-[250px] h-full ${
                  d.tag ? "border-primary/60" : "border-border"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-[10px] text-muted-foreground">SLOT {i + 1}</span>
                  {d.tag && (
                    <span className="font-mono text-[10px] uppercase text-primary">{d.tag}</span>
                  )}
                </div>
                <div className="mt-2 font-semibold">{d.name}</div>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{d.detail}</p>
              </div>
              {i < chain.devices.length - 1 && (
                <ArrowRight className="size-4 text-muted-foreground shrink-0 hidden md:block" />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function RouteCards() {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {ROUTES.map((r) => (
        <div key={r.id} className="rounded-lg border border-border bg-card p-6 flex flex-col">
          <div className="flex items-center gap-3 text-lg font-bold">
            <span style={{ color: r.fromColor }}>{r.from}</span>
            <ArrowRight className="size-5 text-primary" />
            <span style={{ color: r.toColor }}>{r.to}</span>
          </div>
          <ol className="mt-6 space-y-4">
            {r.steps.map((s, i) => (
              <li key={i} className="grid grid-cols-[28px_1fr] gap-2 text-sm leading-relaxed">
                <span className="font-mono text-xs text-primary pt-0.5">{String(i + 1).padStart(2, "0")}</span>
                <span className="text-foreground/85">{s}</span>
              </li>
            ))}
          </ol>
        </div>
      ))}
    </div>
  );
}

const STORAGE_KEY = "finish-song-checklist";

/** Persisted finish-a-song checklist. */
export function FinishChecklist() {
  const [done, setDone] = useState<boolean[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw) as boolean[];
    } catch {
      /* ignore */
    }
    return CHECKLIST.map(() => false);
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(done));
  }, [done]);

  const count = done.filter(Boolean).length;

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <div className="px-6 py-4 border-b border-border flex items-center gap-4">
        <span className="font-mono text-xs text-muted-foreground">
          {count}/{CHECKLIST.length} DONE
        </span>
        <div className="flex-1 h-1 rounded bg-secondary overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-500"
            style={{ width: `${(count / CHECKLIST.length) * 100}%` }}
          />
        </div>
        <button
          onClick={() => setDone(CHECKLIST.map(() => false))}
          className="font-mono text-xs text-muted-foreground hover:text-primary"
        >
          RESET
        </button>
      </div>
      <ul>
        {CHECKLIST.map((item, i) => (
          <li key={item}>
            <button
              onClick={() => setDone((d) => d.map((v, j) => (j === i ? !v : v)))}
              className="w-full flex items-center gap-4 px-6 py-4 text-left border-b border-border last:border-0 hover:bg-secondary/50 transition-colors"
            >
              <span
                className={`size-5 rounded border flex items-center justify-center shrink-0 transition-colors ${
                  done[i] ? "bg-primary border-primary" : "border-muted-foreground/50"
                }`}
              >
                {done[i] && <Check className="size-3.5 text-primary-foreground" strokeWidth={3} />}
              </span>
              <span className={`transition-colors ${done[i] ? "text-muted-foreground line-through" : ""}`}>
                {item}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
