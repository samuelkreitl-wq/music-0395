import { z } from "zod";
import { and, desc, eq, inArray } from "drizzle-orm";
import { ORPCError } from "@orpc/server";
import { authed } from "../middleware/auth";
import { db } from "../database";
import * as schema from "../database/schema";
import {
  DEFAULT_PROMO_TASKS,
  PLATFORMS,
  PLATFORM_STATUSES,
} from "../lib/platforms";

/** Throws unless the release exists and belongs to the caller. */
async function ownedRelease(releaseId: number, userId: string) {
  const [release] = await db
    .select()
    .from(schema.releases)
    .where(
      and(eq(schema.releases.id, releaseId), eq(schema.releases.userId, userId)),
    );
  if (!release) throw new ORPCError("NOT_FOUND", { message: "Release not found" });
  return release;
}

export const releases = {
  /** All releases for the caller, each with its platform rows for the list view chips. */
  list: authed.handler(async ({ context }) => {
    const rows = await db
      .select()
      .from(schema.releases)
      .where(eq(schema.releases.userId, context.user.id))
      .orderBy(desc(schema.releases.createdAt));

    if (rows.length === 0) return [];

    const platforms = await db
      .select()
      .from(schema.releasePlatforms)
      .where(
        inArray(
          schema.releasePlatforms.releaseId,
          rows.map((r) => r.id),
        ),
      );

    return rows.map((release) => ({
      ...release,
      platforms: platforms.filter((p) => p.releaseId === release.id),
    }));
  }),

  /** One release with platforms and promo tasks — the detail page payload. */
  get: authed
    .input(z.object({ id: z.number() }))
    .handler(async ({ input, context }) => {
      const release = await ownedRelease(input.id, context.user.id);
      const [platforms, tasks] = await Promise.all([
        db
          .select()
          .from(schema.releasePlatforms)
          .where(eq(schema.releasePlatforms.releaseId, release.id)),
        db
          .select()
          .from(schema.promoTasks)
          .where(eq(schema.promoTasks.releaseId, release.id))
          .orderBy(schema.promoTasks.id),
      ]);
      return { ...release, platforms, tasks };
    }),

  /** Creates a release plus its five platform rows and the default promo checklist. */
  create: authed
    .input(
      z.object({
        title: z.string().min(1),
        artist: z.string().min(1),
        releaseDate: z.string().optional(),
        coverUrl: z.string().optional(),
      }),
    )
    .handler(async ({ input, context }) => {
      const [release] = await db
        .insert(schema.releases)
        .values({
          userId: context.user.id,
          title: input.title,
          artist: input.artist,
          releaseDate: input.releaseDate || null,
          coverUrl: input.coverUrl || null,
        })
        .returning();

      await db.insert(schema.releasePlatforms).values(
        PLATFORMS.map((platform) => ({
          releaseId: release.id,
          platform,
          status: "not_started" as const,
        })),
      );

      await db.insert(schema.promoTasks).values(
        DEFAULT_PROMO_TASKS.map((label) => ({
          releaseId: release.id,
          label,
        })),
      );

      return release;
    }),

  update: authed
    .input(
      z.object({
        id: z.number(),
        title: z.string().min(1).optional(),
        artist: z.string().min(1).optional(),
        releaseDate: z.string().nullable().optional(),
        coverUrl: z.string().nullable().optional(),
        notes: z.string().nullable().optional(),
      }),
    )
    .handler(async ({ input, context }) => {
      await ownedRelease(input.id, context.user.id);
      const { id, ...patch } = input;
      const [updated] = await db
        .update(schema.releases)
        .set(patch)
        .where(eq(schema.releases.id, id))
        .returning();
      return updated;
    }),

  remove: authed
    .input(z.object({ id: z.number() }))
    .handler(async ({ input, context }) => {
      await ownedRelease(input.id, context.user.id);
      await db
        .delete(schema.releasePlatforms)
        .where(eq(schema.releasePlatforms.releaseId, input.id));
      await db
        .delete(schema.promoTasks)
        .where(eq(schema.promoTasks.releaseId, input.id));
      await db.delete(schema.releases).where(eq(schema.releases.id, input.id));
      return { ok: true };
    }),

  /** Sets status / link / note on one platform card of a release. */
  setPlatform: authed
    .input(
      z.object({
        releaseId: z.number(),
        platform: z.enum(PLATFORMS),
        status: z.enum(PLATFORM_STATUSES).optional(),
        url: z.string().nullable().optional(),
        note: z.string().nullable().optional(),
      }),
    )
    .handler(async ({ input, context }) => {
      await ownedRelease(input.releaseId, context.user.id);
      const patch: Record<string, unknown> = { updatedAt: new Date() };
      if (input.status !== undefined) patch.status = input.status;
      if (input.url !== undefined) patch.url = input.url;
      if (input.note !== undefined) patch.note = input.note;

      const [updated] = await db
        .update(schema.releasePlatforms)
        .set(patch)
        .where(
          and(
            eq(schema.releasePlatforms.releaseId, input.releaseId),
            eq(schema.releasePlatforms.platform, input.platform),
          ),
        )
        .returning();
      return updated;
    }),
};
