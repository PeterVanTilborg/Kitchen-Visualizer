import fs from "fs";
import path from "path";
import sharp from "sharp";

// Configuration for free vs paid tier
export const IMAGE_CONFIG = {
  freeMaxWidth: 640,
  freeMaxHeight: 480,
  freeQuality: 60,
  paidMaxWidth: 2048,
  paidMaxHeight: 1536,
  paidQuality: 95,
  watermarkText: "Wrap Up AI",
  watermarkOpacity: 0.4,
};
// Wraps plain text into lines of at most maxChars characters, breaking on word boundaries.
function wrapText(text: string, maxChars: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    if (!current) {
      current = word;
    } else if (current.length + 1 + word.length <= maxChars) {
      current += " " + word;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

// Magic-byte sniff for partner-uploaded logos so we can build a correct
// data URL for the SVG <image> element without a separate async sharp
// metadata round-trip. Falls back to image/png; SVG renderers tolerate
// label drift on a valid binary, so the sniff just helps the common case.
function detectImageMime(buf: Buffer): string {
  if (buf.length >= 4 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47) return "image/png";
  if (buf.length >= 3 && buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF) return "image/jpeg";
  if (buf.length >= 12 && buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") return "image/webp";
  return "image/png";
}

// Creates the permanent disclaimer banner SVG composited at the bottom of every image
function createBannerSvg(
  imageWidth: number,
  colorName: string,
  manufacturer: string,
  colorNumber: string = "",
  options: { partnerLogoBuf?: Buffer | null; widgetMode?: boolean } = {},
): string {
  const widgetMode = options.widgetMode === true;
  const partnerLogoBuf = options.partnerLogoBuf;

  // Widget renders use a 50%-taller bar to accommodate a partner logo, the
  // existing color column, and a Powered-by line above the disclaimer.
  // Consumer and partner-dashboard renders keep the original compact bar.
  //
  // MIRROR: this footer-height formula is replicated client-side in
  // client/src/lib/share-composite.ts and client/public/widget.js so the
  // Share button can crop the footer-bar bytes off the bottom of the
  // rendered image before drawing the share composite. KEEP THE THREE IN
  // SYNC: any change to the multiplier or the clamp bounds here must also
  // be applied at the two client locations.
  const H = widgetMode
    ? Math.max(84, Math.min(120, Math.round(imageWidth * 0.105)))
    : Math.max(56, Math.min(80, Math.round(imageWidth * 0.07)));
  const pad = Math.max(10, Math.round(imageWidth * 0.015));

  // Logo slot uses the WrapUp aspect (viewBox 0 0 3081.62 647.59, ~4.76:1)
  // for both the inline SVG fallback AND the partner-image element. Partner
  // logos use preserveAspectRatio="xMinYMid meet" so they fit on height
  // without horizontal stretching, with a left-aligned letterbox if the
  // partner logo is taller-than-wide.
  const logoH = Math.round(H * 0.35);
  const logoScale = logoH / 647.59;
  const logoW = Math.round(3081.62 * logoScale);
  const logoY = Math.round((H - logoH) / 2);

  const d1x = pad + logoW + pad;
  const colorX = d1x + pad;
  const colorW = Math.round(imageWidth * 0.22);
  const d2x = colorX + colorW + pad;
  const discX = d2x + pad;
  const discW = Math.max(50, imageWidth - discX - pad);

  const manufFontSize = Math.max(9, Math.min(16, Math.round(H * 0.22)));
  const colorFontSize = Math.max(8, Math.min(14, Math.round(H * 0.18)));
  const discFontSize = Math.max(7, Math.min(11, Math.round(H * 0.13)));

  const colorY1 = Math.round(H * 0.38);
  const colorY2 = colorY1 + Math.round(manufFontSize * 1.45);

  const disclaimer =
    "Color renderings by WRAP-UP.AI are for indicative purposes only. " +
    "WRAP-UP.AI and its affiliates accept no liability for color inaccuracies " +
    "or deviations from actual materials. Use of this rendering implies acceptance of these limitations.";

  const charsPerLine = Math.max(20, Math.floor(discW / (discFontSize * 0.52)));
  const discLines = wrapText(disclaimer, charsPerLine);
  const discLineH = Math.round(discFontSize * 1.35);
  const totalDiscH = discLines.length * discLineH;

  // Right column: in widget mode, a Powered-by line stacks above the
  // disclaimer and the combined block centers vertically. Otherwise the
  // disclaimer alone centers vertically (existing behavior preserved).
  const poweredFontSize = widgetMode ? Math.round(manufFontSize * 0.75) : 0;
  const poweredLineH = widgetMode ? Math.round(poweredFontSize * 1.45) : 0;
  const blockTop = Math.round((H - (totalDiscH + poweredLineH)) / 2);
  const poweredY = blockTop + poweredFontSize;
  const discStartY = widgetMode
    ? blockTop + poweredLineH + discFontSize
    : Math.round((H - totalDiscH) / 2) + discFontSize;

  const escXml = (s: string) =>
    s.replace(/[<>&"]/g, (c) =>
      c === "<" ? "&lt;" : c === ">" ? "&gt;" : c === "&" ? "&amp;" : "&quot;"
    );

  const manufText = escXml(manufacturer || "");
  const colorText = escXml((colorNumber ? colorNumber + " " + colorName : colorName) || "");

  const dv = (x: number) =>
    `<line x1="${x}" y1="${Math.round(H * 0.2)}" x2="${x}" y2="${Math.round(H * 0.8)}" stroke="rgba(255,255,255,0.25)" stroke-width="1"/>`;

  const discTspans = discLines
    .map((line, i) => `<tspan x="${discX}" y="${discStartY + i * discLineH}">${escXml(line)}</tspan>`)
    .join("");

  // Logo element: partner logo as <image> when a non-empty Buffer was
  // supplied (widget renders for partners with logo_url set), otherwise
  // the inline WrapUp vector paths. Both occupy the same slot so the
  // middle column lands at a stable x regardless of which is rendered.
  const logoEl = partnerLogoBuf && partnerLogoBuf.length > 0
    ? `<image href="data:${detectImageMime(partnerLogoBuf)};base64,${partnerLogoBuf.toString("base64")}" x="${pad}" y="${logoY}" width="${logoW}" height="${logoH}" preserveAspectRatio="xMinYMid meet"/>`
    : `<g transform="translate(${pad},${logoY}) scale(${logoScale.toFixed(6)})">
      <path fill="#D2D915" d="M2138.7 128.82l0.07 -105.49 112.87 0c0,35.14 0.1,70.31 0.19,105.49l-113.13 0z"/>
      <path fill="#D2D915" d="M2412.6 317.19l-0.01 -163.7 112.87 0 0 168.53c0,53.4 -21.65,101.76 -56.65,136.75 -34.99,35.01 -83.35,56.66 -136.76,56.66 -26.99,0 -52.72,-5.54 -76.09,-15.56 -22.82,-9.78 -43.38,-23.82 -60.68,-41.12 -43.44,-38.35 -55.15,-83.35 -56.45,-129.1l0.12 -176.16 113.21 0c0.13,58.76 0.15,117.53 -0.43,176.2 1.95,20.7 11.39,39.12 25.83,52.28 14.13,12.88 33.08,20.72 54.49,20.72 21.79,0 42.04,-9.16 56.79,-23.93 14.55,-14.59 23.75,-34.64 23.75,-56.77l0 -4.79z"/>
      <path fill="white" d="M980.47 0l2.82 0.02 0 112.74c-0.94,-0.02 -1.88,-0.03 -2.82,-0.03 -42.75,0 -76.62,15.79 -100.25,41.19 -25.7,27.62 -39.42,66.68 -39.42,109.28l0 249.13 -112.89 0 0 -248.89c-0.14,-3.76 -0.22,-7.27 -0.22,-10.56 0,-66.97 26.33,-128.69 69.73,-174.41 43.39,-45.69 103.87,-75.38 172.18,-78.23 3.82,-0.16 7.45,-0.24 10.87,-0.24z"/>
      <path fill="white" d="M2509.28 114.44c-10.62,10.61 -25.3,17.18 -41.5,17.18 -16.2,0 -30.88,-6.56 -41.5,-17.18 -10.61,-10.63 -17.19,-25.29 -17.19,-41.49 0,-16.2 6.57,-30.88 17.19,-41.5 10.62,-10.62 25.3,-17.18 41.5,-17.18 16.2,0 30.88,6.57 41.5,17.18 10.62,10.61 17.19,25.3 17.19,41.5 0,16.2 -6.57,30.88 -17.19,41.49z"/>
      <path fill="white" d="M1823.7 21.96c69.81,0 133,28.3 178.75,74.04 45.75,45.74 74.05,108.95 74.05,178.74 0,69.8 -28.3,133 -74.05,178.75 -45.74,45.74 -108.94,74.03 -178.75,74.03 -20.26,0 -39.98,-2.38 -58.87,-6.89 -19.47,-4.65 -38.07,-11.55 -55.5,-20.41l-2.45 -1.25 0 -145.93 7.94 9.81c13.07,16.13 29.68,29.32 48.66,38.36 18.23,8.71 38.66,13.58 60.21,13.58 38.68,0 73.7,-15.68 99.04,-41.02 25.34,-25.34 41.02,-60.35 41.02,-99.03 0,-38.67 -15.68,-73.69 -41.02,-99.03 -25.34,-25.34 -60.36,-41.02 -99.04,-41.02 -42.75,0 -76.62,15.79 -100.25,41.19 -25.69,27.62 -39.42,66.69 -39.42,109.28l0 362.43 -112.87 0 0 -362.18c-0.15,-3.75 -0.22,-7.27 -0.22,-10.56 0,-66.96 26.33,-128.69 69.73,-174.4 43.39,-45.7 103.87,-75.38 172.17,-78.24 3.83,-0.16 7.46,-0.24 10.87,-0.24z"/>
      <path fill="white" d="M547.53 317.19l-0.01 -293.85 112.87 0 0 298.69c0,53.4 -21.65,101.76 -56.65,136.75 -34.99,35.01 -83.35,56.66 -136.76,56.66 -26.99,0 -52.72,-5.54 -76.09,-15.56 -22.82,-9.78 -43.38,-23.82 -60.68,-41.12 -17.3,17.31 -37.87,31.34 -60.7,41.12 -23.35,10 -49.09,15.56 -76.08,15.56 -53.4,0 -101.76,-21.65 -136.75,-56.65 -34.02,-34.02 -55.42,-80.65 -56.6,-132.28l-0.09 -303.17 112.88 0 0 294.56 -0.04 4.14c0.02,22.11 9.22,42.15 23.78,56.72 14.76,14.77 35.05,23.93 56.83,23.93 21.42,0 40.36,-7.84 54.49,-20.72 14.46,-13.17 23.9,-31.61 25.84,-52.32l0.23 -19.93 -0.02 -286.38 112.87 0c0,102.05 0.83,204.35 -0.19,306.35 1.95,20.7 11.39,39.12 25.83,52.28 14.13,12.88 33.08,20.72 54.49,20.72 21.79,0 42.04,-9.16 56.79,-23.93 14.55,-14.59 23.75,-34.64 23.75,-56.77l0 -4.79z"/>
      <path fill="white" d="M1074.55 96c45.75,-45.74 108.95,-74.04 178.75,-74.04 3.42,0 7.06,0.09 10.87,0.24 68.3,2.86 128.78,32.54 172.18,78.24 43.4,45.7 69.73,107.44 69.73,174.4 0,3.29 -0.08,6.81 -0.23,10.56l0.01 226.13 -112.88 0 0 -226.37c0,-42.6 -13.72,-81.66 -39.42,-109.28 -23.63,-25.4 -57.5,-41.19 -100.25,-41.19 -38.68,0 -73.69,15.69 -99.03,41.02 -25.34,25.34 -41.02,60.36 -41.02,99.03 0,38.68 15.68,73.69 41.02,99.03 25.35,25.35 60.36,41.02 99.03,41.02 21.57,0 41.99,-4.87 60.23,-13.58 18.96,-9.05 35.58,-22.23 48.65,-38.36l7.95 -9.81 0 145.93 -2.46 1.25c-17.44,8.86 -36.03,15.76 -55.5,20.41 -18.89,4.51 -38.61,6.89 -58.88,6.89 -69.8,0 -133,-28.29 -178.75,-74.03 -45.74,-45.75 -74.03,-108.95 -74.03,-178.75 0,-69.79 28.29,-133 74.03,-178.74z"/>
      <path fill="white" d="M2828.83 21.96c69.81,0 133,28.3 178.75,74.04 45.75,45.74 74.05,108.95 74.05,178.74 0,69.8 -28.3,133 -74.05,178.75 -45.74,45.74 -108.94,74.03 -178.75,74.03 -20.26,0 -39.98,-2.38 -58.87,-6.89 -19.47,-4.65 -38.07,-11.55 -55.5,-20.41l-2.45 -1.25 0 -145.93 7.94 9.81c13.07,16.13 29.68,29.32 48.66,38.36 18.23,8.71 38.66,13.58 60.21,13.58 38.68,0 73.7,-15.68 99.04,-41.02 25.34,-25.34 41.02,-60.35 41.02,-99.03 0,-38.67 -15.68,-73.69 -41.02,-99.03 -25.34,-25.34 -60.36,-41.02 -99.04,-41.02 -42.75,0 -76.62,15.79 -100.25,41.19 -25.69,27.62 -39.42,66.69 -39.42,109.28l0 362.43 -112.87 0 0 -362.18c-0.15,-3.75 -0.22,-7.27 -0.22,-10.56 0,-66.96 26.33,-128.69 69.73,-174.4 43.39,-45.7 103.87,-75.38 172.17,-78.24 3.83,-0.16 7.46,-0.24 10.87,-0.24z"/>
    </g>`;

  // Powered-by line: widget mode only. White, bold, ~75% of manuf font size,
  // sits above the disclaimer in the same right-column clip path.
  const poweredByEl = widgetMode
    ? `<text x="${discX}" y="${poweredY}" font-family="DejaVu Sans,sans-serif" font-weight="700" font-size="${poweredFontSize}" fill="#ffffff" clip-path="url(#cp2)">Powered by Wrap-up.ai</text>`
    : "";

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${imageWidth}" height="${H}">
    <defs>
      <clipPath id="cp1"><rect x="${colorX}" y="0" width="${colorW}" height="${H}"/></clipPath>
      <clipPath id="cp2"><rect x="${discX}" y="0" width="${discW}" height="${H}"/></clipPath>
    </defs>
    <rect width="${imageWidth}" height="${H}" fill="rgba(0,0,0,0.92)"/>
    ${logoEl}
    ${dv(d1x)}
    <text x="${colorX}" y="${colorY1}" font-family="DejaVu Sans,sans-serif" font-weight="700" font-size="${manufFontSize}" fill="rgba(255,255,255,0.95)" clip-path="url(#cp1)">${manufText}</text>
    <text x="${colorX}" y="${colorY2}" font-family="DejaVu Sans,sans-serif" font-size="${colorFontSize}" fill="rgba(255,255,255,0.70)" clip-path="url(#cp1)">${colorText}</text>
    ${dv(d2x)}
    ${poweredByEl}
    <text font-family="DejaVu Sans,sans-serif" font-size="${discFontSize}" fill="rgba(255,255,255,0.55)" clip-path="url(#cp2)">${discTspans}</text>
  </svg>`;
}

export async function processResultImage(
  base64ImageData: string,
  isPaidUser: boolean,
  colorName: string = "",
  manufacturer: string = "",
  colorNumber: string = "",
  options: { partnerLogoBuf?: Buffer | null; widgetMode?: boolean } = {},
): Promise<string> {
  // Local alias preserves the customWatermarkBuf identifier used by the
  // alpha-halve composite below (GR 9 — lines 143-157, commit 9e10655).
  const customWatermarkBuf = options.partnerLogoBuf;
  // Widget mode skips the photo-overlay watermark entirely; the partner
  // logo moves to the footer bar in createBannerSvg instead.
  const widgetMode = options.widgetMode === true;
  const base64 = base64ImageData.replace(/^data:image\/\w+;base64,/, "");
  const imageBuffer = Buffer.from(base64, "base64");

  // All users get the same high-quality output; free users get a watermark instead of lower resolution
  const config = { maxWidth: IMAGE_CONFIG.paidMaxWidth, maxHeight: IMAGE_CONFIG.paidMaxHeight, quality: IMAGE_CONFIG.paidQuality };

  let image = sharp(imageBuffer).rotate(); // auto-orient based on EXIF
  const metadata = await image.metadata();

  let width = metadata.width || config.maxWidth;
  let height = metadata.height || config.maxHeight;

  if (width > config.maxWidth || height > config.maxHeight) {
    const ratio = Math.min(config.maxWidth / width, config.maxHeight / height);
    width = Math.round(width * ratio);
    height = Math.round(height * ratio);
    image = image.resize(width, height);
  }

  // Watermark overlay — applied to every non-paid render. A partner-supplied
  // buffer (customWatermarkBuf) takes precedence over the default WRAP-UP.AI
  // logo, so partners can white-label the widget output with their own brand.
  console.log('[watermark] isPaidUser:', isPaidUser, '| customLogo:', !!customWatermarkBuf, '| img:', width, 'x', height);
  if (!isPaidUser && !widgetMode) {
    let watermarkBuf: Buffer;
    if (customWatermarkBuf && customWatermarkBuf.length > 0) {
      // Pre-multiply the partner logo's alpha channel by 0.5 so opaque logos
      // do not dominate the render. Applied only to partner-supplied logos;
      // the WRAP-UP.AI fallback below already has baked-in transparency.
      // Uses dest-in blend with a 128-alpha tile to halve whatever alpha the
      // uploaded PNG shipped with, independent of the logo's own design.
      watermarkBuf = await sharp(customWatermarkBuf)
        .ensureAlpha()
        .composite([{
          input: Buffer.from([255, 255, 255, 128]),
          raw: { width: 1, height: 1, channels: 4 },
          tile: true,
          blend: 'dest-in',
        }])
        .toBuffer();
    } else {
      // MIRROR: a copy of this asset lives at
      // client/public/wrapup-ai-watermark.png and is loaded by the client-
      // side share composite (share-composite.ts and widget.js) as the
      // bottom-left badge on the AFTER side of the share image. KEEP THE
      // TWO IN SYNC: any visual update to the watermark file here must also
      // be reflected at the client copy, otherwise the server-side render
      // watermark and the client-side share badge will drift.
      const watermarkPath = path.join(process.cwd(), "server", "assets", "wrapup watermark.png");
      watermarkBuf = fs.readFileSync(watermarkPath);
    }
    const targetW = Math.round(width * 0.30);
    const resized = await sharp(watermarkBuf).resize(targetW).toBuffer();
    image = image.composite([{ input: resized, gravity: "center" }]);
    image = sharp(await image.toBuffer()); // Finalize watermark before banner composite
    console.log('[watermark] DONE - composited centered at', targetW, 'px wide');
  }

  // Always composite the permanent disclaimer banner at the bottom.
  // The bannerH formula must match createBannerSvg so the composite top
  // aligns with the SVG's bottom edge — widget mode uses the 50%-taller
  // formula, every other caller uses the original.
  const bannerH = widgetMode
    ? Math.max(84, Math.min(120, Math.round(width * 0.105)))
    : Math.max(56, Math.min(80, Math.round(width * 0.07)));
  const bannerSvg = createBannerSvg(width, colorName, manufacturer, colorNumber, {
    partnerLogoBuf: options.partnerLogoBuf,
    widgetMode,
  });
  image = image.composite([{ input: Buffer.from(bannerSvg), top: height - bannerH, left: 0 }]);

  const outputBuffer = await image.jpeg({ quality: config.quality }).toBuffer();
  return `data:image/jpeg;base64,${outputBuffer.toString("base64")}`;
}
function createWatermarkSvg(imageWidth: number, imageHeight: number): string {
  // Logo viewBox: 0 0 6008.17 907.62 (aspect ratio ≈ 6.62:1)
  const logoVW = 6008.17;
  const logoVH = 907.62;

  // Scale logo to 65% of image width, centered
  const logoDisplayW = imageWidth * 0.65;
  const scale = logoDisplayW / logoVW;
  const logoDisplayH = logoVH * scale;
  const tx = (imageWidth - logoDisplayW) / 2;
  const ty = (imageHeight - logoDisplayH) / 2;
  const sd = 3; // shadow offset in image pixels

  const logoPaths = `<path fill-rule="nonzero" d="M3524.36 180.55l0.1 -147.85 158.2 0c0,49.25 0.14,98.54 0.26,147.85l-158.56 0z"/>
<path fill-rule="nonzero" d="M3908.25 444.55l-0.01 -229.43 158.19 0 0 236.2c0,74.84 -30.34,142.62 -79.39,191.66 -49.05,49.06 -116.82,79.41 -191.67,79.41 -37.83,0 -73.89,-7.77 -106.64,-21.8 -31.98,-13.71 -60.8,-33.38 -85.04,-57.64 -60.88,-53.74 -77.29,-116.82 -79.11,-180.94l0.17 -246.89 158.66 0c0.18,82.36 0.22,164.72 -0.61,246.95 2.73,29.01 15.97,54.83 36.2,73.27 19.8,18.05 46.36,29.04 76.37,29.04 30.53,0 58.92,-12.84 79.59,-33.54 20.39,-20.44 33.29,-48.55 33.29,-79.56l0 -6.72z"/>
<path fill-rule="nonzero" d="M1374.16 0l3.95 0.03 0 158.01c-1.32,-0.03 -2.63,-0.05 -3.95,-0.05 -59.92,0 -107.38,22.13 -140.51,57.73 -36.02,38.71 -55.25,93.45 -55.25,153.16l0 349.16 -158.21 0 0 -348.82c-0.19,-5.27 -0.31,-10.19 -0.31,-14.8 0,-93.86 36.9,-180.37 97.73,-244.44 60.81,-64.04 145.58,-105.64 241.31,-109.64 5.35,-0.23 10.44,-0.34 15.23,-0.34z"/>
<path fill-rule="nonzero" d="M4043.74 160.4c-14.88,14.87 -35.46,24.08 -58.16,24.08 -22.7,0 -43.28,-9.2 -58.16,-24.08 -14.88,-14.89 -24.09,-35.45 -24.09,-58.16 0,-22.71 9.21,-43.28 24.09,-58.17 14.88,-14.88 35.46,-24.08 58.16,-24.08 22.71,0 43.28,9.21 58.16,24.08 14.88,14.88 24.09,35.46 24.09,58.17 0,22.71 -9.21,43.27 -24.09,58.16z"/>
<path fill-rule="nonzero" d="M2555.98 30.78c97.83,0 186.41,39.66 250.52,103.77 64.12,64.1 103.78,152.69 103.78,250.51 0,97.83 -39.66,186.4 -103.78,250.52 -64.11,64.1 -152.69,103.76 -250.52,103.76 -28.4,0 -56.03,-3.33 -82.51,-9.65 -27.28,-6.52 -53.35,-16.18 -77.79,-28.61l-3.43 -1.75 0 -204.53 11.14 13.75c18.32,22.61 41.6,41.09 68.19,53.77 25.55,12.2 54.18,19.04 84.39,19.04 54.21,0 103.3,-21.97 138.8,-57.5 35.52,-35.52 57.49,-84.59 57.49,-138.8 0,-54.2 -21.97,-103.28 -57.49,-138.79 -35.51,-35.51 -84.59,-57.49 -138.8,-57.49 -59.91,0 -107.38,22.13 -140.51,57.73 -36.01,38.71 -55.25,93.46 -55.25,153.16l0 507.95 -158.2 0 0 -507.61c-0.2,-5.25 -0.31,-10.19 -0.31,-14.8 0,-93.84 36.9,-180.37 97.73,-244.43 60.82,-64.06 145.58,-105.64 241.3,-109.66 5.36,-0.22 10.45,-0.34 15.23,-0.34z"/>
<path fill-rule="nonzero" d="M767.38 444.55l-0.01 -411.85 158.2 0 0 418.62c0,74.84 -30.34,142.62 -79.39,191.66 -49.05,49.06 -116.82,79.41 -191.67,79.41 -37.83,0 -73.89,-7.77 -106.64,-21.8 -31.98,-13.71 -60.8,-33.38 -85.04,-57.64 -24.25,24.25 -53.07,43.93 -85.07,57.64 -32.73,14.02 -68.8,21.8 -106.63,21.8 -74.85,0 -142.62,-30.34 -191.66,-79.39 -47.68,-47.68 -77.68,-113.04 -79.33,-185.4l-0.13 -424.9 158.2 0 0 412.84 -0.06 5.8c0.03,30.99 12.92,59.08 33.33,79.5 20.69,20.71 49.12,33.53 79.65,33.53 30.02,0 56.57,-10.99 76.37,-29.03 20.26,-18.46 33.49,-44.3 36.21,-73.33l0.32 -27.93 -0.03 -401.38 158.2 0c0,143.03 1.17,286.4 -0.26,429.36 2.73,29.01 15.97,54.83 36.2,73.27 19.8,18.05 46.36,29.04 76.37,29.04 30.53,0 58.92,-12.84 79.59,-33.54 20.39,-20.44 33.29,-48.55 33.29,-79.56l0 -6.72z"/>
<path fill-rule="nonzero" d="M1506.02 134.55c64.12,-64.11 152.69,-103.77 250.52,-103.77 4.79,0 9.89,0.12 15.24,0.34 95.73,4.02 180.5,45.6 241.31,109.66 60.83,64.06 97.72,150.58 97.72,244.43 0,4.61 -0.11,9.55 -0.32,14.8l0.01 316.93 -158.2 0 0 -317.27c0,-59.7 -19.23,-114.45 -55.25,-153.16 -33.12,-35.61 -80.59,-57.73 -140.51,-57.73 -54.21,0 -103.28,21.98 -138.8,57.49 -35.52,35.52 -57.49,84.59 -57.49,138.79 0,54.21 21.97,103.28 57.49,138.8 35.52,35.53 84.59,57.5 138.8,57.5 30.23,0 58.85,-6.83 84.41,-19.04 26.58,-12.68 49.86,-31.16 68.18,-53.77l11.15 -13.75 0 204.53 -3.44 1.75c-24.44,12.42 -50.49,22.09 -77.78,28.61 -26.47,6.32 -54.11,9.65 -82.52,9.65 -97.83,0 -186.4,-39.65 -250.52,-103.76 -64.1,-64.12 -103.76,-152.69 -103.76,-250.52 0,-97.82 39.65,-186.4 103.76,-250.51z"/>
<path fill-rule="nonzero" d="M4491.6 30.78c97.83,0 186.41,39.66 250.52,103.77 64.12,64.1 103.78,152.69 103.78,250.51 0,97.83 -39.66,186.4 -103.78,250.52 -64.11,64.1 -152.69,103.76 -250.52,103.76 -28.4,0 -56.03,-3.33 -82.51,-9.65 -27.28,-6.52 -53.35,-16.18 -77.79,-28.61l-3.43 -1.75 0 -204.53 11.14 13.75c18.32,22.61 41.6,41.09 68.19,53.77 25.55,12.2 54.18,19.04 84.39,19.04 54.21,0 103.3,-21.97 138.8,-57.5 35.52,-35.52 57.49,-84.59 57.49,-138.8 0,-54.2 -21.97,-103.28 -57.49,-138.79 -35.51,-35.51 -84.59,-57.49 -138.8,-57.49 -59.91,0 -107.38,22.13 -140.51,57.73 -36.01,38.71 -55.25,93.46 -55.25,153.16l0 507.95 -158.2 0 0 -507.61c-0.2,-5.25 -0.31,-10.19 -0.31,-14.8 0,-93.84 36.9,-180.37 97.73,-244.43 60.82,-64.06 145.58,-105.64 241.3,-109.66 5.36,-0.22 10.45,-0.34 15.23,-0.34z"/>
<path d="M3028.2 374.65l0 0c0,43.5 35.59,79.1 79.1,79.1l202.88 0c43.5,0 79.1,-35.59 79.1,-79.1l0 -0c0,-43.5 -35.59,-79.1 -79.1,-79.1l-202.88 0c-43.5,0 -79.1,35.59 -79.1,79.1z"/>
<path fill-rule="nonzero" d="M5001.81 701.6c-14.88,14.87 -35.46,24.08 -58.16,24.08 -22.7,0 -43.28,-9.2 -58.16,-24.08 -14.88,-14.89 -24.09,-35.45 -24.09,-58.16 0,-22.71 9.21,-43.28 24.09,-58.17 14.88,-14.88 35.46,-24.08 58.16,-24.08 22.71,0 43.28,9.21 58.16,24.08 14.88,14.88 24.09,35.46 24.09,58.17 0,22.71 -9.21,43.27 -24.09,58.16z"/>
<path fill-rule="nonzero" d="M5171.33 134.55c64.12,-64.11 152.69,-103.77 250.52,-103.77 4.79,0 9.89,0.12 15.24,0.34 95.73,4.02 180.5,45.6 241.31,109.66 60.83,64.06 97.72,150.58 97.72,244.43 0,4.61 -0.11,9.55 -0.32,14.8l0.01 316.93 -158.2 0 0 -317.27c0,-59.7 -19.23,-114.45 -55.25,-153.16 -33.12,-35.61 -80.59,-57.73 -140.51,-57.73 -54.21,0 -103.28,21.98 -138.8,57.49 -35.52,35.52 -57.49,84.59 -57.49,138.79 0,54.21 21.97,103.28 57.49,138.8 35.52,35.53 84.59,57.5 138.8,57.5 30.23,0 58.85,-6.83 84.41,-19.04 26.58,-12.68 49.86,-31.16 68.18,-53.77l11.15 -13.75 0 204.53 -3.44 1.75c-24.44,12.42 -50.49,22.09 -77.78,28.61 -26.47,6.32 -54.11,9.65 -82.52,9.65 -97.83,0 -186.4,-39.65 -250.52,-103.76 -64.1,-64.12 -103.76,-152.69 -103.76,-250.52 0,-97.82 39.65,-186.4 103.76,-250.51z"/>
<path fill-rule="nonzero" d="M5984.09 160.4c-14.88,14.87 -35.46,24.08 -58.16,24.08 -22.7,0 -43.28,-9.2 -58.16,-24.08 -14.88,-14.89 -24.09,-35.45 -24.09,-58.16 0,-22.71 9.21,-43.28 24.09,-58.17 14.88,-14.88 35.46,-24.08 58.16,-24.08 22.71,0 43.28,9.21 58.16,24.08 14.88,14.88 24.09,35.46 24.09,58.17 0,22.71 -9.21,43.27 -24.09,58.16z"/>
<rect x="5848.58" y="215.12" width="158.19" height="501.81"/>`;

  const wPad = Math.round(logoDisplayW * 0.06);
  const hPad = Math.round(logoDisplayH * 0.2);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${imageWidth}" height="${imageHeight}">
    <rect x="${tx - wPad}" y="${ty - hPad}" width="${logoDisplayW + wPad * 2}" height="${logoDisplayH + hPad * 2}" fill="rgba(0,0,0,0.45)" rx="${hPad}"/>
    <g opacity="0.25" fill="black" transform="translate(${tx + sd} ${ty + sd}) scale(${scale})">
      ${logoPaths}
    </g>
    <g opacity="0.9" fill="white" transform="translate(${tx} ${ty}) scale(${scale})">
      ${logoPaths}
    </g>
  </svg>`;
}

export async function getHighResVersion(base64ImageData: string): Promise<string> {
  return processResultImage(base64ImageData, true);
}
