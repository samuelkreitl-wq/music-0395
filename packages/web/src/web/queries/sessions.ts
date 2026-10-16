import { useQuery, useQueryClient } from "@tanstack/react-query";
import { orpc } from "../lib/api";

export function useSessions() {
  return useQuery(orpc.sessions.list.queryOptions());
}

export function useRefreshSessions() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: orpc.sessions.key() });
}

export function useAudioUrl(fileId: number, enabled: boolean) {
  return useQuery(orpc.sessions.downloadUrl.queryOptions({
    input: { fileId, inline: true }, enabled, staleTime: 300_000,
  }));
}