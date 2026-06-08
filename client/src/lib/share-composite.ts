// Share-to-Instagram composite + caption helpers (Tier 1 Growth Loops).
//
// MIRROR: client/public/widget.js has the inline vanilla-JS equivalent of
// this module (functions prefixed with _share*). KEEP THE TWO IN SYNC:
// caption template, composite geometry, footer-height formula, and PNG
// logo path are shared design contracts. If you change either, change the
// other.
//
// buildShareComposite: side-by-side before/after JPEG. The render bytes the
// server returns include a baked-in footer-bar (color name, manufacturer,
// disclaimer, partner/WrapUp branding — see server/imageProcessing.ts
// createBannerSvg). For the share image we crop that footer off so the
// composite shows only the rendered car. Output canvas is W × H_eff where
// H_eff = H - footerH; both halves are H_eff tall. The render's right half
// is drawn pixel-perfect from a top-anchored source rect; the original is
// cropped to the SAME vertical proportion (top H_eff/H of its rows), then
// its left half is stretched to fill the LEFT half of the canvas. This
// preserves vertical-content symmetry across both halves at the cost of
// possible aspect-ratio distortion on the left when the original and
// render do not share aspect — see the inline comment in the function
// for the full rationale. 2px white divider with dark glow on the seam
// (mirrors the in-app slider's shadow-[0_0_8px_rgba(0,0,0,0.8)] visual).
// Subtle WrapUp AI watermark bottom-left of the AFTER side, drawn
// directly on the photo (no badge background — accepted legibility
// tradeoff on light backgrounds).
//
// buildShareCaption: Instagram caption with @go_wrapup mention, three brand
// hashtags (#wrapupAI #wrapup #instantcolorchanger) always present, and an
// optional Wrap-color line plus per-color hashtags when manufacturer +
// colorName are both available. Stripping uses Unicode \p{L}\p{N} so accented
// characters survive (e.g. Müller → #Müller).
//
// CORS / canvas tainting: caller must pass HTMLImageElements loaded from
// same-origin sources OR cross-origin sources fetched with
// crossOrigin="anonymous" against an Access-Control-Allow-Origin response.
// On the consumer surface today the render is a same-origin data: URL and
// the original is a same-origin blob: URL — no taint. The widget surface
// loads cross-origin from API_BASE and uses crossOrigin="anonymous" + a
// CORS-aware server response.

const LOGO_URL = "/wrapup-ai-watermark.png";

