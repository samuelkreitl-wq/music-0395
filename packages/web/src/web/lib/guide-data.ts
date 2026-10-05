/** Content for the Ableton song template + cross-DAW guide page. */

export type Track = {
  n: string;
  name: string;
  type: string;
  group: string;
  color: string;
};

export const TRACKS: Track[] = [
  { n: "01", name: "KICK", type: "Audio / MIDI", group: "Drums", color: "#F0553F" },
  { n: "02", name: "SNARE / CLAP", type: "Audio / MIDI", group: "Drums", color: "#F0553F" },
  { n: "03", name: "HATS / PERC", type: "Audio / MIDI", group: "Drums", color: "#F0553F" },
  { n: "04", name: "DRUM BUS", type: "Group", group: "Drums", color: "#F0553F" },
  { n: "05", name: "BASS", type: "MIDI / Audio", group: "Low end", color: "#FF8A3D" },
  { n: "06", name: "CHORDS / KEYS", type: "MIDI", group: "Harmony", color: "#FACC15" },
  { n: "07", name: "LEAD SYNTH", type: "MIDI", group: "Harmony", color: "#FACC15" },
  { n: "08", name: "LEAD VOX", type: "Audio", group: "Vocals", color: "#3B82F6" },
  { n: "09", name: "DOUBLE / ADLIB", type: "Audio", group: "Vocals", color: "#3B82F6" },
  { n: "10", name: "BGV / HARMONY", type: "Audio", group: "Vocals", color: "#3B82F6" },
  { n: "11", name: "FX / RISERS", type: "Audio / MIDI", group: "FX", color: "#A78BFA" },
  { n: "A", name: "REVERB", type: "Return", group: "Returns", color: "#8A8A99" },
  { n: "B", name: "DELAY", type: "Return", group: "Returns", color: "#8A8A99" },
  { n: "C", name: "SATURATION", type: "Return", group: "Returns", color: "#8A8A99" },
];

export const LOCATORS = [
  { name: "Intro", bars: 8 },
  { name: "Verse 1", bars: 16 },
  { name: "Pre", bars: 8 },
  { name: "Chorus 1", bars: 16 },
  { name: "Verse 2", bars: 16 },
  { name: "Pre 2", bars: 8 },
  { name: "Chorus 2", bars: 16 },
  { name: "Bridge", bars: 8 },
  { name: "Final Chorus", bars: 16 },
  { name: "Outro", bars: 8 },
];

export type Device = { name: string; detail: string; tag?: string };
export type Chain = { id: string; label: string; summary: string; devices: Device[] };

