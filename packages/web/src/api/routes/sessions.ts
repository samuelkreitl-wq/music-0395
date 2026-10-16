import { z } from "zod";
import { and, desc, eq, inArray } from "drizzle-orm";
import { ORPCError } from "@orpc/server";
import {
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { authed } from "../middleware/auth";
import { db } from "../database";
import * as schema from "../database/schema";
import { BUCKET, s3 } from "../lib/s3";

const DAWS = ["ableton", "logic", "bandlab", "other"] as const;

async function ownedSession(sessionId: number, userId: string) {
  const [session] = await db
    .select()
    .from(schema.sessions)
    .where(and(eq(schema.sessions.id, sessionId), eq(schema.sessions.userId, userId)));
  if (!session) throw new ORPCError("NOT_FOUND", { message: "Session not found" });
  return session;
}

function keyPrefix(userId: string, sessionId: number) {
  return `users/${userId}/sessions/${sessionId}/`;
}

function safeName(name: string) {
  return name.replace(/[^\w.\- ()]+/g, "_").slice(0, 180) || "file";
}

export const sessions = {
  list: authed.handler(async ({ context }) => {
    const rows = await db
      .select()
      .from(schema.sessions)
      .where(eq(schema.sessions.userId, context.user.id))
      .orderBy(desc(schema.sessions.createdAt));
    if (rows.length === 0) return [];
    const files = await db
      .select()
      .from(schema.sessionFiles)
      .where(inArray(schema.sessionFiles.sessionId, rows.map((r) => r.id)));
    return rows.map((s) => ({
      ...s,
      files: files.filter((f) => f.sessionId === s.id),
    }));
  }),

  create: authed
    .input(
      z.object({
        title: z.string().min(1).max(200),
        daw: z.enum(DAWS),
        bpm: z.number().int().min(20).max(400).nullable().optional(),
        musicalKey: z.string().max(20).nullable().optional(),
        notes: z.string().max(4000).nullable().optional(),
      }),
    )
    .handler(async ({ input, context }) => {
      const [session] = await db
        .insert(schema.sessions)
        .values({
          userId: context.user.id,
          title: input.title,
          daw: input.daw,
          bpm: input.bpm ?? null,
          musicalKey: input.musicalKey || null,
          notes: input.notes || null,
        })
        .returning();
      return session;
    }),

  /** Presigned PUT so the browser uploads straight to storage. */
  presignUpload: authed
    .input(
      z.object({
        sessionId: z.number(),
        filename: z.string().min(1),
        contentType: z.string(),
      }),
    )
    .handler(async ({ input, context }) => {
      await ownedSession(input.sessionId, context.user.id);
      const key = `${keyPrefix(context.user.id, input.sessionId)}${Date.now()}-${safeName(input.filename)}`;
      const url = await getSignedUrl(
        s3,
        new PutObjectCommand({
          Bucket: BUCKET,
          Key: key,
          ContentType: input.contentType || "application/octet-stream",
        }),
        { expiresIn: 3600 },
      );
      return { url, key };
    }),

  /** Records a file once its upload has landed in storage. */
  addFile: authed
    .input(
      z.object({
        sessionId: z.number(),
        key: z.string(),
        name: z.string().min(1),
        contentType: z.string().optional(),
      }),
    )
    .handler(async ({ input, context }) => {
      await ownedSession(input.sessionId, context.user.id);
      if (!input.key.startsWith(keyPrefix(context.user.id, input.sessionId))) {
        throw new ORPCError("FORBIDDEN", { message: "Key does not belong to this session" });
      }
      let size = 0;
      try {
        const head = await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: input.key }));
        size = Number(head.ContentLength ?? 0);
      } catch {
        throw new ORPCError("BAD_REQUEST", { message: "Upload not found in storage" });
      }
      const [file] = await db
        .insert(schema.sessionFiles)
        .values({
          sessionId: input.sessionId,
          name: input.name,
          storageKey: input.key,
          size,
          contentType: input.contentType || null,
        })
        .returning();
      return file;
    }),

  downloadUrl: authed
    .input(z.object({ fileId: z.number(), inline: z.boolean().optional() }))
    .handler(async ({ input, context }) => {
      const [row] = await db
        .select({ file: schema.sessionFiles })
        .from(schema.sessionFiles)
        .innerJoin(schema.sessions, eq(schema.sessions.id, schema.sessionFiles.sessionId))
        .where(
          and(eq(schema.sessionFiles.id, input.fileId), eq(schema.sessions.userId, context.user.id)),
        );
      if (!row) throw new ORPCError("NOT_FOUND", { message: "File not found" });
      const url = await getSignedUrl(
        s3,
        new GetObjectCommand({
          Bucket: BUCKET,
          Key: row.file.storageKey,
          ResponseContentDisposition: `${input.inline ? "inline" : "attachment"}; filename="${safeName(row.file.name)}"`,
        }),
        { expiresIn: 600 },
      );
      return { url };
    }),

  removeFile: authed
    .input(z.object({ fileId: z.number() }))
    .handler(async ({ input, context }) => {
      const [row] = await db
        .select({ file: schema.sessionFiles })
        .from(schema.sessionFiles)
        .innerJoin(schema.sessions, eq(schema.sessions.id, schema.sessionFiles.sessionId))
        .where(
          and(eq(schema.sessionFiles.id, input.fileId), eq(schema.sessions.userId, context.user.id)),
        );
      if (!row) throw new ORPCError("NOT_FOUND", { message: "File not found" });
      await s3.send(
        new DeleteObjectsCommand({
          Bucket: BUCKET,
          Delete: { Objects: [{ Key: row.file.storageKey }] },
        }),
      );
      await db.delete(schema.sessionFiles).where(eq(schema.sessionFiles.id, input.fileId));
      return { ok: true };
    }),

  remove: authed
    .input(z.object({ id: z.number() }))
    .handler(async ({ input, context }) => {
      await ownedSession(input.id, context.user.id);
      const files = await db
        .select()
        .from(schema.sessionFiles)
        .where(eq(schema.sessionFiles.sessionId, input.id));
      if (files.length > 0) {
        await s3.send(
          new DeleteObjectsCommand({
            Bucket: BUCKET,
            Delete: { Objects: files.map((f) => ({ Key: f.storageKey })) },
          }),
        );
      }
      await db.delete(schema.sessionFiles).where(eq(schema.sessionFiles.sessionId, input.id));
      await db.delete(schema.sessions).where(eq(schema.sessions.id, input.id));
      return { ok: true };
    }),
};
