// scripts/download-geolite2.ts
//
// Option D — runtime GeoLite2-City.mmdb downloader.
//
// EULA COMPLIANCE — MaxMind GeoLite2 free database.
// Same constraints as server/geoLookup.ts: city/country/lat/lng derived from
// this DB are for INTERNAL admin use only — no public display, no partner
// display, no third-party sharing. Commercial GeoIP2 license required for
// any public-facing surface (e.g. live render-city map).
//
// PRIVACY + GR 12 — credential handling.
//   - MAXMIND_ACCOUNT_ID + MAXMIND_LICENSE_KEY are read from process.env at
//     runtime ONLY. Never embedded in URLs (avoids URL-log leaks).
//     Authentication is sent as an HTTP Basic Auth header.
//   - This module makes ZERO console.log/warn/error calls. The caller
//     (server/index.ts boot integration) decides what to log, and is
//     contracted to log err.name only — never err.message, never env values.
//   - Error messages thrown from this module contain ZERO credentials,
//     ZERO URL query strings, ZERO IPs. Just status codes and named
//     conditions ("MaxMindDownloadFailed", "MissingMaxMindCredentials",
//     "MmdbNotFoundInTarball", etc.).
//   - Temporary file paths (.tmp, extracted folder) do not contain
//     credentials.

import { execSync } from "node:child_process";
import * as fs from "node:fs";
import * as fsp from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

export const DEFAULT_DEST_PATH = "/app/data/geolite2/GeoLite2-City.mmdb";
export const DEFAULT_MAX_AGE_DAYS = 7;
export const DEFAULT_TIMEOUT_MS = 30_000;

const MAXMIND_DOWNLOAD_URL =
  "https://download.maxmind.com/geoip/databases/GeoLite2-City/download?suffix=tar.gz";

export type EnsureOpts = {
  destPath?: string;
  maxAgeDays?: number;
  timeoutMs?: number;
};

export type EnsureResult = {
  path: string;
  downloaded: boolean;
};

function namedError(name: string, message: string): Error {
  const err = new Error(message);
  err.name = name;
  return err;
}

async function isFresh(filePath: string, maxAgeDays: number): Promise<boolean> {
  try {
    const stat = await fsp.stat(filePath);
    const ageMs = Date.now() - stat.mtimeMs;
    const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;
    return ageMs < maxAgeMs;
  } catch {
    return false;
  }
}

function basicAuthHeader(accountId: string, licenseKey: string): string {
  const encoded = Buffer.from(`${accountId}:${licenseKey}`).toString("base64");
  return `Basic ${encoded}`;
}

async function downloadTarball(
  authHeader: string,
  tmpPath: string,
  timeoutMs: number,
): Promise<void> {
  const res = await fetch(MAXMIND_DOWNLOAD_URL, {
    headers: { Authorization: authHeader },
    redirect: "follow",
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) {
    // Status code only — never URL or auth in the message.
    throw namedError(
      "MaxMindDownloadFailed",
      `HTTP ${res.status} from MaxMind download endpoint`,
    );
  }
  if (!res.body) {
    throw namedError("MaxMindDownloadFailed", "Empty response body");
  }
  await pipeline(Readable.fromWeb(res.body as any), fs.createWriteStream(tmpPath));
}

async function extractMmdbFromTarball(
  tarPath: string,
  extractDir: string,
  destPath: string,
): Promise<void> {
  await fsp.mkdir(extractDir, { recursive: true });
  // Shell-out to /usr/bin/tar — available on node:22-bookworm-slim base.
  // -x extract, -z gzip, -f file. No values from env are interpolated here.
  execSync(`tar -xzf "${tarPath}" -C "${extractDir}"`, { stdio: "ignore" });

  // Tarball contents: GeoLite2-City_YYYYMMDD/GeoLite2-City.mmdb
  const entries = await fsp.readdir(extractDir);
  const folder = entries.find((e) => e.startsWith("GeoLite2-City_"));
  if (!folder) {
    throw namedError(
      "MmdbNotFoundInTarball",
      "No GeoLite2-City_* folder in extracted archive",
    );
  }
  const mmdbSrc = path.join(extractDir, folder, "GeoLite2-City.mmdb");
  if (!fs.existsSync(mmdbSrc)) {
    throw namedError(
      "MmdbNotFoundInTarball",
      "GeoLite2-City.mmdb missing inside extracted folder",
    );
  }

  // Atomic move: rename within the same filesystem is atomic on POSIX.
  await fsp.rename(mmdbSrc, destPath);
}

export async function ensureGeoLite2Db(
  opts: EnsureOpts = {},
): Promise<EnsureResult> {
  const destPath = opts.destPath ?? DEFAULT_DEST_PATH;
  const maxAgeDays = opts.maxAgeDays ?? DEFAULT_MAX_AGE_DAYS;
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  // Fast path: file exists and is fresh — skip the download entirely.
  if (await isFresh(destPath, maxAgeDays)) {
    return { path: destPath, downloaded: false };
  }

  const accountId = process.env.MAXMIND_ACCOUNT_ID;
  const licenseKey = process.env.MAXMIND_LICENSE_KEY;
  if (!accountId || !licenseKey) {
    // No credential values in the message — just the named condition.
    throw namedError(
      "MissingMaxMindCredentials",
      "MAXMIND_ACCOUNT_ID and/or MAXMIND_LICENSE_KEY not set",
    );
  }

  const authHeader = basicAuthHeader(accountId, licenseKey);
  const destDir = path.dirname(destPath);
  await fsp.mkdir(destDir, { recursive: true });

  // Use os.tmpdir() for the .tar.gz and extraction work area so we don't
  // leave intermediate state next to the final .mmdb on the data volume.
  const work = await fsp.mkdtemp(path.join(os.tmpdir(), "geolite2-"));
  const tarPath = path.join(work, "GeoLite2-City.tar.gz");
  const extractDir = path.join(work, "extract");

  try {
    await downloadTarball(authHeader, tarPath, timeoutMs);
    await extractMmdbFromTarball(tarPath, extractDir, destPath);
  } finally {
    // Best-effort cleanup; any error here is irrelevant to the caller.
    await fsp.rm(work, { recursive: true, force: true }).catch(() => {});
  }

  return { path: destPath, downloaded: true };
}