let cachedLogo: HTMLImageElement | null = null;
let logoLoadPromise: Promise<HTMLImageElement> | null = null;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Image load failed: ${src}`));
    img.src = src;
  });
}

function loadLogo(): Promise<HTMLImageElement> {
  if (cachedLogo) return Promise.resolve(cachedLogo);
  if (!logoLoadPromise) {
    logoLoadPromise = loadImage(LOGO_URL).then((img) => {
      cachedLogo = img;
      return img;
    }).catch((err) => {
      logoLoadPromise = null;
      throw err;
    });
  }
  return logoLoadPromise;
}

// Idempotent. Caller (e.g. ResultDisplay's mount-time useEffect) invokes once
// so the click handler stays under the transient-activation budget.
export function preloadShareAssets(): Promise<HTMLImageElement> {
  return loadLogo();
}

// MIRROR: this footer-height formula is the canonical version at
// server/imageProcessing.ts:60-62 (function createBannerSvg). The widget
// inline equivalent is in client/public/widget.js _shareBuildComposite.
// KEEP THE THREE IN SYNC.
function footerHeightForSurface(surface: "consumer" | "widget", W: number): number {
  return surface === "widget"
    ? Math.max(84, Math.min(120, Math.round(W * 0.105)))
    : Math.max(56, Math.min(80, Math.round(W * 0.07)));
}

export interface BuildShareCompositeOptions {
  // Required: which surface produced the render. Determines the footer-bar
  // height that gets cropped off the bottom — consumer/partner-dashboard
  // renders use the compact bar, widget renders use the 50%-taller bar.
  surface: "consumer" | "widget";
  // Override default JPEG quality. Default 0.85 — produces ~250-400 KB at
  // 1500x1000, well within Web Share file budgets.
  quality?: number;
}

export async function buildShareComposite(
  original: HTMLImageElement,
  render: HTMLImageElement,
  opts: BuildShareCompositeOptions,
): Promise<Blob> {
  const W = render.naturalWidth;
  const H = render.naturalHeight;
  if (!W || !H) throw new Error("Render image has zero dimensions");
  const oW = original.naturalWidth;
  const oH = original.naturalHeight;
  if (!oW || !oH) throw new Error("Original image has zero dimensions");

  const footerH = footerHeightForSurface(opts.surface, W);
  const H_eff = Math.max(1, H - footerH);

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H_eff;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2d context unavailable");

  // ── Symmetric top-anchored crop. The render loses its bottom footerH
  // pixels — a (1 - H_eff/H) proportion of vertical content. We apply the
  // SAME proportion crop to the original so both halves show the same
  // vertical slice of their respective sources. Source rect on the
  // original is anchored to (0, 0) and extends through the LEFT HALF of
  // the original (oW/2) and the TOP H_eff/H proportion (oH * cropProp).
  // No cover-crop, no centering — straight top-left top-down crop.
  //
  // Known limitation: this preserves vertical-content symmetry between
  // the two halves but does NOT preserve aspect ratio when the original's
  // aspect (oW/oH) differs from the render's aspect (W/H). drawImage will
  // then non-uniformly scale the original to fit (W/2, H_eff), producing
  // visible horizontal or vertical distortion on the LEFT (BEFORE) side.
  // The previous cover-crop implementation hid this distortion at the
  // cost of asymmetric vertical content (left half showed centered crop;
  // right half showed top-anchored crop). Vertical symmetry was the
  // explicit user requirement; aspect-mismatch distortion on arbitrary
  // user uploads is the accepted tradeoff.
  const cropProportion = H_eff / H;
  const origCropH = oH * cropProportion;
  ctx.drawImage(
    original,
    0, 0, oW / 2, origCropH,
    0, 0, W / 2, H_eff,
  );

  // ── Right half: top portion of render's right half, drawn pixel-perfect.
  // Source rect excludes the bottom footerH rows; destination matches.
  ctx.drawImage(
    render,
    W / 2, 0, W / 2, H_eff,
    W / 2, 0, W / 2, H_eff,
  );

  // ── Divider: 2px white vertical line at the seam, with the same dark glow
  // the consumer slider uses. shadow* applied around the rect draw, then
  // reset so it does not leak into the logo draw below.
  ctx.save();
  ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
  ctx.shadowBlur = 8;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(W / 2 - 1, 0, 2, H_eff);
  ctx.restore();

  // ── WrapUp AI watermark logo: bottom-left of the AFTER (right) half,
  // flush against the divider, anchored to the post-crop bottom edge.
  // Logo height = 4% of effective canvas height (subtle attribution, not
  // a foreground element). Drawn directly on the photo — no badge
  // background. The PNG asset (658×152, RGBA) carries its own alpha so
  // transparent pixels reveal the photo underneath cleanly.
  //
  // Legibility tradeoff: without the previous semi-transparent black
  // background, logo readability depends on the underlying photo content.
  // On dark wraps and dim scenes the white watermark reads cleanly; on
  // light scenes (white wraps, sky, bright environments) the logo may be
  // hard to see. Accepted tradeoff for a cleaner share image.
  try {
    const logo = await loadLogo();
    const logoH = H_eff * 0.04;
    const logoAspect = logo.naturalWidth / logo.naturalHeight || (658 / 152);
    const logoW = logoH * logoAspect;
    const marginFromDivider = 8;
    const marginFromBottom = 8;
    const logoX = W / 2 + marginFromDivider;
    const logoY = H_eff - marginFromBottom - logoH;
    ctx.drawImage(logo, logoX, logoY, logoW, logoH);
  } catch {
    // Logo failed to load — skip silently. The composite still ships,
    // just without the WrapUp watermark. Console-warn happens at the
    // caller's preload site, not here.
  }

  const quality = opts.quality ?? 0.85;
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Canvas toBlob returned null"));
      },
      "image/jpeg",
      quality,
    );
  });
}

// ─────────────────────────────────────────────────────────────────────────

export interface BuildShareCaptionInput {
  surface: "consumer" | "widget";
  manufacturer?: string | null;
  colorName?: string | null;
}

// Strips spaces and all non-alphanumeric characters while preserving original
// casing. Unicode-aware: \p{L}\p{N} keeps accented letters and digits. Built
// via the RegExp constructor because tsconfig has no explicit target and the
// /u flag literal trips TS1501 at type-check time; constructor form is
// parsed at runtime where every browser we ship to supports the u flag.
const HASHTAG_STRIP_RE = new RegExp("[^\\p{L}\\p{N}]", "gu");
function toHashtag(s: string): string {
  return s.replace(HASHTAG_STRIP_RE, "");
}

export function buildShareCaption(input: BuildShareCaptionInput): string {
  const m = (input.manufacturer ?? "").trim();
  const c = (input.colorName ?? "").trim();

  const lines: string[] = [
    "Check out my custom wrap visualization made with @go_wrapup",
  ];

  if (m && c) {
    lines.push("");
    lines.push(`Wrap-color: ${m} ${c}`);
  }

  const tags: string[] = ["#wrapupAI", "#wrapup", "#instantcolorchanger"];
  if (m) {
    const stripped = toHashtag(m);
    if (stripped) tags.push(`#${stripped}`);
  }
  if (c) {
    const stripped = toHashtag(c);
    if (stripped) tags.push(`#${stripped}`);
  }
  lines.push("");
  lines.push(tags.join(" "));

  return lines.join("\n");
}
