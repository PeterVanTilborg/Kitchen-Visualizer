// server/geoLookup.ts
//
// EULA COMPLIANCE — MaxMind GeoLite2 free database.
//
// Permitted uses (this module is safe for):
//   - Internal admin dashboard display to admin and superadmin users
//   - Server-side analytics queries (counts, aggregates) not exposed publicly
//   - Database storage on render rows
//
// Prohibited (do NOT add code paths that):
//   - Display city/country/lat/lng to any user role other than admin or superadmin
//     (this includes partner users, unauthenticated users, and any future roles
//     not explicitly granted access)
//   - Expose geo data in any partner-facing API response
//   - Surface geo data on any public-facing page (wrap-up.ai consumer surface,
//     partner widget at 2wrap.com/ai, public marketing pages)
//   - Send geo values to third-party analytics / observability tools
//   - Build a public live map of render locations (would require commercial
//     GeoIP2 license — deferred per Item 0b PR scope)
//
// PRIVACY — IP handling
//   - The client IP is taken as input (req.ip) and used ONLY for the
//     in-process MaxMind lookup. It is NEVER stored, NEVER logged to stdout
//     (GR 12), NEVER returned to the caller. The IP value lives only in
//     the request-scope variable and is discarded when the request completes.
//   - Only the derived geo values (city, country, lat, lng) are persisted.
//   - Lookup failures (private IPs, invalid format, DB miss) silently return
//     null values; the render flow always proceeds (D1 decision).
//
// PERFORMANCE
//   - First call: ~150ms cold-start (mmdb load from disk into memory)
//   - Subsequent calls: microseconds (in-memory binary tree walk)
//   - Memory after init: ~70 MB resident (the GeoLite2-City DB)

import * as fs from "node:fs";
import { Reader } from "@maxmind/geoip2-node";
import { DEFAULT_DEST_PATH } from "../scripts/download-geolite2";

export type GeoResult = {
  city: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
};

const NULL_RESULT: GeoResult = {
  city: null,
  country: null,
  latitude: null,
  longitude: null,
};

// Singleton lazy-loaded MaxMind Reader. Promise-cached so concurrent
// first-callers don't race the FS read. Self-healing: on init failure
// the cache is cleared so the next call can retry — useful if a
// transient FS issue at boot resolves later.
let readerPromise: Promise<Reader> | null = null;

async function getReader(): Promise<Reader> {
  if (!readerPromise) {
    readerPromise = (async () => {
      const dbPath = DEFAULT_DEST_PATH;
      if (!fs.existsSync(dbPath)) {
        throw new Error("GeoLite2-City.mmdb missing at expected path — runtime download may have failed (check boot logs for [boot] GeoLite2)");
      }
      return Reader.open(dbPath);
    })().catch((err) => {
      // Init failures are rare and operationally important — log error type
      // only (err.name; never err.message which can echo file paths, env
      // hints, or IPs). console.warn because this is recoverable: the
      // readerPromise reset below allows the next call to retry.
      console.warn("[geoLookup] Reader init failed:", err?.name ?? "unknown");
      readerPromise = null;
      throw err;
    });
  }
  return readerPromise;
}

export async function lookupGeo(
  ip: string | null | undefined,
): Promise<GeoResult> {
  if (!ip) return NULL_RESULT;
  try {
    const reader = await getReader();
    const r = reader.city(ip);
    // Defensive null-coalesce: every field is optional in the upstream type.
    // Cast lat/lng to number explicitly even though the lib already returns
    // numbers, to keep the contract local to this module.
    const lat = r.location?.latitude;
    const lng = r.location?.longitude;
    return {
      city: r.city?.names?.en ?? null,
      country: r.country?.isoCode ?? null,
      latitude: typeof lat === "number" ? lat : null,
      longitude: typeof lng === "number" ? lng : null,
    };
  } catch {
    // Silent failure (per privacy + GR 12 in module header):
    //   - Do NOT log the IP
    //   - Do NOT log err.message (can echo the IP / file path / env hints)
    //   - Do NOT log err.name on the lookup path (AddressNotFoundError /
    //     ValueError fire on every health-check from Railway's internal IPs;
    //     would spam logs)
    // Init failures ARE logged (see getReader().catch above) — that's the
    // operationally-important signal. Per-call lookup failures stay silent.
    return NULL_RESULT;
  }
}
