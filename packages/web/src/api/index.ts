import type { RouterClient } from "@orpc/server";
import { createApp } from "./__core/app";
import { ping } from "./routes/ping";
import { releases } from "./routes/releases";
import { promo } from "./routes/promo";
import { soundcloud, completeConnect, uploadTrack } from "./routes/soundcloud";
import { sessions } from "./routes/sessions";
import { remote } from "./routes/remote";
import { auth } from "./auth";

// API features are oRPC procedures, one file per feature in ./routes/,
// composed into this router — typed end-to-end via the clients
// (web: src/web/lib/api.ts, mobile: lib/api.ts).
export const router = {
  ping,
  releases,
  promo,
  soundcloud,
  sessions,
  remote,
};

export type AppRouter = typeof router;
/** Typed client for the router — used by the web and mobile api clients. */
export type AppRouterClient = RouterClient<AppRouter>;

const app = createApp(router);

app.on(["GET", "POST"], "/api/auth/*", (c) => auth.handler(c.req.raw));

/** SoundCloud redirects the browser here after the user approves access. */
app.get("/api/soundcloud/callback", async (c) => {
  const code = c.req.query("code");
  const state = c.req.query("state");
  const error = c.req.query("error");

  if (error || !code || !state) {
    return c.redirect(
      `/connections?sc_error=${encodeURIComponent(error ?? "missing_code")}`,
      302,
    );
  }
  try {
    await completeConnect(code, state);
    return c.redirect("/connections?sc_connected=1", 302);
  } catch (e) {
    const message = e instanceof Error ? e.message : "connect_failed";
    return c.redirect(`/connections?sc_error=${encodeURIComponent(message)}`, 302);
  }
});

/** Multipart audio upload streamed straight to SoundCloud (not an oRPC procedure). */
app.post("/api/soundcloud/upload", async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) return c.json({ error: "Unauthorized" }, 401);

  const body = await c.req.parseBody();
  const file = body.file;
  const releaseId = Number(body.releaseId);
  const title = typeof body.title === "string" ? body.title : "";
  const sharing = body.sharing === "public" ? "public" : "private";
  const description =
    typeof body.description === "string" ? body.description : undefined;

  if (!(file instanceof File) || !releaseId || !title) {
    return c.json({ error: "file, releaseId and title are required" }, 400);
  }

  try {
    const result = await uploadTrack({
      userId: session.user.id,
      releaseId,
      file,
      title,
      sharing,
      description,
    });
    return c.json(result, 200);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Upload failed";
    return c.json({ error: message }, 400);
  }
});

export default app;
