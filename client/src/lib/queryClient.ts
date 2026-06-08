import { QueryClient, QueryFunction, onlineManager } from "@tanstack/react-query";

// Keep React Query's online manager always in the "online" state.
// In React Query v5, setting refetchOnWindowFocus: false also causes refetchOnReconnect
// to default to false. Combined with Railway cold-start failures, this means the
// /api/colors query enters "paused" state and never retries.
// Fix: always report online, and explicitly set refetchOnReconnect: true below.
onlineManager.setEventListener((setOnline) => {
  // Immediately force online state (unblocks any paused retries)
  setOnline(true);
  // Listen for real browser online events but never set offline
  const handleOnline = () => setOnline(true);
  window.addEventListener("online", handleOnline, false);
  return () => window.removeEventListener("online", handleOnline, false);
});

async function throwIfResNotOk(res: Response)  {
  if (!res.ok) {
    const raw = await res.text();
    let detail = raw || res.statusText;
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") {
          if (typeof parsed.message === "string") detail = parsed.message;
          else if (typeof parsed.error === "string") detail = parsed.error;
        }
      } catch {
        // not JSON, keep raw text
      }
    }
    throw new Error(`${res.status}: ${detail}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });
  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
    });
    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }
    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      staleTime: Infinity,
      // Retry up to 5 times on 5xx errors (Railway cold-start), never on 4xx.
      retry: (failureCount, error) => {
        if (error instanceof Error && /^5\d\d/.test(error.message)) {
          return failureCount < 5;
        }
        return false;
      },
      retryDelay: (attempt) => Math.min(1500 * (attempt + 1), 15000),
      networkMode: "always",
    },
    mutations: { retry: false },
  },
});
