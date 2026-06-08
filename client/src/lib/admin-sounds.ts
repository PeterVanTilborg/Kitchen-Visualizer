/**
 * Programmatic admin notification sounds via Web Audio API.
 *
 * Why no audio files: the v1 design called for two short, distinctive
 * cues — a cash-register "cha-ching" for new payments and a soft pop
 * for new renders. Generating both via OscillatorNodes (~ten lines per
 * sound) avoids:
 *   - hosting MP3 binaries in client/public/sounds/ and the
 *     Peter-side step of finding, downloading, and committing them
 *   - decoding/preload latency for files that are only kicked off by
 *     a server poll once every 30s anyway
 *   - vendor licensing footnotes ("free from Pixabay/Mixkit ...")
 * Tuning the cues is now a one-line frequency or duration tweak.
 *
 * Browser autoplay-policy compliance: the AudioContext is created
 * lazily on the first play call. If it materializes in the
 * "suspended" state (no prior user gesture in the tab), resume() is
 * called best-effort. The ambient unlock-banner ensures a click
 * happens early in the admin session so subsequent plays are
 * audible. If resume() fails the play is silent — by design, never
 * throws.
 *
 * Volume parameter is reserved for a future slider; v1 hardwires 0.5
 * at every call site. Internal peak gains are tuned so volume=0.5
 * is comfortable in a quiet room and volume=1.0 is loud-but-not-
 * painful on standard laptop speakers.
 */

let cachedContext: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (cachedContext) {
    if (cachedContext.state === "suspended") {
      cachedContext.resume().catch(() => {});
    }
    return cachedContext;
  }
  const Ctor: typeof AudioContext | undefined =
    window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  try {
    cachedContext = new Ctor();
    if (cachedContext.state === "suspended") {
      cachedContext.resume().catch(() => {});
    }
    return cachedContext;
  } catch {
    return null;
  }
}

/**
 * Schedule a single decaying tone — used as the building block for
 * both sounds. exponentialRampToValueAtTime requires positive values,
 * hence the 0.0001 floor instead of 0.
 */
function scheduleTone(
  ctx: AudioContext,
  type: OscillatorType,
  freqStart: number,
  freqEnd: number | null,
  startAt: number,
  duration: number,
  peakGain: number,
): void {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freqStart, startAt);
  if (freqEnd !== null && freqEnd > 0) {
    osc.frequency.exponentialRampToValueAtTime(freqEnd, startAt + duration);
  }
  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.exponentialRampToValueAtTime(peakGain, startAt + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
  osc.connect(gain).connect(ctx.destination);
  osc.start(startAt);
  osc.stop(startAt + duration + 0.05);
}

/**
 * "Cha-ching" — two ascending triangle-wave tones, ~400ms total.
 * The fifth interval (1200Hz → 1800Hz) reads as a clear two-note
 * stinger without committing to a specific musical key.
 */
export function playCashRegister(volume: number = 0.5): void {
  const ctx = getContext();
  if (!ctx) return;
  try {
    const t0 = ctx.currentTime;
    const peak = 0.3 * volume;
    scheduleTone(ctx, "triangle", 1200, null, t0, 0.18, peak);
    scheduleTone(ctx, "triangle", 1800, null, t0 + 0.12, 0.22, peak);
  } catch {
    // Hardware failure, suspended context that did not resume,
    // exhausted node budget — fail silently per the contract.
  }
}

/**
 * Soft pop — single sine tone with a small descending pitch sweep,
 * ~150ms. Quick attack + exponential decay gives a percussive,
 * water-drop character rather than a sustained beep.
 */
export function playSoftPop(volume: number = 0.5): void {
  const ctx = getContext();
  if (!ctx) return;
  try {
    const t0 = ctx.currentTime;
    const peak = 0.4 * volume;
    scheduleTone(ctx, "sine", 900, 600, t0, 0.15, peak);
  } catch {
    // See playCashRegister.
  }
}

/**
 * Returns true once the AudioContext is in the "running" state.
 * The unlock banner uses this to know when to dismiss itself.
 * Returns false if the context has not been created yet — the first
 * play() call materializes it.
 */
export function isAudioUnlocked(): boolean {
  return cachedContext?.state === "running";
}

/**
 * Best-effort eager unlock. The unlock banner calls this on the
 * first user interaction so the AudioContext is "running" before
 * any sound plays, avoiding the brief glitch where the very first
 * notification might be silent.
 */
export function unlockAudio(): void {
  const ctx = getContext();
  if (!ctx) return;
  if (ctx.state === "suspended") {
    ctx.resume().catch(() => {});
  }
}
