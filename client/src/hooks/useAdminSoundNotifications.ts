import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { playCashRegister, playSoftPop } from "@/lib/admin-sounds";

/**
 * Layout-mounted hook that polls /api/admin/events/recent every 30s and
 * fires a sound when new payments or renders arrive since the last poll.
 *
 * Design notes:
 * - The since-cursor lives in a ref, NOT the React Query queryKey. If it
 *   were in the queryKey, every successful poll would mutate the key
 *   (because the cursor advances on each batch), and React Query would
 *   immediately refetch the new key — doubling the request rate when
 *   there is activity. Keeping the cursor in a ref means queryFn reads
 *   the latest value at fire time without invalidating the cache.
 * - 30s cadence matches the existing admin-renders refetch in
 *   client/src/pages/admin/renders.tsx so the two polls overlap on the
 *   same browser-network cycle and the admin tab makes one logical
 *   "ping" per 30s.
 * - retry: false — auth failures (admin session expired) should not
 *   keep retrying every few seconds.
 * - localStorage key admin_sounds_enabled defaults to true on first
 *   visit and survives reloads. A storage event listener syncs the
 *   toggle across multiple open admin tabs.
 */

const QUERY_KEY = ["/api/admin/events/recent"] as const;
const STORAGE_KEY = "admin_sounds_enabled";
const POLL_INTERVAL_MS = 30_000;
// Stagger when both events fire in the same poll cycle. Cash register is
// ~400ms; 500ms lets the pop arrive just after it ends so the two events
// read as distinct rather than fused into a chord. Tunable.
const BOTH_FIRED_STAGGER_MS = 500;

interface RecentEventsResponse {
  newPayments: number;
  newRenders: number;
  latestPaymentAt: string | null;
  latestRenderAt: string | null;
}

function readSoundsEnabled(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === null) return true;
    return raw === "true";
  } catch {
    return true;
  }
}

function writeSoundsEnabled(value: boolean): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, String(value));
  } catch {
    // Quota exceeded, private mode with storage disabled, etc. The
    // in-memory state still toggles via setState; the persistence layer
    // is best-effort.
  }
}

export function useAdminSoundNotifications() {
  const [soundsEnabled, setSoundsEnabled] = useState<boolean>(readSoundsEnabled);
  // The since-cursor moves forward on every poll that returned new
  // events. Initialized at mount time so historical events are NEVER
  // played as sounds — only events strictly newer than mount.
  const sinceRef = useRef<string>(new Date().toISOString());
  // Track which timestamps we've already reacted to so a stale cached
  // response from React Query does not re-fire sounds on a re-render.
  const lastReactedTimestampRef = useRef<string | null>(null);

  const { data } = useQuery<RecentEventsResponse>({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const since = encodeURIComponent(sinceRef.current);
      const res = await fetch(`/api/admin/events/recent?since=${since}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error(`events/recent ${res.status}`);
      return res.json();
    },
    refetchInterval: POLL_INTERVAL_MS,
    retry: false,
    refetchOnWindowFocus: false,
  });

  // React to query results: play sounds (if enabled) and advance the
  // cursor. The dependency on `data` is the trigger; `soundsEnabled` is
  // also a dep so toggling the speaker icon takes effect on the next
  // poll without waiting for a fresh `data` reference.
  useEffect(() => {
    if (!data) return;
    const { newPayments, newRenders, latestPaymentAt, latestRenderAt } = data;

    // Skip if we already reacted to this exact response. Without this
    // guard, a re-render of the parent (which re-runs the effect with
    // the same `data` reference unchanged) is fine, but a refetch that
    // happens to return identical timestamps would double-fire.
    const responseFingerprint = `${latestPaymentAt ?? ""}|${latestRenderAt ?? ""}`;
    if (responseFingerprint === lastReactedTimestampRef.current) return;
    lastReactedTimestampRef.current = responseFingerprint;

    if (soundsEnabled) {
      if (newPayments > 0) playCashRegister();
      if (newRenders > 0) {
        if (newPayments > 0) {
          // Both fired: stagger the pop so the user hears two events,
          // not one chord.
          window.setTimeout(() => playSoftPop(), BOTH_FIRED_STAGGER_MS);
        } else {
          playSoftPop();
        }
      }
    }

    // Advance the cursor to the newest event seen, even when sounds are
    // off, so re-enabling the toggle does not retroactively replay
    // sounds for events that arrived during the off window.
    const candidates = [latestPaymentAt, latestRenderAt].filter(
      (v): v is string => typeof v === "string" && v.length > 0,
    );
    if (candidates.length > 0) {
      candidates.sort();
      sinceRef.current = candidates[candidates.length - 1];
    }
  }, [data, soundsEnabled]);

  // Cross-tab sync. Storage events fire only in OTHER tabs (not the one
  // that wrote), so this catches a toggle made in a sibling admin tab.
  useEffect(() => {
    function onStorage(event: StorageEvent) {
      if (event.key !== STORAGE_KEY) return;
      setSoundsEnabled(event.newValue === "true");
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const toggleSounds = useCallback(() => {
    setSoundsEnabled((prev) => {
      const next = !prev;
      writeSoundsEnabled(next);
      return next;
    });
  }, []);

  return { soundsEnabled, toggleSounds };
}
