import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export * from "./auth-schema";

/** A song/single/EP moving through the release pipeline. */
export const releases = sqliteTable("releases", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: text("user_id").notNull(),
  title: text("title").notNull(),
  artist: text("artist").notNull(),
  releaseDate: text("release_date"),
  coverUrl: text("cover_url"),
  notes: text("notes"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

/**
 * One row per (release, platform). Status is a plain string so the pipeline can
 * evolve without a migration: not_started | in_progress | submitted | live.
 */
export const releasePlatforms = sqliteTable("release_platforms", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  releaseId: integer("release_id").notNull(),
  platform: text("platform").notNull(),
  status: text("status").notNull().default("not_started"),
  url: text("url"),
  note: text("note"),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

/** Promotion checklist item attached to a release. */
export const promoTasks = sqliteTable("promo_tasks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  releaseId: integer("release_id").notNull(),
  label: text("label").notNull(),
  done: integer("done", { mode: "boolean" }).notNull().default(false),
  dueDate: text("due_date"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

/** Stored SoundCloud OAuth tokens — the one platform whose API allows real posting. */
export const soundcloudAccounts = sqliteTable("soundcloud_accounts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: text("user_id").notNull().unique(),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token"),
  expiresAt: integer("expires_at", { mode: "timestamp" }),
  scUserId: text("sc_user_id"),
  scUsername: text("sc_username"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

/** Short-lived OAuth state/PKCE store for the SoundCloud connect flow. */
export const oauthStates = sqliteTable("oauth_states", {
  state: text("state").primaryKey(),
  userId: text("user_id").notNull(),
  codeVerifier: text("code_verifier").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});