export const CHAINS: Chain[] = [
  {
    id: "drums",
    label: "Drums",
    summary:
      "Punch before tone. Clean each hit, then shape transients on the bus so the whole kit hits together.",
    devices: [
      {
        name: "EQ Eight",
        detail: "On each hit. High-pass what isn't needed, cut mud around 200–400 Hz.",
      },
      {
        name: "Compressor (punch mode)",
        detail:
          "Slow-ish attack (10–30 ms) so the front of the hit gets through before gain reduction. Ratio ~4:1, medium release. A fast attack does the opposite: it flattens the hit.",
      },
      {
        name: "Drum Buss",
        tag: "Transient control",
        detail:
          "On the DRUM BUS group. The Transients knob is Live's built-in transient shaper: turn it up for more attack, down for a softer hit. Add a little Drive for glue. Leave Crunch off unless you want a lo-fi sound.",
      },
      {
        name: "Sharper option",
        tag: "Optional",
        detail:
          "For a dedicated transient shaper: Ableton's Transient Machines pack (the Impact device does multiband attack/sustain), or the free 36db Transient Shaper Saturator Max for Live device.",
      },
      {
        name: "Send → C Saturation",
        detail: "Parallel grit without eating headroom on the bus itself.",
      },
    ],
  },
  {
    id: "bass",
    label: "Bass",
    summary: "Solid on big speakers and still audible on phone speakers.",
    devices: [
      { name: "EQ Eight", detail: "High-pass at 30–40 Hz to remove rumble you can't hear anyway." },
      { name: "Compressor", detail: "Gentle glue, 3:1, so the note levels stay even." },
      {
        name: "Saturator",
        detail: "Soft Clip, low drive. Adds harmonics so small speakers can reproduce the bass line.",
      },
    ],
  },
  {
    id: "music",
    label: "Chords / Synths",
    summary: "Make room for the vocal instead of fighting it.",
    devices: [
      { name: "EQ Eight", detail: "Gentle dip at 2–4 kHz where the vocal needs to cut through." },
      { name: "Sends → A / B", detail: "Reverb and delay via returns. Keep the dry signal louder than the wet." },
    ],
  },
  {
    id: "vox",
    label: "Lead Vox",
    summary: "Your Nuro Audio Xvox does most of the work here. Keep the chain around it simple.",
    devices: [
      {
        name: "Utility (gain)",
        detail: "Get a steady input level first. Channel strips like Xvox respond best to consistent gain-staging.",
      },
      {
        name: "Transient shave",
        tag: "Optional",
        detail:
          "A light Compressor before Xvox (0–2 ms attack, fast release, 2:1) trims the sharp front of each syllable. Useful for rap or percussive delivery.",
      },
      {
        name: "Nuro Audio Xvox / Xvox Pro",
        tag: "Your plugin",
        detail:
          "Your main channel strip: gate, tone, compression, space. Use its compressor as your main vocal dynamics control and don't stack another heavy one after it.",
      },
      { name: "EQ Eight", detail: "Only surgical cuts after Xvox, like a harsh resonance or a boomy note." },
      {
        name: "Sends → A / B",
        detail: "Reverb and delay stay on returns so you can automate the wet amount per section.",
      },
    ],
  },
  {
    id: "bgv",
    label: "BGV / Adlibs",
    summary: "Same chain as the lead, pushed further back.",
    devices: [
      { name: "Same as Lead Vox", detail: "Copy the lead chain, then adjust from there." },
      { name: "EQ Eight", detail: "High-pass higher, 150–200 Hz, so it sits behind the lead." },
      { name: "More reverb send", detail: "Wetter than the lead, which gives depth without extra volume." },
    ],
  },
  {
    id: "returns",
    label: "Returns",
    summary: "Three shared spaces keep the mix glued and cheap on CPU.",
    devices: [
      {
        name: "A · Reverb",
        detail: "Stock Reverb, hall or room. Pre-delay 15–25 ms so it doesn't blur the attack.",
      },
      { name: "B · Delay", detail: "Delay synced to 1/8 or dotted 1/4, ping-pong for width." },
      { name: "C · Saturation", detail: "Saturator or a light tape device, used as parallel glue for drums and bass." },
    ],
  },
];

export type Route = {
  id: string;
  from: string;
  to: string;
  fromColor: string;
  toColor: string;
  steps: string[];
};

export const ROUTES: Route[] = [
  {
    id: "bl-ab",
    from: "BandLab",
    to: "Ableton",
    fromColor: "#FF3C3C",
    toColor: "#F5F3EF",
    steps: [
      "Write down the BandLab project's tempo and key.",
      "Export each track as its own WAV stem at 44.1 kHz / 24-bit. If you only have a mixdown, BandLab's Splitter can separate vocals, drums, bass and other parts.",
      "For MIDI parts you want to keep editing, download the MIDI region if BandLab offers it for that track. Otherwise keep it as audio.",
      "In Ableton, set the project tempo first, then drag the stems onto the matching template tracks at bar 1.",
    ],
  },
  {
    id: "ab-lg",
    from: "Ableton",
    to: "Logic",
    fromColor: "#F5F3EF",
    toColor: "#A3A3FF",
    steps: [
      "File › Export Audio/Video › Rendered Track: All Individual Tracks. Render the full length plus a few bars of tail.",
      "Export any MIDI you want to re-voice with Logic instruments (right-click the clip › Export MIDI Clip).",
      "Create a new Logic project at the same tempo and key. Import every stem at bar 1.",
      "Keep file names identical to your Live track names (KICK.wav, LEAD_VOX.wav…) so nothing gets lost.",
    ],
  },
  {
    id: "lg-ab",
    from: "Logic",
    to: "Ableton",
    fromColor: "#A3A3FF",
    toColor: "#F5F3EF",
    steps: [
      "File › Export › All Tracks as Audio Files (⇧⌘E), starting from bar 1.",
      "Export MIDI regions you still want to edit (File › Export › Selection as MIDI File).",
      "Open the Live template, match the tempo, and drop everything in at bar 1.",
    ],
  },
];

export const CHECKLIST = [
  "Drop the idea onto matching template tracks at bar 1, with the tempo matched first",
  "Move the locators to where the sections actually fall",
  "Drums through Drum Buss (Transients knob) before anything else",
  "Vocals: gain → (optional shave) → Xvox → EQ → sends",
  "Balance the three returns instead of adding effects on every track",
  "Automate reverb/delay sends per section: dry verse, wide chorus",
  "Export › All Individual Tracks if it's going to Logic or a mix engineer",
  "Export the master and bounce a reference to your phone for a car/earbud check",
];
