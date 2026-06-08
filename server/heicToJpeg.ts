// server/heicToJpeg.ts
//
// HEIC/HEIF → JPEG pre-processor (Option 3 for HEIC support).
//
// WHY THIS EXISTS
//   - Sharp's bundled libvips lacks the HEVC decoder (patent restriction —
//     the npm-installed sharp package intentionally omits HEVC support).
//   - Apt-installing libheif plugins doesn't help because Sharp uses its
//     own bundled libheif, not the system one.
//   - Rebuilding Sharp from source against a custom libvips creates a
//     version-skew time bomb (Sharp 0.34 wants libvips ≥8.16; Bookworm
//     ships 8.14).
//   - This module sidesteps the entire mess: detect HEIF on upload, shell
//     out to /usr/bin/heif-convert (provided by Debian's libheif-examples
//     package, which CAN decode HEVC via libheif-plugin-libde265), and
//     hand a regular JPEG to the existing Sharp pipeline.
//   - HEIC codepath is fully isolated. Non-HEIF uploads (the >99% case)
//     incur only a 12-byte file read and pass through unchanged; the
//     existing JPEG/PNG flow is byte-identical to before this module.
//
// WHEN THE FUNCTION IS CALLED
//   ensureNonHeif(req.file.path) is invoked at the very top of the render
//   handler — BEFORE any Sharp call, BEFORE Gemini, BEFORE the geo lookup,
//   BEFORE the DB INSERT. The returned path is used in place of
//   req.file.path for all downstream image processing.
//
// PRIVACY + GR 12
//   - This module handles user-uploaded image files only. No IPs, no env
//     vars, no credentials are touched anywhere in this module.
//   - ZERO console.log/warn/error calls. The caller decides what to log.
//   - heif-convert's own stdout/stderr is suppressed via stdio: "ignore".
//   - On failure, the thrown error carries no shell output, no file
//     contents, no internal paths beyond the input the function already
//     received. The caller maps this to a user-facing 400.

import { execFileSync } from "node:child_process";
import * as fs from "node:fs";
import * as fsp from "node:fs/promises";

// HEVC-tinted HEIF brand markers (bytes 8-11 of the file, after the
// "ftyp" marker at bytes 4-7). iPhone HEIC files use one of these.
// AVIF/AVIS deliberately NOT included — Sharp 0.34 handles AVIF via
// its bundled libvips (not HEVC; uses royalty-free AOM).
const HEVC_HEIF_BRANDS: readonly string[] = [
  "heic", // HEVC single image (most common iPhone HEIC)
  "heix", // HEVC extended (10-bit color, etc.)
  "heim", // HEVC multi-view
  "heis", // HEVC sequence
  "mif1", // Multi-Image File format (general HEIF wrapper, often HEVC inside)
  "msf1", // Multi-Sequence File format
];

export type HeicConvertResult =
  | { wasHeif: false; path: string }
  | { wasHeif: true; path: string; originalDeleted: true };

function namedError(name: string, message: string): Error {
  const err = new Error(message);
  err.name = name;
  return err;
}

function isHevcHeif(filePath: string): boolean {
  let fd: number | null = null;
  try {
    fd = fs.openSync(filePath, "r");
    const buf = Buffer.alloc(12);
    const bytesRead = fs.readSync(fd, buf, 0, 12, 0);
    if (bytesRead < 12) return false;
    // Bytes 4-7 should be "ftyp" (ISO base media file format marker).
    if (buf.subarray(4, 8).toString("ascii") !== "ftyp") return false;
    // Bytes 8-11 are the major brand.
    const brand = buf.subarray(8, 12).toString("ascii");
    return HEVC_HEIF_BRANDS.includes(brand);
  } catch {
    // Read error → assume not-HEIF, let Sharp report its own error later.
    return false;
  } finally {
    if (fd !== null) {
      try { fs.closeSync(fd); } catch { /* swallow close error */ }
    }
  }
}

export async function ensureNonHeif(
  inputPath: string,
): Promise<HeicConvertResult> {
  if (!isHevcHeif(inputPath)) {
    return { wasHeif: false, path: inputPath };
  }
  // HEVC-HEIF detected — convert to a JPEG sibling.
  const outputPath = inputPath + ".converted.jpg";
  try {
    // execFileSync (NOT execSync): args passed as array, no shell, no
    // injection surface. stdio: "ignore" — never echo heif-convert output.
    // 30s timeout — guards against pathological HEIF files.
    execFileSync("/usr/bin/heif-convert", ["-q", "90", inputPath, outputPath], {
      stdio: "ignore",
      timeout: 30_000,
    });
  } catch {
    // Best-effort cleanup of any partial output before throwing. Original
    // HEIF is preserved (caller's existing unlink-on-error logic handles it).
    await fsp.unlink(outputPath).catch(() => {});
    throw namedError("HeicConversionFailed", "HEIC conversion failed");
  }
  // Conversion succeeded. Delete the original HEIF so it doesn't linger.
  await fsp.unlink(inputPath).catch(() => {});
  return { wasHeif: true, path: outputPath, originalDeleted: true };
}
