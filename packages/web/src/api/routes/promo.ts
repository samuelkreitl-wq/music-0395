import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { ORPCError } from "@orpc/server";
import { authed } from "../middleware/auth";
import { db } from "../database";
import * as schema from "../database/schema";

/** Confirms the task's release belongs to the caller before touching it. */
async function ownedTask(taskId: number, userId: string) {
  const [row] = await db
    .select({ task: schema.promoTasks, release: schema.releases })
    .from(schema.promoTasks)
    .innerJoin(
      schema.releases,
      eq(schema.releases.id, schema.promoTasks.releaseId),
    )
    .where(
      and(eq(schema.promoTasks.id, taskId), eq(schema.releases.userId, userId)),
    );
  if (!row) throw new ORPCError("NOT_FOUND", { message: "Task not found" });
  return row.task;
}

export const promo = {
  add: authed
    .input(
      z.object({
        releaseId: z.number(),
        label: z.string().min(1),
        dueDate: z.string().optional(),
      }),
    )
    .handler(async ({ input, context }) => {
      const [release] = await db
        .select()
        .from(schema.releases)
        .where(
          and(
            eq(schema.releases.id, input.releaseId),
            eq(schema.releases.userId, context.user.id),
          ),
        );
      if (!release)
        throw new ORPCError("NOT_FOUND", { message: "Release not found" });

      const [task] = await db
        .insert(schema.promoTasks)
        .values({
          releaseId: input.releaseId,
          label: input.label,
          dueDate: input.dueDate || null,
        })
        .returning();
      return task;
    }),

  toggle: authed
    .input(z.object({ id: z.number(), done: z.boolean() }))
    .handler(async ({ input, context }) => {
      await ownedTask(input.id, context.user.id);
      const [task] = await db
        .update(schema.promoTasks)
        .set({ done: input.done })
        .where(eq(schema.promoTasks.id, input.id))
        .returning();
      return task;
    }),

  remove: authed
    .input(z.object({ id: z.number() }))
    .handler(async ({ input, context }) => {
      await ownedTask(input.id, context.user.id);
      await db.delete(schema.promoTasks).where(eq(schema.promoTasks.id, input.id));
      return { ok: true };
    }),
};
