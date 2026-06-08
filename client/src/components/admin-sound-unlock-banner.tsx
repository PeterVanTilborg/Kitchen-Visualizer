import { useEffect, useState } from "react";

import { isAudioUnlocked, unlockAudio } from "@/lib/admin-sounds";

const SESSION_KEY = "admin_sound_banner_dismissed";

interface SoundUnlockBannerProps {
  soundsEnabled: boolean;
}

/**
 * One-time banner explaining that the user must click somewhere on the
 * page before browsers will allow notification sounds to play. The
 * AudioContext stays in "suspended" state until a real user gesture
 * happens in the tab — without this banner the very first poll-event
 * sound would silently fall on the floor and Peter would think the
 * feature is broken.
 *
 * Hidden when ANY of:
 *   - soundsEnabled is false (do not nag if the user explicitly muted)
 *   - sessionStorage admin_sound_banner_dismissed === "true" (already
 *     dismissed in this tab; sessionStorage scope means a fresh tab
 *     will see it again, which matches the per-tab autoplay reset)
 *   - the AudioContext is already in "running" state at mount (rare,
 *     but possible if the user gestured before this component mounted
 *     — for example by clicking the speaker toggle in the header)
 *
 * Dismissal: the first user click OR keydown anywhere on the window
 * sets the sessionStorage flag, calls unlockAudio() to eagerly resume
 * the AudioContext, and hides the banner. Listeners are removed
 * immediately so subsequent gestures do nothing.
 */
export function SoundUnlockBanner({ soundsEnabled }: SoundUnlockBannerProps) {
  const [hidden, setHidden] = useState<boolean>(() => {
    if (!soundsEnabled) return true;
    if (typeof window === "undefined") return true;
    try {
      if (window.sessionStorage.getItem(SESSION_KEY) === "true") return true;
    } catch {
      // sessionStorage blocked (private mode, quota). Fall through; the
      // banner shows but cannot persist its dismissal across page loads.
      // Per-mount dismissal still works.
    }
    return isAudioUnlocked();
  });

  useEffect(() => {
    if (hidden) return;

    function dismiss() {
      try {
        window.sessionStorage.setItem(SESSION_KEY, "true");
      } catch {
        // Best-effort persistence; in-memory hide still applies.
      }
      // Eagerly resume the AudioContext so the very first sound after
      // this gesture plays without an additional resume hop.
      unlockAudio();
      setHidden(true);
    }

    window.addEventListener("click", dismiss, { once: true });
    window.addEventListener("keydown", dismiss, { once: true });

    return () => {
      window.removeEventListener("click", dismiss);
      window.removeEventListener("keydown", dismiss);
    };
  }, [hidden]);

  // Re-evaluate hide-on-mute when soundsEnabled flips off mid-session.
  // The reverse direction (off -> on) does NOT re-show the banner —
  // dismissal is per-tab-session, not per-toggle.
  useEffect(() => {
    if (!soundsEnabled) setHidden(true);
  }, [soundsEnabled]);

  if (hidden) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="bg-muted/60 text-muted-foreground text-xs text-center py-2 px-4 border-b border-border"
      data-testid="admin-sound-unlock-banner"
    >
      Click anywhere to enable sound notifications
    </div>
  );
}
