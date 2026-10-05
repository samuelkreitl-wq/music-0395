/** The five platforms in the release pipeline, in the order a song travels them. */
export const PLATFORMS = [
  "bandlab",
  "distrokid",
  "spotify",
  "soundcloud",
  "soundbetter",
] as const;

export type Platform = (typeof PLATFORMS)[number];

export const PLATFORM_STATUSES = [
  "not_started",
  "in_progress",
  "submitted",
  "live",
] as const;

export type PlatformStatus = (typeof PLATFORM_STATUSES)[number];

/** Default promo checklist seeded onto every new release. */
export const DEFAULT_PROMO_TASKS = [
  "Export final master + stems",
  "Upload artwork (3000x3000)",
  "Submit to DistroKid (2+ weeks before date)",
  "Pitch to Spotify editorial via Spotify for Artists",
  "Post SoundCloud version + tags",
  "Announce on socials (3 posts: teaser, drop day, follow-up)",
  "Update SoundBetter profile with new credit",
  "Launch paid ad campaign",
];
