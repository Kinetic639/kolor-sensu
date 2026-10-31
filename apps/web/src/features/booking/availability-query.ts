"use client";
import { isServer, QueryClient } from "@tanstack/react-query";
let browserClient: QueryClient | undefined;
export const AVAILABILITY_STALE_MS = 20_000;
export function getAvailabilityQueryClient() {
  const create = () =>
    new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: AVAILABILITY_STALE_MS,
          gcTime: 5 * 60_000,
          retry: 1,
          retryDelay: 500,
          refetchOnWindowFocus: true,
          refetchOnReconnect: true,
        },
      },
    });
  if (isServer) return create();
  return (browserClient ??= create());
}
