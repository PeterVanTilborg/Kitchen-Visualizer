// ============================================================================
// DEPRECATED as of Item 0c Session 2 (PR <PR-TBD>).
//
// This module is no longer called by any consumer of the codebase.
// The fingerprint-based free-tier counting was replaced by cookie-based
// verification via consumer_verified_emails (see useConsumerVerification
// hook and EmailVerificationGate component).
//
// This file is preserved temporarily as a rollback safety net. Safe to
// delete in a separate cleanup PR after Session 2 has been stable in
// production for 48+ hours.
//
// Last touchpoint removed: client/src/pages/home.tsx (Session 2 Commit 5).
// ============================================================================

const FINGERPRINT_KEY = "wrap-up-ai_fingerprint";

export function getFingerprint(): string {
  let fingerprint = localStorage.getItem(FINGERPRINT_KEY);

  if (!fingerprint) {
    fingerprint = generateFingerprint();
    localStorage.setItem(FINGERPRINT_KEY, fingerprint);
  }

  return fingerprint;
}

function generateFingerprint(): string {
  const components: string[] = [];

  components.push(navigator.userAgent);
  components.push(navigator.language);
  components.push(String(screen.width));
  components.push(String(screen.height));
  components.push(String(screen.colorDepth));
  components.push(String(new Date().getTimezoneOffset()));
  components.push(navigator.hardwareConcurrency?.toString() || "unknown");
  components.push(navigator.platform || "unknown");

  const randomPart = Math.random().toString(36).substring(2, 15);
  const timestamp = Date.now().toString(36);

  const hash = simpleHash(components.join("|") + randomPart + timestamp);
  return hash;
}

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36) + Date.now().toString(36).slice(-6);
}
