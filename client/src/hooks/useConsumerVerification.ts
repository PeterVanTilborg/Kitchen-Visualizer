import { useQuery, useQueryClient } from "@tanstack/react-query";

/**
 * Response shape from GET /api/consumer/customer-state. Declared locally
 * (not imported from @shared/schema) so the frontend bundle stays free of
 * Drizzle pgTable runtime metadata. Keep in sync with the server handler in
 * server/routes.ts.
 */
type CustomerStateResponse =
  | { verified: false }
  | {
      verified: true;
      email: string;
      rendersUsed: number;
      freeRenderLimit: number;
    };

const QUERY_KEY = ["/api/consumer/customer-state"] as const;

async function fetchCustomerState(): Promise<CustomerStateResponse> {
  const response = await fetch("/api/consumer/customer-state", {
    credentials: "include",
  });
  if (!response.ok) {
    // Network/5xx — fail open, treat as unverified rather than throwing
    // (the gate will appear on the next render attempt).
    return { verified: false };
  }
  return response.json();
}

/**
 * Reads the consumer-side verification cookie state. Used by home.tsx to
 * decide whether to show the EmailVerificationGate before triggering a
 * render, and by EmailVerificationGate itself to read back the resolved
 * state after a successful confirm-email round-trip via refetch().
 *
 * The hook normalizes the discriminated-union response into a flat shape
 * with safe defaults (rendersUsed: 0, freeRenderLimit: 2) so callers do
 * not have to narrow on `verified` for the count fields.
 */
export function useConsumerVerification() {
  const queryClient = useQueryClient();

  const { data, isLoading, refetch } = useQuery<CustomerStateResponse>({
    queryKey: QUERY_KEY,
    queryFn: fetchCustomerState,
    staleTime: 30_000,
    retry: false,
  });

  const verified = data?.verified === true;

  return {
    verified,
    email: verified ? data.email : undefined,
    rendersUsed: verified ? data.rendersUsed : 0,
    freeRenderLimit: verified ? data.freeRenderLimit : 2,
    isLoading,
    refetch,
    /**
     * Invalidate the customer-state query. Call after a successful
     * /api/confirm-email mutation so the next read reflects the new
     * verifiedAt + cookie binding.
     */
    invalidate: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  };
}
