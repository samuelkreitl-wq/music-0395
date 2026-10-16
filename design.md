# Release Hub — Design

A single-artist release command center: track every song from BandLab sketch → DistroKid submission → Spotify/SoundCloud live → SoundBetter listing, with a promo checklist per release and real SoundCloud upload where the API allows it. Web only. Visual direction: dark studio console — near-black canvas, warm amber accent, monospace metadata, dense but breathable rows like a mixer channel strip.

## Brand & Colors

Tokens live as CSS variables in `packages/web/src/web/styles.css`. Dark is the default and only mode (studio tool, always dark).

| Token | Value | Use |
|-------|-------|-----|
| background | #0B0B0D | Page canvas |
| card | #14141A | Cards, rows, panels |
| elevated | #1C1C24 | Hover, inputs, nested surfaces |
| foreground | #F5F3EF | Primary text |
| mutedForeground | #8A8A99 | Metadata, labels |
| border | #262630 | Hairlines |
| primary | #FF8A3D | Amber accent — CTAs, active state, progress |
| success | #4ADE80 | Live / done status |
| pending | #FACC15 | In-progress status |
| destructive | #F0553F | Errors, delete |

Platform accent chips: BandLab #FF3C3C, DistroKid #22C55E, Spotify #1DB954, SoundCloud #FF5500, SoundBetter #3B82F6.

## Typography

- **Display/headings**: Sora (600/700) — geometric, slightly technical.
- **Body/UI**: Sora 400/500.
- **Metadata, IDs, dates, status codes**: JetBrains Mono 400 — reinforces the console feel.

Loaded from Google Fonts in `index.html`. Hierarchy through weight and size, generous line-height (1.6 body).

## Layout

- Fixed left rail (72px icons + labels on desktop) with: Releases, Promote, Connections. Content area max-width 1200px, left-aligned not centered.
- Release list = channel-strip rows: cover thumb, title block, then a horizontal run of 5 platform status chips, then release date. Rows are the primary interaction target.
- Release detail = two columns: left is metadata + artwork, right is the platform pipeline (5 stacked platform cards, each with status select + link field + notes) and the promo checklist below.
- Density over decoration: no big empty hero, no card grid of equal squares.

## Components

- **StatusChip** — platform-colored dot + mono label (`NOT STARTED` / `IN PROGRESS` / `SUBMITTED` / `LIVE`).
- **PlatformCard** — platform name, status dropdown, URL input, note textarea, and (SoundCloud only) an Upload action.
- **PromoTask** — checkbox row with task label and optional due date.
- **ProgressMeter** — thin amber bar showing how many of the 5 platforms reached a terminal state.

## Pages

- **Auth** (`pages/auth.tsx`) — single page, Google sign-in button + email/password tabs. Dark, centered, one-column, amber CTA.
- **Releases** (`pages/index.tsx`) — list of releases + "New release" inline form; empty state explains the pipeline.
- **Release detail** (`pages/release.tsx`) — pipeline + promo checklist for one release.
- **Connections** (`pages/connections.tsx`) — SoundCloud OAuth connect/disconnect, plus an honest panel stating which platforms have no automation API (DistroKid, SoundBetter, Spotify artist posting) and what stays manual.

## Key User Flows

1. Sign in → Releases list → "New release" (title, artist, release date) → row appears with all 5 platforms at NOT STARTED.
2. Open a release → set each platform's status + paste its link as the release moves forward → progress meter fills.
3. Connections → connect SoundCloud (OAuth) → back in a release, upload the audio file straight to SoundCloud, which writes the resulting permalink into the SoundCloud platform card automatically.
4. Promo checklist per release: seeded with standard tasks (playlist pitch, socials post, ad campaign) that can be checked off and extended.

## Architecture

- API: oRPC procedures in `src/api/routes/` — `releases`, `platforms`, `promo`, `soundcloud`. All procedures are `authed` and filter by `context.user.id`.
- Auth: Better Auth + Runable managed auth (Google) + email/password.
- DB: Drizzle/Turso — `releases`, `releasePlatforms`, `promoTasks`, `soundcloudAccounts`.
- SoundCloud: OAuth 2.1 code flow + `PUT /tracks` upload. Requires the user's own registered SoundCloud app credentials in `.env` (`SOUNDCLOUD_CLIENT_ID`/`SOUNDCLOUD_CLIENT_SECRET`); UI degrades to a clear "not configured" state without them.

## Sessions library (approved extension)

Private `/sessions` page using existing dark/amber console identity. Public guide stays accessible. Google or email/password sign-in protects all session data. A session has DAW, title, BPM/key/notes, and multiple original-project/archive/audio files. Native projects are stored only; individual WAV/MP3/M4A exports get native browser playback, not a multitrack DAW engine. Files go directly to Tigris via presigned URLs; database access and signed downloads filter on session ownership. Upload progress, retry/error feedback, expandable session rows, confirm-before-delete. Attachments' vocal-cleanup spec retained as future roadmap, no neural/ARA processing promised.

## Ableton remote — approved first version
Expo iPhone/iPad app + Electron Mac companion. Dark studio-console look: charcoal panels, amber active controls, teal confirmed connection, large touch targets. Screens: Connect (pair code), Mixer (track banks, transport), Clips (real slot names/status), Play (pads/keyboard via optional virtual MIDI), Devices (exposed parameters), Takes (local microphone recording/share/upload). Desktop `/companion` starts/stops a token-authenticated relay bridge and displays pairing code and actual AbletonOSC health. Cloud-mediated polling is not sample-accurate/low-latency performance transport. Never show fabricated DAW feedback; controls disabled without recent Live feedback. Pairing codes expire, access tokens never logged, commands expire and queue bounded. Connection records are ephemeral and reset on server restart. Mac companion uses OSC only on loopback UDP 11000/11001. MIDI uses native optional @julusian/midi virtual port; unavailable platforms show MIDI unavailable. Future: Logic/BandLab adapters and standalone stem workspace. Vocal-cleanup attached spec is future only.

## Vocal alignment — approved companion timing stage
Shared Electron renderer at `/alignment`, also accessible as a browser test preview. Original DSP, not a Max device or Waves integration. Charcoal/amber workbench: compact navigation, two stacked waveform lanes (teal lead, amber backing), timing readout and right-side analysis/export controls. Overall offset only; no phrase warping or pitch changes. Synthetic fixture explicitly labelled. Analysis local, cloud storage only on explicit Save WAV to Sessions. WAV export preserves decoded sample rate/channel count; file decoder may normalize source format. Preview A/B at a shared playback position. Reject silent/ambiguous analysis; manual nudge allowed. Expose edge cropping/padding and native Mac testing limitations.

## DAW project handoff tabs
Sessions gains public Ableton / Logic / BandLab tabs above account library. One active DAW drives the upload default and filtered project list. Each tab has a three-step preserve-project → render-in-source-DAW → import-audio handoff, official documentation and explicit no-auto-render warning. Session detail separates project archives and audio exports, provides direct saved-WAV lead/backing selection into the existing alignment lab. Archives remain intact; no extraction or remote DAW execution. Local ALS inspection lists actual track names and referenced-file count without uploading until user submits.
