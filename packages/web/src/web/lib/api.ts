import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import type { AppRouterClient } from "../../api";
import { authClient } from "./auth";

const link = new RPCLink({
  url: `${window.location.origin}/api/rpc`,
  headers: () => {
    const token = authClient.managedAuth.getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  },
});

/** Direct typed client: await client.releases.list() */
export const client: AppRouterClient = createORPCClient(link);

/** TanStack Query helpers: useQuery(orpc.releases.list.queryOptions()) */
export const orpc = createTanstackQueryUtils(client);

/** Auth header for plain-HTTP endpoints (the SoundCloud multipart upload). */
export function authHeaders(): Record<string, string> {
  const token = authClient.managedAuth.getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}
