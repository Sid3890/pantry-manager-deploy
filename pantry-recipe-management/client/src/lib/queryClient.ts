import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient();

/**
 * Completely clears all in-memory React Query caches and reset state.
 * Called upon logout so the next user logging in on the same browser session
 * never sees stale cached data belonging to the previous user.
 */
export function clearAllQueryCaches() {
  queryClient.clear();
}
