import { and, eq } from "drizzle-orm";
import { ORPCError } from "@orpc/server";
import { authed } from "../middleware/auth";
import { db } from "../database";
import * as schema from "../database/schema";

/**
 * SoundCloud is the only platform in this pipeline with a public write API, so it
 * is the only one that can genuinely auto-post. It uses OAuth 2.1 with PKCE.
 * Credentials come from the user's own registered SoundCloud app.
 */
const AUTHORIZE_URL = "https://secure.soundcloud.com/authorize";
const TOKEN_URL = "https://secure.soundcloud.com/oauth/token";
const API_BASE = "https://api.soundcloud.com";

export function soundcloudConfig() {
  const clientId = process.env.SOUNDCLOUD_CLIENT_ID;
  const clientSecret = process.env.SOUNDCLOUD_CLIENT_SECRET;
  const websiteUrl = process.env.WEBSITE_URL ?? "";
  return {
    clientId,
    clientSecret,
    redirectUri: `${websiteUrl.replace(/\/$/, "")}/api/soundcloud/callback`,
    configured: Boolean(clientId && clientSecret),
  };
}

function base64Url(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function pkcePair() {
  const verifierBytes = crypto.getRandomValues(new Uint8Array(32));
  const codeVerifier = base64Url(verifierBytes);
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(codeVerifier),
  );
  return { codeVerifier, codeChallenge: base64Url(new Uint8Array(digest)) };
}

/** Returns a valid access token for the user, refreshing it when expired. */
export async function accessTokenFor(userId: string) {
  const [account] = await db
    .select()
    .from(schema.soundcloudAccounts)
    .where(eq(schema.soundcloudAccounts.userId, userId));
  if (!account) return null;

  const expiresSoon =
    account.expiresAt && account.expiresAt.getTime() - Date.now() < 60_000;
  if (!expiresSoon) return account.accessToken;
  if (!account.refreshToken) return account.accessToken;

  const { clientId, clientSecret } = soundcloudConfig();
  if (!clientId || !clientSecret) return account.accessToken;

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: account.refreshToken,
    }),
  });
  if (!res.ok) return account.accessToken;

  const data = (await res.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
  };
  await db
    .update(schema.soundcloudAccounts)
    .set({
      accessToken: data.access_token,
      refreshToken: data.refresh_token ?? account.refreshToken,
      expiresAt: data.expires_in
        ? new Date(Date.now() + data.expires_in * 1000)
        : null,
    })
    .where(eq(schema.soundcloudAccounts.userId, userId));
  return data.access_token;
}

/** Exchanges the authorization code and stores tokens. Called by the HTTP callback. */
export async function completeConnect(code: string, state: string) {
  const { clientId, clientSecret, redirectUri } = soundcloudConfig();
  if (!clientId || !clientSecret) throw new Error("SoundCloud not configured");

  const [pending] = await db
    .select()
    .from(schema.oauthStates)
    .where(eq(schema.oauthStates.state, state));
  if (!pending) throw new Error("Unknown or expired OAuth state");

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      code_verifier: pending.codeVerifier,
      code,
    }),
  });
  if (!res.ok) throw new Error(`Token exchange failed: ${await res.text()}`);

  const data = (await res.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
  };

  let scUserId: string | null = null;
  let scUsername: string | null = null;
  const me = await fetch(`${API_BASE}/me`, {
    headers: { Authorization: `OAuth ${data.access_token}` },
  });
  if (me.ok) {
    const profile = (await me.json()) as { id?: number; username?: string };
    scUserId = profile.id ? String(profile.id) : null;
    scUsername = profile.username ?? null;
  }

  const values = {
    userId: pending.userId,
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? null,
    expiresAt: data.expires_in
      ? new Date(Date.now() + data.expires_in * 1000)
      : null,
    scUserId,
    scUsername,
  };

  await db
    .insert(schema.soundcloudAccounts)
    .values(values)
    .onConflictDoUpdate({
      target: schema.soundcloudAccounts.userId,
      set: values,
    });

  await db.delete(schema.oauthStates).where(eq(schema.oauthStates.state, state));
  return { ok: true };
}

/** Streams an audio file to SoundCloud and records the permalink on the release. */
export async function uploadTrack(options: {
  userId: string;
  releaseId: number;
  file: File;
  title: string;
  sharing: "public" | "private";
  description?: string;
}) {
  const token = await accessTokenFor(options.userId);
  if (!token) throw new Error("SoundCloud is not connected");

  const form = new FormData();
  form.append("track[title]", options.title);
  form.append("track[sharing]", options.sharing);
  if (options.description) form.append("track[description]", options.description);
  form.append("track[asset_data]", options.file, options.file.name);

  const res = await fetch(`${API_BASE}/tracks`, {
    method: "POST",
    headers: { Authorization: `OAuth ${token}` },
    body: form,
  });
  if (!res.ok) throw new Error(`Upload failed (${res.status}): ${await res.text()}`);

  const track = (await res.json()) as {
    permalink_url?: string;
    id?: number;
  };

  if (track.permalink_url) {
    await db
      .update(schema.releasePlatforms)
      .set({
        status: options.sharing === "public" ? "live" : "submitted",
        url: track.permalink_url,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(schema.releasePlatforms.releaseId, options.releaseId),
          eq(schema.releasePlatforms.platform, "soundcloud"),
        ),
      );
  }

  return { permalinkUrl: track.permalink_url ?? null, trackId: track.id ?? null };
}

export const soundcloud = {
  /** Whether the server has credentials and whether this user is connected. */
  status: authed.handler(async ({ context }) => {
    const { configured, redirectUri } = soundcloudConfig();
    const [account] = await db
      .select()
      .from(schema.soundcloudAccounts)
      .where(eq(schema.soundcloudAccounts.userId, context.user.id));
    return {
      configured,
      redirectUri,
      connected: Boolean(account),
      username: account?.scUsername ?? null,
    };
  }),

  /** Builds the PKCE authorize URL and stores the pending state. */
  authorizeUrl: authed.handler(async ({ context }) => {
    const { clientId, redirectUri, configured } = soundcloudConfig();
    if (!configured || !clientId)
      throw new ORPCError("BAD_REQUEST", {
        message:
          "Add SOUNDCLOUD_CLIENT_ID and SOUNDCLOUD_CLIENT_SECRET to .env first",
      });

    const { codeVerifier, codeChallenge } = await pkcePair();
    const state = base64Url(crypto.getRandomValues(new Uint8Array(16)));

    await db.insert(schema.oauthStates).values({
      state,
      userId: context.user.id,
      codeVerifier,
    });

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
      state,
    });
    return { url: `${AUTHORIZE_URL}?${params.toString()}` };
  }),

  disconnect: authed.handler(async ({ context }) => {
    await db
      .delete(schema.soundcloudAccounts)
      .where(eq(schema.soundcloudAccounts.userId, context.user.id));
    return { ok: true };
  }),
};
