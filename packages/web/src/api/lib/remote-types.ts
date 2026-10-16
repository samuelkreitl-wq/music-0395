export type RemoteCommand =
  | { kind: 'play' | 'stop' | 'record' | 'stopClips' }
  | { kind: 'tempo'; value: number }
  | { kind: 'track'; track: number; field: 'volume' | 'panning' | 'mute' | 'solo' | 'arm'; value: number }
  | { kind: 'clip'; track: number; scene: number }
  | { kind: 'parameter'; track: number; device: number; parameter: number; value: number }
  | { kind: 'note'; note: number; velocity: number; on: boolean };
export type LiveTrack = { id: number; name: string; volume: number; panning: number; mute: boolean; solo: boolean; arm: boolean; canArm: boolean; meter: number; clips: { scene: number; name: string; hasClip: boolean; playing: boolean }[]; devices: { id: number; name: string; parameters: { id: number; name: string; value: number; min: number; max: number }[] }[] };
export type LiveSnapshot = { live: boolean; midi: boolean; playing: boolean; recording: boolean; tempo: number; beat: number; version: string; tracks: LiveTrack[]; error: string | null };
