# Music Center — Foundation and First Milestone

## Product direction

The first milestone is an original vocal-alignment device running inside Ableton Live, not a remote-control screen presented as a plugin. The music center grows around that device: Mac processing/management, mobile remote, private project storage, then additional DAW and release workflows.

Existing guide, Sessions library and remote source remain intact. Do not delete or rewrite them merely to change the product direction.

## Delivery boundary

This Runable project uses Bun, React, Hono, Expo and Electron. It can implement the music-center app and Mac companion. It does not build native Max for Live devices on this platform. Earlier offers to deliver a Max patch here should not be treated as a working device commitment.

The in-Live device requires a separate Max development environment on the user's Mac, Max for Live availability, and testing in Live 11/12. No .amxd or native vocal-alignment engine has been built or validated in this project.

## First milestone: a verified vocal-alignment vertical slice

### User workflow

1. Choose a lead vocal as the reference.
2. Choose one backing take and label it Double or Harmony.
3. Analyze a bounded region offline; leave the source recordings untouched.
4. Preview the proposed timing alignment with bypass and adjustable strength.
5. For a Double, optionally match its pitch to the reference where reliable voiced pitch exists.
6. For a Harmony, preserve its original melody and interval by default. Do not force its notes onto the lead.
7. Render a separate aligned audio file for use in Live, retaining the original.

Start with one reference and one backing take. Multi-track stacks, multiple references and automatic region editing come after this slice is audibly verified.

### Responsibilities

| Component | Responsibility | Status |
|---|---|---|
| Max for Live device | In-Live track/region selection, controls, reference assignment, preview and device-state persistence | Separate native development required |
| Local processing engine | Audio decoding, timing analysis, bounded warp, voiced pitch analysis/correction, rendering | Not implemented |
| Electron Mac companion | Future local processing coordination, job state and file handoff | Remote companion source exists; alignment integration not implemented |
| Expo mobile remote | Remote transport/mixer, later device controls and job feedback | Preview and simulated-protocol tests exist; actual Mac/Live tests outstanding |
| Sessions library | Original project archives and exported audio; private download/listening | Upload/download workflow tested |

### Audio constraints

- Alignment is offline, not zero-latency real-time processing.
- Do not perform model inference, file access or long analysis on the DAW audio thread.
- Timing edits must use a pitch-preserving time-stretch method; changing playback rate alone is not acceptable.
- Limit timing warps and leave low-confidence regions unchanged or flag them for review.
- Pitch correction must distinguish voiced notes from consonants, breath and silence.
- Separate Double and Harmony behavior. Harmonies must not silently collapse into unison.
- Preserve sample rate, channel count and timeline offsets in the interchange contract.
- Report rendered-file latency/offsets explicitly before reinsertion.
- Select processing dependencies only after checking license, redistribution and Mac support; do not promise Waves-equivalent quality.

### Acceptance gate before growing the music center

- Opens as a real Max for Live device in the target Live version.
- Captures or imports the intended reference and backing region without missing audio assets.
- An audibly late double becomes tighter without obvious syllable smearing.
- Double pitch matching improves intended unison notes while retaining unvoiced material.
- Harmony mode preserves intentional notes and intervals.
- Bypass and original-versus-rendered comparison work at matched levels.
- Cancel/retry does not change or overwrite source audio.
- Session save/reopen restores assignments and settings.
- Tested with real vocals on the user's Mac; simulated command tests do not count as DSP or hardware validation.

## Growth sequence

1. Native device and one-reference/one-take alignment verified on Mac.
2. Local companion integration and reliable job/file handoff.
3. Multiple backing takes, region controls, quality review and export history.
4. Mobile control of verified device parameters; low-latency local transport evaluated separately from the existing cloud relay.
5. Logic integration through its supported interfaces; Max for Live devices do not run inside Logic.
6. BandLab through supported file interchange/MIDI mappings, without implying full cloud-session or plugin access.
7. Release management and promotion through verified integrations; paid actions remain separately authorized.

## What is deliberately not promised

No Waves Sync Vx code or proprietary engine, no ARA support in Live, no universal plugin hosting across DAWs, no live iPhone microphone stream, and no native device claimed to be tested from this Linux sandbox.

## Next required checkpoint

Establish the Mac's Live version and Max for Live availability, then implement and test the native vertical slice in that separate environment. Until that happens, the current app remains a companion foundation—not the requested installed vocal-alignment device.