import type { Express, Request, Response } from "express";
if (!process.env.PARTNER_TOPUP_STRIPE_PRICE_ID) {
  console.warn(
    "[partnerRoutes] WARNING: PARTNER_TOPUP_STRIPE_PRICE_ID env var is not set. Auto top-up Stripe checkout will fail."
  );
}
import { db } from "./db";
import { sql } from "drizzle-orm";
import multer from "multer";
import path from "path";
import fs from "fs";
import sharp from "sharp";
import crypto from "crypto";
import { GoogleGenAI } from "@google/genai";
import { processResultImage } from "./imageProcessing";
import { lookupGeo } from "./geoLookup";
import { ensureNonHeif } from "./heicToJpeg";
import { getUncachableStripeClient } from "./stripeClient";
import { isAuthenticated } from "./auth";
import { sendVerificationCodeEmail, sendRenderResultEmail } from './notificationService';
import { auditLog } from "./adminAudit";
import { createIpRateLimiters, createPartnerRateLimiters } from "./rateLimit";
import { rejectDisposableEmail } from "./emailValidation";
import { verifyEmailVelocityLimiter } from "./verifyEmailVelocity";

// Render endpoint rate limiters. Widget surface is IP-keyed (widget customers
// are anonymous at the request boundary). Partner direct surface is keyed by
// sha256(Bearer embed_token) with a 3x multiplier so a paid partner gets its
// own bucket and is not throttled by general internet noise sharing its IP.
const widgetRenderLimiters = createIpRateLimiters();
const partnerRenderLimiters = createPartnerRateLimiters();

// Serialise a JS string array into a Postgres array literal string, so it can
// be safely passed as a single scalar parameter in a parameterised query and
// cast via ::text[] inside ANY(). Drizzle/node-postgres otherwise flattens JS
// arrays via Array#toString() when binding, turning ['3M 2080'] into the
// scalar '3M 2080' which then fails the array-literal cast.
// Backslash is escaped FIRST so subsequent escapes are not re-escaped.
function toPgTextArray(arr: string[]): string {
  return '{' + arr.map(s =>
    '"' + String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"'
  ).join(',') + '}';
}

// =========== Constants ===========

const PARTNER_PRICE_ID = process.env.PARTNER_STRIPE_PRICE_ID || "";

if (!PARTNER_PRICE_ID) {
  console.warn(
    "[partnerRoutes] WARNING: PARTNER_STRIPE_PRICE_ID env var is not set. " +
    "Partner Stripe checkout will not work until this is configured in Railway."
  );
}

const PARTNER_ANNUAL_PRICE_ID = process.env.PARTNER_ANNUAL_STRIPE_PRICE_ID || "";
if (!PARTNER_ANNUAL_PRICE_ID) {
  console.warn(
    "[partnerRoutes] WARNING: PARTNER_ANNUAL_STRIPE_PRICE_ID env var is not set. " +
    "Annual partner checkout will not work until this is configured in Railway."
  );
}

if (!process.env.PARTNER_STRIPE_WEBHOOK_SECRET) {
  console.warn(
    "[partnerRoutes] WARNING: PARTNER_STRIPE_WEBHOOK_SECRET env var is not set. Partner webhook signature verification will fail."
  );
}

const upload = multer({ dest: "uploads/" });

// =========== URL helpers ===========

/**
 * Normalise a URL to just scheme + host (lowercase).
 * e.g. "https://www.2wrap.com/some/page?q=1" — "https://www.2wrap.com"
 */
function normalizeOrigin(url: string): string {
  try {
    const parsed = new URL(url.startsWith("http") ? url : `https://${url}`);
    return `${parsed.protocol}//${parsed.host}`.toLowerCase();
  } catch {
    return url.toLowerCase().trim();
  }
}

/**
 * Returns true only if the request's Origin or Referer header matches the
 * partner's registered allowedDomain. Called on EVERY embed endpoint.
 */
function validateEmbedOrigin(req: Request, allowedDomain: string): boolean {
  // Extract scheme+hostname from the registered domain
  let registeredOrigin: string;
  try {
    registeredOrigin = new URL(allowedDomain).origin;
  } catch {
    registeredOrigin = allowedDomain;
  }

  const rawOrigin = (req.headers['origin'] || req.headers['referer']) as string | undefined;

  // Case 2: no Origin or Referer — allow direct browser visits
  if (!rawOrigin) return true;

  // Case 1 / 3: compare scheme+hostname only
  try {
    return new URL(rawOrigin).origin === registeredOrigin;
  } catch {
    return false;
  }
}

// =========== Auth middleware ===========

/**
 * Requires a logged-in WrapUp user who has a partner record.
 * Attaches partner row to req.partner.
 */
async function requirePartnerAuth(req: Request, res: Response, next: Function) {
  if (!req.isAuthenticated || !req.isAuthenticated() || !(req as any).user) {
    return res.status(401).json({ message: "Authentication required" });
  }
  const userId = (req as any).user.id;
  try {
    const result = await db.execute(
      sql`SELECT * FROM partners WHERE user_id = ${userId} LIMIT 1`
    );
    if (!result.rows.length) {
      return res.status(403).json({ message: "No partner account found for this user" });
    }
    (req as any).partner = result.rows[0];
    next();
  } catch (err) {
    console.error("[partnerRoutes] requirePartnerAuth error:", err);
    res.status(500).json({ message: "Server error" });
  }
}

// =========== Image processing helpers ===========

async function normalizeImageForGemini(
  imagePath: string
): Promise<{ base64: string; mimeType: string }> {
  const MAX_DIMENSION = 1536;
  const buffer = await sharp(imagePath)
    .rotate()
    .resize(MAX_DIMENSION, MAX_DIMENSION, { fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 90 })
    .toBuffer();
  return { base64: buffer.toString("base64"), mimeType: "image/jpeg" };
}

async function loadColorSwatchForGemini(
  imageUrl: string
): Promise<{ base64: string; mimeType: string } | null> {
  const MAX_DIMENSION = 512;
  try {
    let inputBuffer: Buffer;
    if (imageUrl.startsWith("data:")) {
      const commaIdx = imageUrl.indexOf(",");
      if (commaIdx === -1) return null;
      inputBuffer = Buffer.from(imageUrl.slice(commaIdx + 1), "base64");
    } else {
      const decodedUrl = decodeURIComponent(imageUrl);
      const localPath = path.join(process.cwd(), "client/public", decodedUrl);
      if (!fs.existsSync(localPath)) return null;
      inputBuffer = fs.readFileSync(localPath);
    }
    const image = sharp(inputBuffer);
    const metadata = await image.metadata();
    let w = metadata.width || MAX_DIMENSION;
    let h = metadata.height || MAX_DIMENSION;
    if (w > h ? w > MAX_DIMENSION : h > MAX_DIMENSION) {
      if (w > h) { h = Math.round(h * (MAX_DIMENSION / w)); w = MAX_DIMENSION; }
      else { w = Math.round(w * (MAX_DIMENSION / h)); h = MAX_DIMENSION; }
    }
    const buf = await image.resize(w, h).jpeg({ quality: 90 }).toBuffer();
    return { base64: buf.toString("base64"), mimeType: "image/jpeg" };
  } catch {
    return null;
  }
}

async function generateCarWrapWithGemini(
  imagePath: string,
  colorName: string,
  colorHex: string,
  colorSwatchBase64: string | null,
  referenceImageData: string | null,
  options: string[]
): Promise<string> {
  const { base64, mimeType } = await normalizeImageForGemini(imagePath);
  const optionsText = options.length > 0 ? `Additional modifications: ${options.join(", ")}.` : "";
  const parts: any[] = [];
  const swatchData = colorSwatchBase64 ? await loadColorSwatchForGemini(colorSwatchBase64) : null;

  const CORE_RULES = `CRITICAL INSTRUCTIONS - DO NOT ALTER ANYTHING EXCEPT WHAT IS SPECIFIED:
- This is a color/wrap change ONLY - preserve everything else exactly as-is
- DO NOT change the camera angle, perspective, or viewpoint in any way
- DO NOT change whether doors, hood, trunk, or windows are open or closed
- DO NOT add, remove, or reposition any vehicle parts or accessories
- DO NOT change the background, environment, or lighting setup
- DO NOT change the vehicle's position, orientation, or stance
- Keep the exact same reflections and shadow directions
- Preserve all wheel designs, tire positions, and hubcaps exactly
- Keep all badges, emblems, and logos in their exact positions

WHAT TO CHANGE:
- Apply the wrap color to all painted body panels only
- If "Chrome Delete" is specified: change chrome trim to body-color or black
- If "Window Tint" is specified: darken the window glass

OUTPUT FORMAT - VERY IMPORTANT:
- Output ONLY ONE image showing the modified car
- The output image must have the SAME dimensions and aspect ratio as the input car image
- Do NOT create a comparison, collage, side-by-side, or before/after image
- Just output the single edited car image with the wrap applied
Output the modified image maintaining photorealistic quality.`;

  if (swatchData) {
    parts.push({
      text: `Task: Edit the image of the car to apply a "${colorName}" car wrap. The second image is the color/finish reference swatch. ${referenceImageData ? "The third image is a real car wrapped in this color — use ONLY for color/finish reference." : ""}\n${optionsText}\n\n${CORE_RULES}`,
    });
    parts.push({ inlineData: { mimeType, data: base64 } });
    parts.push({ inlineData: { mimeType: swatchData.mimeType, data: swatchData.base64 } });
    if (referenceImageData) {
      const refMatch = referenceImageData.match(/^data:([^;]+);base64,(.+)$/);
      if (refMatch) parts.push({ inlineData: { mimeType: refMatch[1], data: refMatch[2] } });
    }
  } else {
    parts.push({
      text: `Task: Edit this image to apply a ${colorName} (${colorHex}) car wrap.\n${optionsText}\n\n${CORE_RULES.replace("Apply the wrap color to all painted body panels only", `Apply the ${colorName} color (hex ${colorHex}) to all painted body panels only`)}`,
    });
    parts.push({ inlineData: { mimeType, data: base64 } });
    if (referenceImageData) {
      const refMatch = referenceImageData.match(/^data:([^;]+);base64,(.+)$/);
      if (refMatch) parts.push({ inlineData: { mimeType: refMatch[1], data: refMatch[2] } });
    }
  }

  const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
  const response = await genAI.models.generateContent({
    model: "gemini-3.1-flash-image-preview",
    contents: [{ role: "user", parts }],
    config: {
      responseModalities: ["Text", "Image"],
    } as any,
  });

  const imagePart = response.candidates?.[0]?.content?.parts?.find(
    (p: any) => p.inlineData?.mimeType?.startsWith("image/")
  );
  if (!imagePart?.inlineData?.data) throw new Error("Gemini did not return an image");
  return `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
}

// =========== Embed HTML builder ===========

function buildEmbedHtml(embedToken: string, businessName: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${businessName} — Wrap Visualiser</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    background: #0a0a0a; color: #e5e5e5; min-height: 100vh;
    display: flex; flex-direction: column;
  }
  .container { flex: 1; padding: 16px; max-width: 900px; margin: 0 auto; width: 100%; }
  h1 { font-size: 1.2rem; font-weight: 600; margin-bottom: 16px; color: #fff; }
  .upload-area {
    border: 2px dashed #333; border-radius: 8px; padding: 32px;
    text-align: center; cursor: pointer; transition: border-color 0.2s;
    background: #111; margin-bottom: 20px;
  }
  .upload-area:hover, .upload-area.drag-over { border-color: #d2d915; }
  .upload-area p { color: #888; font-size: 0.9rem; margin-top: 8px; }
  .upload-icon { font-size: 2rem; margin-bottom: 8px; }
  #preview-img { max-width: 100%; max-height: 200px; border-radius: 6px; margin-top: 12px; }
  .section-title { font-size: 0.85rem; font-weight: 600; color: #aaa; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 10px; }
  .colors-grid {
    display: grid; grid-template-columns: repeat(auto-fill, minmax(72px, 1fr));
    gap: 8px; margin-bottom: 20px; max-height: 280px; overflow-y: auto;
  }
  .color-item {
    cursor: pointer; border-radius: 6px; overflow: hidden; border: 2px solid transparent;
    transition: border-color 0.15s; background: #1a1a1a;
  }
  .color-item:hover { border-color: #555; }
  .color-item.selected { border-color: #d2d915; }
  .color-swatch { width: 100%; aspect-ratio: 1; object-fit: cover; background: #222; }
  .color-swatch-fallback { width: 100%; aspect-ratio: 1; }
  .color-label { font-size: 0.6rem; padding: 3px 4px; text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: #ccc; }
  .email-row { margin-bottom: 20px; }
  .email-row label { display: block; font-size: 0.85rem; color: #aaa; margin-bottom: 6px; }
  .email-row input {
    width: 100%; padding: 10px 12px; background: #111; border: 1px solid #333;
    border-radius: 6px; color: #fff; font-size: 0.9rem; outline: none;
  }
  .email-row input:focus { border-color: #d2d915; }
  .generate-btn {
    width: 100%; padding: 12px; background: #d2d915; color: #000; font-weight: 700;
    font-size: 1rem; border: none; border-radius: 8px; cursor: pointer; transition: opacity 0.2s;
  }
  .generate-btn:hover:not(:disabled) { opacity: 0.9; }
  .generate-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .result-section { margin-top: 20px; }
  .result-img { width: 100%; border-radius: 8px; }
  .loading { text-align: center; padding: 40px; color: #888; }
  .spinner {
    width: 36px; height: 36px; border: 3px solid #333; border-top-color: #d2d915;
    border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 12px;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  .error-msg { background: #2a0a0a; border: 1px solid #5a1a1a; color: #f88; padding: 12px; border-radius: 6px; margin-top: 12px; font-size: 0.85rem; }
  .powered-by {
    display: flex; align-items: center; justify-content: center; gap: 8px;
    padding: 12px 16px; background: #0d0d0d; border-top: 1px solid #1a1a1a;
    text-decoration: none; flex-shrink: 0;
  }
  .powered-by img { height: 20px; }
  .powered-by span { font-size: 0.75rem; color: #d2d915; font-weight: 500; }
  .brand-filter { margin-bottom: 16px; }
  .brand-tabs { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 8px; }
  .brand-tab {
    padding: 4px 10px; font-size: 0.75rem; border-radius: 20px;
    border: 1px solid #333; background: #111; color: #aaa; cursor: pointer; transition: all 0.15s;
  }
  .brand-tab:hover { border-color: #555; }
  .brand-tab.active { border-color: #d2d915; color: #d2d915; background: #1a1a06; }
</style>
</head>
<body>
<div class="container">
  <h1>Wrap Colour Visualiser</h1>

  <!-- Upload -->
  <div class="upload-area" id="upload-area">
    <div class="upload-icon"></div>
    <strong>Upload your car photo</strong>
    <p>Click or drag &amp; drop a photo of your vehicle</p>
    <img id="preview-img" style="display:none" />
    <input type="file" id="file-input" accept="image/*" style="display:none" />
  </div>

  <!-- Color picker -->
  <div class="section-title">Choose a wrap colour</div>

  <div class="brand-filter" id="brand-filter" style="display:none">
    <div class="brand-tabs" id="brand-tabs"></div>
  </div>

  <div class="colors-grid" id="colors-grid">
    <div style="color:#666;font-size:0.8rem;padding:8px">Loading colours…</div>
  </div>

  <!-- Email -->
  <div class="email-row">
    <label for="email-input">Your email address</label>
    <input type="email" id="email-input" placeholder="you@example.com" />
  </div>

  <!-- Generate -->
  <button class="generate-btn" id="generate-btn" disabled>Visualise Wrap</button>

  <div id="result-section"></div>
</div>

<!-- Powered by — always visible, non-removable -->
<a class="powered-by" href="https://www.wrap-up.ai" target="_blank" rel="noopener">
  <img src="https://www.wrap-up.ai/logo-wrapup.svg" alt="WrapUp" onerror="this.style.display='none'" />
  <span>Powered by WRAP-UP.AI</span>
</a>

<script>
const TOKEN = '${embedToken}';
let selectedColorId = null;
let selectedColorName = '';
let selectedColorSwatch = null;
let uploadedFile = null;
let allColors = [];
let activeBrand = 'all';

// =========== Widget client JS — DOM refs ===========
const uploadArea = document.getElementById('upload-area');
const fileInput = document.getElementById('file-input');
const previewImg = document.getElementById('preview-img');

uploadArea.addEventListener('click', () => fileInput.click());
uploadArea.addEventListener('dragover', e => { e.preventDefault(); uploadArea.classList.add('drag-over'); });
uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('drag-over'));
uploadArea.addEventListener('drop', e => {
  e.preventDefault(); uploadArea.classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file && file.type.startsWith('image/')) handleFile(file);
});
fileInput.addEventListener('change', e => { if (e.target.files[0]) handleFile(e.target.files[0]); });

function handleFile(file) {
  uploadedFile = file;
  const reader = new FileReader();
  reader.onload = ev => { previewImg.src = ev.target.result; previewImg.style.display = 'block'; };
  reader.readAsDataURL(file);
  checkCanGenerate();
}

// =========== Widget client JS — color loading ===========
async function loadColors() {
  try {
    const resp = await fetch('/api/embed/' + TOKEN + '/colors', { headers: { 'Authorization': 'Bearer ' + TOKEN } });
    if (!resp.ok) throw new Error('Failed to load colours');
    allColors = await resp.json();
    renderBrandTabs();
    renderColors(allColors);
  } catch (err) {
    document.getElementById('colors-grid').innerHTML = '<div style="color:#f66;font-size:0.8rem;padding:8px">Failed to load colours.</div>';
  }
}

function renderBrandTabs() {
  const brands = ['all', ...new Set(allColors.map(c => c.manufacturer))];
  if (brands.length <= 2) return; // only "all" + one brand — no need for filter
  const filter = document.getElementById('brand-filter');
  const tabs = document.getElementById('brand-tabs');
  filter.style.display = 'block';
  tabs.innerHTML = brands.map(b =>
    '<button class="brand-tab' + (b === 'all' ? ' active' : '') + '" data-brand="' + b + '">' +
    (b === 'all' ? 'All Brands' : b) + '</button>'
  ).join('');
  tabs.addEventListener('click', e => {
    const btn = e.target.closest('.brand-tab');
    if (!btn) return;
    activeBrand = btn.dataset.brand;
    tabs.querySelectorAll('.brand-tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    const filtered = activeBrand === 'all' ? allColors : allColors.filter(c => c.manufacturer === activeBrand);
    renderColors(filtered);
  });
}

function renderColors(colors) {
  const grid = document.getElementById('colors-grid');
  if (!colors.length) { grid.innerHTML = '<div style="color:#666;font-size:0.8rem;padding:8px">No colours found.</div>'; return; }
  grid.innerHTML = colors.map(c => {
    const thumb = c.thumbnailUrl || c.imageUrl;
    const swatch = thumb
      ? '<img class="color-swatch" src="' + thumb + '" alt="' + c.name + '" loading="lazy" />'
      : '<div class="color-swatch-fallback" style="background:' + c.hexColor + '"></div>';
    return '<div class="color-item' + (c.id === selectedColorId ? ' selected' : '') + '" data-id="' + c.id + '" data-name="' + c.name + '" data-swatch="' + (thumb || '') + '">' + swatch + '<div class="color-label">' + c.name + '</div></div>';
  }).join('');
  grid.querySelectorAll('.color-item').forEach(el => {
    el.addEventListener('click', () => {
      grid.querySelectorAll('.color-item').forEach(e => e.classList.remove('selected'));
      el.classList.add('selected');
      selectedColorId = parseInt(el.dataset.id);
      selectedColorName = el.dataset.name;
      selectedColorSwatch = el.dataset.swatch || null;
      checkCanGenerate();
    });
  });
}

// =========== Widget client JS — generate validation ===========
function checkCanGenerate() {
  document.getElementById('generate-btn').disabled = !(uploadedFile && selectedColorId && document.getElementById('email-input').value.trim());
}
document.getElementById('email-input').addEventListener('input', checkCanGenerate);

document.getElementById('generate-btn').addEventListener('click', async () => {
  const email = document.getElementById('email-input').value.trim();
  if (!uploadedFile || !selectedColorId || !email) return;

  const btn = document.getElementById('generate-btn');
  btn.disabled = true;
  btn.textContent = 'Generating…';
  const resultSection = document.getElementById('result-section');
  resultSection.innerHTML = '<div class="loading"><div class="spinner"></div><p>Creating your wrap preview…</p></div>';

  try {
    const formData = new FormData();
    formData.append('image', uploadedFile);
    formData.append('colorId', selectedColorId);
    formData.append('email', email);
    formData.append('options', JSON.stringify([]));

    const resp = await fetch('/api/partner/generate', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + TOKEN },
      body: formData,
    });
    const data = await resp.json();
    if (!resp.ok) throw new Error(data.message || 'Generation failed');

    resultSection.innerHTML =
      '<div class="result-section">' +
      '<div class="section-title" style="margin-bottom:10px">Your wrap preview — ' + selectedColorName + '</div>' +
      '<img class="result-img" src="' + data.imageUrl + '" alt="Wrap preview" />' +
      '</div>';
  } catch (err) {
    resultSection.innerHTML = '<div class="error-msg">' + (err.message || 'Something went wrong. Please try again.') + '</div>';
  } finally {
    btn.disabled = false;
    btn.textContent = 'Visualise Wrap';
    checkCanGenerate();
  }
});

loadColors();
</script>
</body>
</html>`;
}

// =========== Route registration ===========

export function registerPartnerRoutes(app: Express, requireAdminAuth: any) {
  // One-time column migrations (idempotent)
  (async () => { try { await db.execute(sql`ALTER TABLE widget_customers ADD COLUMN IF NOT EXISTS car_brand TEXT`); await db.execute(sql`ALTER TABLE widget_customers ADD COLUMN IF NOT EXISTS car_model TEXT`);
  await db.execute(sql`ALTER TABLE widget_customers ALTER COLUMN name DROP NOT NULL`);
  await db.execute(sql`ALTER TABLE widget_customers ALTER COLUMN phone DROP NOT NULL`);
  await db.execute(sql`ALTER TABLE widget_customers ALTER COLUMN car_brand DROP NOT NULL`);
  await db.execute(sql`ALTER TABLE widget_customers ALTER COLUMN car_model DROP NOT NULL`);
} catch(e){} })();


  // =========== GET /api/partner/brands-list ===========
  app.get("/api/partner/brands-list", async (req: Request, res: Response) => {
    try {
      const result = await db.execute(
        sql`SELECT DISTINCT wc.manufacturer, m.sort_order
            FROM wrap_colors wc
            LEFT JOIN manufacturers m ON wc.manufacturer = m.name
            WHERE wc.manufacturer IS NOT NULL
            ORDER BY m.sort_order ASC NULLS LAST, wc.manufacturer ASC`
      );
      res.json(result.rows.map((r: any) => r.manufacturer));
    } catch (err) {
      console.error("[partnerRoutes] brands-list error:", err);
      res.status(500).json({ error: "Failed to fetch brands" });
    }
  });

  // =========== POST /api/partner/signup ===========
  // Creates a WrapUp user account + partner record, initiates Stripe checkout.
  app.post("/api/partner/signup", async (req: Request, res: Response) => {
    const { email, password, businessName, allowedDomain, brands, planType } = req.body;

    if (!email || !password || !businessName || !allowedDomain) {
      return res.status(400).json({ message: "email, password, businessName and allowedDomain are required" });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    try {
      // Check for existing user
      const existingUser = await db.execute(
        sql`SELECT id FROM users WHERE email = ${email.toLowerCase()} LIMIT 1`
      );
      if (existingUser.rows.length) {
        return res.status(409).json({ message: "An account with this email already exists" });
      }

      // Check for existing partner on same domain
      const existingDomain = await db.execute(
        sql`SELECT id FROM partners WHERE allowed_domain = ${allowedDomain.toLowerCase()} LIMIT 1`
      );
      if (existingDomain.rows.length) {
        return res.status(409).json({ message: "A partner account already exists for this domain" });
      }

      // Hash password (same approach as auth.ts)
      const { hashPassword } = await import("./auth");
      const passwordHash = hashPassword(password);

      // Create user account
      const userResult = await db.execute(
        sql`INSERT INTO users (email, password_hash, credits, role, name)
            VALUES (${email.toLowerCase()}, ${passwordHash}, 0, 'partner', ${businessName})
            RETURNING id`
      );
      const userId = (userResult.rows[0] as any).id;

      // Generate unique embed token
      const embedToken = crypto.randomUUID();

      // Create partner record
      const partnerResult = await db.execute(
        sql`INSERT INTO partners (user_id, business_name, allowed_domain, embed_token, subscription_status, credits_remaining, credits_per_month)
            VALUES (${userId}, ${businessName}, ${allowedDomain.toLowerCase()}, ${embedToken}, 'pending', 0, 150)
            RETURNING id`
      );
      const partnerId = (partnerResult.rows[0] as any).id;

      // Save brand preferences if provided
      if (Array.isArray(brands) && brands.length > 0) {
        for (const brand of brands) {
          await db.execute(
            sql`INSERT INTO partner_brands (partner_id, brand) VALUES (${partnerId}, ${brand})`
          );
        }
      }

      // Create Stripe Checkout session
      if (!PARTNER_PRICE_ID) {
        return res.status(500).json({ message: "Partner subscription is not configured yet. Please contact support." });
      }

      // Resolve monthly vs annual plan from signup form selection.
      const selectedPriceId = planType === 'annual' && PARTNER_ANNUAL_PRICE_ID
        ? PARTNER_ANNUAL_PRICE_ID
        : PARTNER_PRICE_ID;

      const stripe = getUncachableStripeClient();
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [{ price: selectedPriceId, quantity: 1 }],
        mode: "subscription",
        customer_email: email.toLowerCase(),
        success_url: `${req.protocol}://${req.get("host")}/partner/dashboard?signup=success`,
        cancel_url: `${req.protocol}://${req.get("host")}/partner/signup?cancelled=1`,
        metadata: { partnerId: String(partnerId), userId: String(userId), embedToken },
      });

      res.json({ checkoutUrl: session.url, embedToken, partnerId });
    } catch (err) {
      console.error("[partnerRoutes] signup error:", err);
      res.status(500).json({ message: "Failed to create partner account" });
    }
  });

  // =========== GET /api/partner/embed-check ===========
  app.get("/api/partner/embed-check", async (req: Request, res: Response) => {
    const { embedToken } = req.query as { embedToken?: string };
    if (!embedToken) return res.status(400).json({ error: "embedToken required" });

    try {
      const result = await db.execute(
        sql`SELECT allowed_domain, subscription_status FROM partners WHERE embed_token = ${embedToken} LIMIT 1`
      );
      if (!result.rows.length) return res.status(404).json({ error: "Invalid embed token" });

      const partner = result.rows[0] as any;
          console.log('[embed] Origin:', req.headers.origin, 'Referer:', req.headers.referer, 'allowedDomain:', partner.allowed_domain);
    if (!validateEmbedOrigin(req, partner.allowed_domain)) {
        return res.status(403).json({ error: "Domain not authorised for this embed token" });
      }
      res.json({ ok: true, status: partner.subscription_status });
    } catch (err) {
      res.status(500).json({ error: "Server error" });
    }
  });

  // =========== GET /api/embed/:embedToken ===========
  app.get("/api/embed/:embedToken", async (req: Request, res: Response) => {
    const { embedToken } = req.params;
    try {
      const result = await db.execute(
        sql`SELECT * FROM partners WHERE embed_token = ${embedToken} LIMIT 1`
      );
      if (!result.rows.length) {
        return res.status(404).send("<h3>Embed not found</h3>");
      }
      const partner = result.rows[0] as any;

      // Domain lock — check on every load
      if (!validateEmbedOrigin(req, partner.allowed_domain)) {
        return res.status(403).send("<h3>403 — This embed is not authorised for this domain.</h3>");
      }

      if (partner.subscription_status !== "active") {
        return res.status(402).send("<h3>Partner subscription is not active.</h3>");
      }

      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.setHeader("X-Frame-Options", "ALLOWALL");
      res.send(buildEmbedHtml(embedToken, partner.business_name));
    } catch (err) {
      console.error("[partnerRoutes] embed page error:", err);
      res.status(500).send("<h3>Server error</h3>");
    }
  });

  // =========== GET /api/embed/:embedToken/colors ===========
  app.get("/api/embed/:embedToken/colors", async (req: Request, res: Response) => {
    const { embedToken } = req.params;
    try {
      const partnerResult = await db.execute(
        sql`SELECT * FROM partners WHERE embed_token = ${embedToken} LIMIT 1`
      );
      if (!partnerResult.rows.length) return res.status(404).json({ error: "Invalid embed token" });

      const partner = partnerResult.rows[0] as any;

      // Domain lock
      if (partner.subscription_status !== "active") {
        return res.status(402).json({ error: "Subscription not active" });
      }

      // Get selected brands for this partner
      const brandsResult = await db.execute(
        sql`SELECT brand FROM partner_brands WHERE partner_id = ${partner.id}`
      );
      const selectedBrands = (brandsResult.rows as any[]).map(r => r.brand);

      // Fetch colours — all if no brand filter, or filtered by selected brands
      let colorsResult;
      if (selectedBrands.length === 0) {
        colorsResult = await db.execute(
          sql`SELECT wc.id, wc.name, wc.manufacturer, wc.category, wc.hex_color, wc.thumbnail_url, wc.image_url
              FROM wrap_colors wc
              LEFT JOIN manufacturers m ON wc.manufacturer = m.name
              ORDER BY m.sort_order ASC NULLS LAST, wc.sort_order ASC, wc.id ASC`
        );
      } else {
        colorsResult = await db.execute(
          sql`SELECT wc.id, wc.name, wc.manufacturer, wc.category, wc.hex_color, wc.thumbnail_url, wc.image_url
              FROM wrap_colors wc
              LEFT JOIN manufacturers m ON wc.manufacturer = m.name
              WHERE wc.manufacturer = ANY(${toPgTextArray(selectedBrands)}::text[])
              ORDER BY m.sort_order ASC NULLS LAST, wc.sort_order ASC, wc.id ASC`
        );
      }

      const colors = (colorsResult.rows as any[]).map(r => ({
        id: r.id,
        name: r.name,
        manufacturer: r.manufacturer,
        category: r.category,
        hexColor: r.hex_color,
        thumbnailUrl: r.thumbnail_url || null,
        imageUrl: r.image_url || null,
      }));

      res.json(colors);
    } catch (err) {
      console.error("[partnerRoutes] embed colors error:", err);
      res.status(500).json({ error: "Failed to load colours" });
    }
  });

  // =========== GET /api/partner/status ===========
  app.get("/api/partner/status", requirePartnerAuth, async (req: Request, res: Response) => {
    const partner = (req as any).partner;
    try {
      const brandsResult = await db.execute(
        sql`SELECT brand FROM partner_brands WHERE partner_id = ${partner.id} ORDER BY brand ASC`
      );
      const selectedBrands = (brandsResult.rows as any[]).map(r => r.brand);
      res.json({
        id: partner.id,
        businessName: partner.business_name,
        allowedDomain: partner.allowed_domain,
        embedToken: partner.embed_token,
        subscriptionStatus: partner.subscription_status,
        creditsRemaining: partner.credits_remaining,
        creditsPerMonth: partner.credits_per_month,
        autoTopup: partner.auto_topup,
        selectedBrands,
        freeRenderLimit: partner.free_render_limit != null ? partner.free_render_limit : 3,
        quoteFormUrl: partner.quote_form_url || null,
        logoUrl: partner.logo_url || null,
        contactEmail: partner.contact_email || null,
        cancelAtPeriodEnd: !!partner.cancel_at_period_end,
        cancelsAt: partner.cancels_at,
      });
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch status" });
    }
  });

  // POST /api/partner/logo — upload a logo used as watermark on widget renders.
  // Accepts multipart/form-data with a single "logo" file (PNG or JPEG). The
  // image is normalized with sharp (max 1600px wide, preserves transparency as
  // PNG) and stored as a base64 data URL in partners.logo_url.
  const logoUpload = multer({ dest: "uploads/", limits: { fileSize: 8 * 1024 * 1024 } });
  app.post("/api/partner/logo", requirePartnerAuth, logoUpload.single("logo"), async (req: Request, res: Response) => {
    const partner = (req as any).partner;
    if (!req.file) return res.status(400).json({ message: "Missing logo file" });
    try {
      const inputBuf = fs.readFileSync(req.file.path);
      // Normalize: keep original format if PNG (transparency), otherwise convert
      // to PNG so we always have a lossless alpha channel for watermark compositing.
      const meta = await sharp(inputBuf).metadata();
      const pipeline = sharp(inputBuf).rotate();
      if ((meta.width || 0) > 1600) pipeline.resize({ width: 1600 });
      const outBuf = await pipeline.png({ compressionLevel: 9 }).toBuffer();
      const dataUrl = `data:image/png;base64,${outBuf.toString("base64")}`;
      await db.execute(sql`UPDATE partners SET logo_url = ${dataUrl} WHERE id = ${partner.id}`);
      try { fs.unlinkSync(req.file.path); } catch {}
      res.json({ success: true, logoUrl: dataUrl });
    } catch (err: any) {
      try { if (req.file) fs.unlinkSync(req.file.path); } catch {}
      console.error("[partner/logo] upload failed:", err);
      res.status(500).json({ message: err?.message || "Failed to upload logo" });
    }
  });

  // DELETE /api/partner/logo — clears the partner logo so widget renders fall
  // back to the default WRAP-UP.AI watermark.
  app.delete("/api/partner/logo", requirePartnerAuth, async (req: Request, res: Response) => {
    const partner = (req as any).partner;
    try {
      await db.execute(sql`UPDATE partners SET logo_url = NULL WHERE id = ${partner.id}`);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ message: "Failed to clear logo" });
    }
  });

  // PUT /api/partner/quote-form-url — partner sets a URL for the paywall "Get a Quote" button
  app.put("/api/partner/quote-form-url", requirePartnerAuth, async (req: Request, res: Response) => {
    const partner = (req as any).partner;
    const raw = req.body.quoteFormUrl;
    const val = typeof raw === "string" ? raw.trim() : "";
    if (val) {
      try {
        const u = new URL(val);
        if (u.protocol !== "https:" && u.protocol !== "http:") throw new Error("bad protocol");
      } catch {
        return res.status(400).json({ message: "quoteFormUrl must be a valid http(s) URL or empty" });
      }
    }
    try {
      await db.execute(sql`UPDATE partners SET quote_form_url = ${val || null} WHERE id = ${partner.id}`);
      res.json({ success: true, quoteFormUrl: val || null });
    } catch (err) {
      res.status(500).json({ error: "Failed to update quote form URL" });
    }
  });

  // PUT /api/partner/contact-email — partner sets a mailto: address for the widget upsell card "Contact" button
  app.put("/api/partner/contact-email", requirePartnerAuth, async (req: Request, res: Response) => {
    const partner = (req as any).partner;
    const raw = req.body.contactEmail;
    const val = typeof raw === "string" ? raw.trim() : "";
    if (val && !/\S+@\S+/.test(val)) {
      return res.status(400).json({ message: "contactEmail must be a valid email address or empty" });
    }
    try {
      await db.execute(sql`UPDATE partners SET contact_email = ${val || null} WHERE id = ${partner.id}`);
      res.json({ success: true, contactEmail: val || null });
    } catch (err) {
      res.status(500).json({ error: "Failed to update contact email" });
    }
  });


  // PUT /api/partner/free-render-limit â partner sets their own visitor free-render limit
  app.put("/api/partner/free-render-limit", requirePartnerAuth, async (req: Request, res: Response) => {
    const partner = (req as any).partner;
    const val = req.body.freeRenderLimit;
    if (typeof val !== "number" || !Number.isInteger(val) || val < 0 || val > 100) {
      return res.status(400).json({ message: "freeRenderLimit must be an integer 0â100" });
    }
    try {
      await db.execute(sql`UPDATE partners SET free_render_limit = ${val} WHERE id = ${partner.id}`);
      res.json({ success: true, freeRenderLimit: val });
    } catch (err) {
      res.status(500).json({ error: "Failed to update free render limit" });
    }
  });

  // POST /api/partner/resume-checkout — allow a pending partner to resume Stripe Checkout
  app.post("/api/partner/resume-checkout", requirePartnerAuth, async (req: Request, res: Response) => {
    const partner = (req as any).partner;
    const user = (req as any).user;

    if (partner.subscription_status === "active") {
      return res.status(400).json({ message: "Already active" });
    }

    if (!PARTNER_PRICE_ID) {
      return res.status(500).json({ message: "Partner subscription not configured" });
    }

    try {
      const stripe = getUncachableStripeClient();
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        // Monthly-only for resume flow. If partner originally chose annual,
        // they'll be switched to monthly. Partners row does not persist
        // planType; revisit if this becomes a real issue.
        line_items: [{ price: PARTNER_PRICE_ID, quantity: 1 }],
        mode: "subscription",
        customer_email: (user?.email || "").toLowerCase(),
        success_url: `${req.protocol}://${req.get("host")}/partner/dashboard?signup=success`,
        cancel_url: `${req.protocol}://${req.get("host")}/partner/signup?cancelled=1`,
        metadata: {
          partnerId: String(partner.id),
          userId: String(user.id),
          embedToken: partner.embed_token,
        },
      });

      await auditLog(req, "partner.resume_checkout",
        { type: "partners", id: partner.id },
        { payload: { checkoutSessionId: session.id } });

      res.json({ url: session.url });
    } catch (err) {
      console.error("[partnerRoutes] resume-checkout error:", err);
      res.status(500).json({ message: "Failed to create checkout session" });
    }
  });

  // POST /api/partner/billing-portal — open Stripe Customer Portal for active partner
  app.post("/api/partner/billing-portal", requirePartnerAuth, async (req: Request, res: Response) => {
    const partner = (req as any).partner;

    if (partner.subscription_status !== "active") {
      return res.status(400).json({ message: "Subscription not active" });
    }

    if (!partner.stripe_subscription_id) {
      return res.status(400).json({ message: "No subscription on file" });
    }

    try {
      const stripe = getUncachableStripeClient();

      // On-demand customer-id lookup (partners table does not store customer_id).
      const subscription = await stripe.subscriptions.retrieve(partner.stripe_subscription_id);
      const customerId = subscription.customer as string;

      const session = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: `${req.protocol}://${req.get("host")}/partner/dashboard`,
      });

      await auditLog(req, "partner.portal_opened",
        { type: "partners", id: partner.id },
        { payload: {
            subscriptionId: partner.stripe_subscription_id,
            customerId,
            stripeStatus: subscription.status,
            cancelAtPeriodEnd: !!subscription.cancel_at_period_end,
        } });

      res.json({ url: session.url });
    } catch (err) {
      console.error("[partnerRoutes] billing-portal error:", err);
      res.status(500).json({ message: "Failed to open billing portal" });
    }
  });

    // =========== GET /api/partner/renders ===========
  app.get("/api/partner/renders", requirePartnerAuth, async (req: Request, res: Response) => {
    const partner = (req as any).partner;
    try {
      const result = await db.execute(
        sql`SELECT customer_email, color_name, created_at FROM partner_renders
            WHERE partner_id = ${partner.id} ORDER BY created_at DESC LIMIT 500`
      );
      res.json(result.rows);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch render history" });
    }
  });

  // =========== PUT /api/partner/brands ===========
  app.put("/api/partner/brands", requirePartnerAuth, async (req: Request, res: Response) => {
    const partner = (req as any).partner;
    const { brands } = req.body;
    if (!Array.isArray(brands)) {
      return res.status(400).json({ message: "brands must be an array of strings" });
    }
    try {
      await db.execute(sql`DELETE FROM partner_brands WHERE partner_id = ${partner.id}`);
      for (const brand of brands) {
        if (typeof brand === "string" && brand.trim()) {
          await db.execute(
            sql`INSERT INTO partner_brands (partner_id, brand) VALUES (${partner.id}, ${brand.trim()})`
          );
        }
      }
      res.json({ ok: true, savedBrands: brands });
    } catch (err) {
      res.status(500).json({ error: "Failed to update brands" });
    }
  });

  // =========== POST /api/partner/generate ===========
  app.post(
    "/api/partner/generate",
    ...partnerRenderLimiters,
    upload.single("image"),
    async (req: Request, res: Response) => {
      // Auth: token from Authorization header
      const authHeader = req.headers["authorization"] as string | undefined;
      const embedToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

      if (!embedToken) {
        return res.status(401).json({ message: "Missing embed token" });
      }

      let partner: any;
      try {
        const result = await db.execute(
          sql`SELECT * FROM partners WHERE embed_token = ${embedToken} LIMIT 1`
        );
        if (!result.rows.length) {
          if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
          return res.status(401).json({ message: "Invalid embed token" });
        }
        partner = result.rows[0];
      } catch (err) {
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        return res.status(500).json({ message: "Server error" });
      }

      // Domain lock — check on every generate request
      if (!validateEmbedOrigin(req, partner.allowed_domain)) {
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        return res.status(403).json({ message: "Domain not authorised for this embed" });
      }

      if (partner.subscription_status !== "active") {
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        return res.status(402).json({ message: "Partner subscription is not active" });
      }

      if (partner.credits_remaining <= 0) {
        if (partner.auto_topup) {
          const topupPriceId = process.env.PARTNER_TOPUP_STRIPE_PRICE_ID;
          if (!topupPriceId) {
            return res.status(402).json({ error: "Credits exhausted and auto top-up is not configured" });
          }
          try {
            const stripeClient = getUncachableStripeClient();
            const session = await stripeClient.checkout.sessions.create({
              mode: "payment",
              line_items: [{ price: topupPriceId, quantity: 1 }],
              metadata: { type: "partner_topup", partnerId: String(partner.id) },
              success_url: partner.allowed_domain + "/topup-success",
              cancel_url: partner.allowed_domain + "/topup-cancelled",
            });
            return res.status(402).json({ error: "Credits exhausted", checkoutUrl: session.url, topup: true });
          } catch {
            return res.status(500).json({ error: "Failed to create top-up checkout session" });
          }
        }
        return res.status(402).json({ error: "Credits exhausted. Please top up your account." });
      }

      if (!req.file) {
        return res.status(400).json({ message: "No image uploaded" });
      }

      const { colorId, email, options } = req.body;
      if (!colorId) {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ message: "colorId is required" });
      }
      if (!email) {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ message: "email is required" });
      }

      const colorIdNum = parseInt(colorId, 10);
      if (isNaN(colorIdNum)) {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ message: "Invalid colorId" });
      }

      let parsedOptions: string[] = [];
      try { parsedOptions = JSON.parse(options || "[]"); } catch { parsedOptions = []; }

      try {
        // Fetch color details
        const colorResult = await db.execute(
          sql`SELECT * FROM wrap_colors WHERE id = ${colorIdNum} LIMIT 1`
        );
        if (!colorResult.rows.length) {
          fs.unlinkSync(req.file.path);
          return res.status(400).json({ message: "Invalid color selection" });
        }
        const color = colorResult.rows[0] as any;

        const creditsResult = await db.execute(
          sql`SELECT credits_remaining FROM partners WHERE id = ${session.partnerId} LIMIT 1`
        );
        const creditsRow = creditsResult.rows?.[0] as any;
        if (!creditsRow || (creditsRow.credits_remaining ?? 0) <= 0) {
          fs.unlinkSync(req.file.path);
          return res.status(402).json({ message: "Credits exhausted. Please contact the wrap shop for more renders." });
        }
        // Generate wrap
        let rawImageUrl: string;
        try {
          rawImageUrl = await generateCarWrapWithGemini(
            req.file.path,
            color.name,
            color.hex_color,
            color.image_url || null,
            color.reference_image_data || null,
            parsedOptions
          );
        } finally {
          if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        }

        // Process image — always paid quality for partner embeds
        const processedImageUrl = await processResultImage(
          rawImageUrl, true, color.name, color.manufacturer, color.color_number || ""
        );

        // Deduct credit
        await db.execute(
          sql`UPDATE partners SET credits_remaining = credits_remaining - 1, updated_at = NOW()
              WHERE id = ${partner.id}`
        );

        // Geo capture (Item 0b). The .catch is defense-in-depth — the module
        // contracts to never throw, but this guarantees render proceeds regardless.
        const geo = await lookupGeo(req.ip).catch(() => ({
          city: null, country: null, latitude: null, longitude: null,
        }));

        // Log render
        await db.execute(
          sql`INSERT INTO partner_renders (partner_id, customer_email, color_id, color_name, city, country, latitude, longitude)
              VALUES (${partner.id}, ${email}, ${colorIdNum}, ${color.name}, ${geo.city}, ${geo.country}, ${geo.latitude !== null ? String(geo.latitude) : null}, ${geo.longitude !== null ? String(geo.longitude) : null})`
        );

        res.json({ imageUrl: processedImageUrl, colorName: color.name });
      } catch (err: any) {
        console.error("[partnerRoutes] generate error:", err);
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        res.status(500).json({ message: err.message || "Generation failed" });
      }
    }
  );

  // =========== GET /api/admin/partners ===========
  app.get("/api/admin/partners", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const result = await db.execute(sql`
        SELECT
          p.*,
          u.email AS user_email,
          COUNT(pr.id)::int AS total_renders,
          COALESCE(
            (SELECT string_agg(pb.brand, ', ' ORDER BY pb.brand)
             FROM partner_brands pb WHERE pb.partner_id = p.id),
            'All brands'
          ) AS selected_brands_display
        FROM partners p
        LEFT JOIN users u ON u.id = p.user_id
        LEFT JOIN partner_renders pr ON pr.partner_id = p.id
        GROUP BY p.id, u.email
        ORDER BY p.created_at DESC
      `);
      res.json(result.rows);
    } catch (err) {
      console.error("[partnerRoutes] admin list error:", err);
      res.status(500).json({ error: "Failed to fetch partners" });
    }
  });

  // =========== POST /api/admin/partners/:id/add-credits ===========
  app.post("/api/admin/partners/:id/add-credits", requireAdminAuth, async (req: Request, res: Response) => {
    const partnerId = parseInt(req.params.id, 10);
    const { credits } = req.body;
    if (!credits || typeof credits !== "number" || credits < 1) {
      return res.status(400).json({ message: "credits must be a positive number" });
    }
    try {
      const result = await db.execute(
        sql`UPDATE partners SET credits_remaining = credits_remaining + ${credits}, updated_at = NOW()
            WHERE id = ${partnerId} RETURNING credits_remaining`
      );
      if (!result.rows.length) return res.status(404).json({ message: "Partner not found" });
      await auditLog(req, "partner.add_credits",
        { type: "partners", id: partnerId },
        { payload: { added: credits, newBalance: (result.rows[0] as any).credits_remaining } });
      res.json({ ok: true, creditsRemaining: (result.rows[0] as any).credits_remaining });
    } catch (err) {
      res.status(500).json({ error: "Failed to add credits" });
    }
  });

  // =========== PATCH /api/admin/partners/:id/suspend ===========
  app.patch("/api/admin/partners/:id/suspend", requireAdminAuth, async (req: Request, res: Response) => {
    const partnerId = parseInt(req.params.id, 10);
    const { suspended } = req.body; // true = suspend, false = reactivate
    const newStatus = suspended ? "suspended" : "active";
    try {
      // Capture previous status for audit log before the update.
      const before = await db.execute(
        sql`SELECT subscription_status FROM partners WHERE id = ${partnerId}`
      );
      if (!before.rows.length) return res.status(404).json({ message: "Partner not found" });
      const prevStatus = (before.rows[0] as any).subscription_status;

      const result = await db.execute(
        sql`UPDATE partners SET subscription_status = ${newStatus}, updated_at = NOW()
            WHERE id = ${partnerId} RETURNING id, subscription_status`
      );
      if (!result.rows.length) return res.status(404).json({ message: "Partner not found" });

      await auditLog(req, "partner.suspend",
        { type: "partners", id: partnerId },
        { before: { subscription_status: prevStatus },
          after:  { subscription_status: newStatus } });

      res.json({ ok: true, subscriptionStatus: (result.rows[0] as any).subscription_status });
    } catch (err) {
      res.status(500).json({ error: "Failed to update partner status" });
    }
  });

  // ============================================================
  // Widget API endpoints (JS embed system — replaces iframe)
  // ============================================================

  // CORS middleware for all /api/widget/* cross-origin requests
  app.use('/api/widget/', (req: Request, res: Response, next: any) => {
    const origin = req.headers['origin'] as string | undefined;
    if (origin) res.setHeader('Access-Control-Allow-Origin', origin);
    else res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    if (req.method === 'OPTIONS') {
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-customer-token');
      res.setHeader('Access-Control-Max-Age', '86400');
      return res.sendStatus(204);
    }
    next();
  });

  const widgetUpload = multer({ dest: "uploads/" });

  // POST /api/widget/init — exchange embed token for session JWT + colors
  app.post("/api/widget/init", async (req: Request, res: Response) => {
    try {
      const token = req.body.widgetId || req.body.token;
      if (!token) return res.status(400).json({ message: "Missing token" });

      const result = await db.execute(
        sql`SELECT * FROM partners WHERE embed_token = ${token} LIMIT 1`
      );
      const partner = result.rows?.[0] as any;
      if (!partner) return res.status(401).json({ message: "Invalid token" });
      if (partner.subscription_status !== "active") {
        return res.status(402).json({ message: "Subscription not active" });
      }

      const origin = req.headers["origin"] as string | undefined;
      const rawOrigin = (req.headers["origin"] || req.headers["referer"]) as string | undefined;
      if (rawOrigin && partner.allowed_domain) {
        try {
          const domainMatch = new URL(rawOrigin).origin === new URL(partner.allowed_domain).origin;
          if (!domainMatch) {
            return res.status(403).json({ message: "Origin not allowed" });
          }
        } catch {}
      } else {
      }
      if (origin) {
        res.setHeader("Access-Control-Allow-Origin", origin);
        res.setHeader("Access-Control-Allow-Credentials", "true");
      }

      const brandResult = await db.execute(
        sql`SELECT brand FROM partner_brands WHERE partner_id = ${partner.id}`
      );
      const brands = (brandResult.rows ?? []).map((r: any) => r.brand);

      let colorsResult;
      if (brands.length > 0) {
        colorsResult = await db.execute(
          sql`SELECT wc.id, wc.name, wc.manufacturer, wc.category, wc.hex_color, wc.thumbnail_url
               FROM wrap_colors wc
               LEFT JOIN manufacturers m ON wc.manufacturer = m.name
               WHERE wc.manufacturer = ANY(${toPgTextArray(brands)}::text[])
               ORDER BY m.sort_order ASC NULLS LAST, wc.sort_order, wc.name`
        );
      } else {
        colorsResult = await db.execute(
          sql`SELECT wc.id, wc.name, wc.manufacturer, wc.category, wc.hex_color, wc.thumbnail_url
               FROM wrap_colors wc
               LEFT JOIN manufacturers m ON wc.manufacturer = m.name
               ORDER BY m.sort_order ASC NULLS LAST, wc.sort_order, wc.name`
        );
      }
      const colors = (colorsResult.rows ?? []).map((c: any) => ({
        id: c.id,
        name: c.name,
        manufacturer: c.manufacturer,
        category: c.category,
        hexColor: c.hex_color,
        thumbnailUrl: c.thumbnail_url,
      }));

      const payload = JSON.stringify({ partnerId: partner.id, exp: Date.now() + 3_600_000 });
      const secret = process.env.SESSION_SECRET || "dev-secret";
      const sig = crypto.createHmac("sha256", secret).update(payload).digest("hex");
      const sessionToken = "wup." + Buffer.from(payload).toString("base64url") + "." + sig;

      return res.json({
        sessionToken,
        colors,
        creditsRemaining: partner.credits_remaining,
        freeRenderLimit: partner.free_render_limit != null ? partner.free_render_limit : 3,
        quoteFormUrl: partner.quote_form_url || null,
        logoUrl: partner.logo_url || null,
        businessName: partner.business_name || null,
        contactEmail: partner.contact_email || null,
      });
    } catch (err: any) {
      console.error("[widget/init]", err);
      return res.status(500).json({ message: "Server error" });
    }
  });

  app.options("/api/widget/init", (_req: Request, res: Response) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.setHeader("Access-Control-Max-Age", "86400");
    res.sendStatus(204);
  });

  app.options("/api/widget/generate", (_req: Request, res: Response) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, x-customer-token");
    res.setHeader("Access-Control-Max-Age", "86400");
    res.sendStatus(204);
  });

  // POST /api/widget/generate — run AI generation for widget session
  app.post(
    "/api/widget/generate",
    ...widgetRenderLimiters,
    widgetUpload.single("image"),
    async (req: Request, res: Response) => {
      const reqId = Math.random().toString(36).slice(2, 8);
      try {
        const authHeader = req.headers["authorization"] as string | undefined;
        if (!authHeader?.startsWith("Bearer ")) {
          return res.status(401).json({ message: "Missing session token" });
        }
        const tokenStr = authHeader.slice(7);
        const parts = tokenStr.split(".");
        if (parts.length !== 3 || parts[0] !== "wup") return res.status(401).json({ message: "Malformed token" });
        const encoded = parts[1];
        const tokenSig = parts[2];
        let session: any;
        try {
          const payload = Buffer.from(encoded, "base64url").toString("utf8");
          const secret = process.env.SESSION_SECRET || "dev-secret";
          const expected = crypto.createHmac("sha256", secret).update(payload).digest("hex");
          if (tokenSig !== expected) return res.status(401).json({ message: "Invalid token signature" });
          session = JSON.parse(payload);
          if (session.exp < Date.now()) return res.status(401).json({ message: "Token expired" });
        } catch {
          return res.status(401).json({ message: "Invalid token" });
        }

        const { colorId, customerName, customerPhone, carBrand, carModel } = req.body;
        if (!colorId) {
          if (req.file) fs.unlinkSync(req.file.path);
          return res.status(400).json({ message: "Missing colorId" });
        }
        if (!req.file) return res.status(400).json({ message: "Missing image" });

        // HEIC/HEIF pre-processing — see server/heicToJpeg.ts for the why.
        let workingPath: string;
        try {
          const conv = await ensureNonHeif(req.file.path);
          workingPath = conv.path;
        } catch {
          if (req.file && fs.existsSync(req.file.path)) {
            try { fs.unlinkSync(req.file.path); } catch {}
          }
          return res.status(400).json({
            message: "Could not process this iPhone photo. Please try uploading as JPG or PNG.",
          });
        }

        const colorIdNum = parseInt(colorId, 10);
        if (isNaN(colorIdNum)) {
          fs.unlinkSync(workingPath);
          return res.status(400).json({ message: "Invalid colorId" });
        }

        const colorResult = await db.execute(
          sql`SELECT * FROM wrap_colors WHERE id = ${colorIdNum} LIMIT 1`
        );
        const color = colorResult.rows?.[0] as any;
        if (!color) {
          fs.unlinkSync(workingPath);
          return res.status(400).json({ message: "Invalid color" });
        }

        const partnerResult = await db.execute(
          sql`SELECT allowed_domain, id, business_name, logo_url FROM partners WHERE id = ${session.partnerId} LIMIT 1`
        );
        const partner = partnerResult.rows?.[0] as any;
        // ââ Customer render-limit check ââââââââââââââââââââââââââââââââââ
        const customerToken = req.headers['x-customer-token'] as string | undefined;
        if (customerToken) {
          const ctResult = await db.execute(
            sql`SELECT wc.id, wc.email, wc.render_count, p.free_render_limit
                FROM widget_customers wc
                JOIN partners p ON p.id = wc.partner_id
                WHERE wc.customer_token = ${customerToken}
                  AND wc.partner_id = ${session.partnerId}`
          );
          const ct = ctResult.rows?.[0] as any;
          if (!ct) {
            return res.status(403).json({ error: 'invalid_customer_token' });
          }
          const freeLimit = Number(ct.free_render_limit ?? 2);
          if (Number(ct.render_count) >= freeLimit) {
            return res.status(403).json({
              error: 'render_limit_reached',
              renders_used: Number(ct.render_count),
              free_render_limit: freeLimit
            });
          }
          (req as any).__customerRowId = ct.id;
          (req as any).__customerEmail = ct.email;
        }
        const origin = req.headers["origin"] as string | undefined;
        const rawOrigin = (req.headers["origin"] || req.headers["referer"]) as string | undefined;
        if (rawOrigin && partner?.allowed_domain) {
          try {
            if (new URL(rawOrigin).origin !== new URL(partner.allowed_domain).origin) {
              fs.unlinkSync(workingPath);
              return res.status(403).json({ message: "Origin not allowed" });
            }
          } catch {}
        }
        if (origin) {
          res.setHeader("Access-Control-Allow-Origin", origin);
          res.setHeader("Access-Control-Allow-Credentials", "true");
        }

        const rawImageUrl = await generateCarWrapWithGemini(
          workingPath,
          color.name,
          color.hex_color,
          color.image_url || null,
          color.reference_image_data || null,
          [],
        );

        // Decode the partner logo (if set) into a Buffer so it can be
        // composited as a watermark on the free-tier render. Falls back to
        // the default WRAP-UP.AI logo when the partner has no logo saved.
        let partnerLogoBuf: Buffer | null = null;
        if (typeof partner?.logo_url === "string" && partner.logo_url.startsWith("data:")) {
          const m = partner.logo_url.match(/^data:[^;]+;base64,(.+)$/);
          if (m) {
            try { partnerLogoBuf = Buffer.from(m[1], "base64"); }
            catch { partnerLogoBuf = null; }
          }
        }

        // Widget renders are always watermarked (free tier for the end visitor),
        // using the partner's logo when available.
        const processedImageUrl = await processResultImage(
          rawImageUrl, false, color.name, color.manufacturer, color.color_number || "", { partnerLogoBuf, widgetMode: true }
        );

        // Geo capture (Item 0b). The .catch is defense-in-depth — the module
        // contracts to never throw, but this guarantees render proceeds regardless.
        const geo = await lookupGeo(req.ip).catch(() => ({
          city: null, country: null, latitude: null, longitude: null,
        }));

        let renderId: number | null = null;
        try {
          const insertResult = await db.execute(
            sql`INSERT INTO partner_renders (partner_id, customer_email, car_description, color_id, color_name, manufacturer, result_image_url, city, country, latitude, longitude, created_at)
                 VALUES (${session.partnerId}, ${(req as any).__customerEmail || null}, 'widget', ${color.id}, ${color.name}, ${color.manufacturer}, ${processedImageUrl}, ${geo.city}, ${geo.country}, ${geo.latitude !== null ? String(geo.latitude) : null}, ${geo.longitude !== null ? String(geo.longitude) : null}, NOW())
                 RETURNING id`
          );
          renderId = (insertResult.rows?.[0] as any)?.id ?? null;
        } catch (logErr: any) {
          console.error(`[widget/generate:${reqId}] insert-FAILED name=${logErr?.name} msg=${logErr?.message} code=${logErr?.code} detail=${logErr?.detail}`);
          console.error(logErr?.stack || logErr);
        }

        // Deduct one credit for widget render
        try {
          await db.execute(
            sql`UPDATE partners SET credits_remaining = credits_remaining - 1, updated_at = NOW() WHERE id = ${session.partnerId}`
          );
        } catch (creditErr) {
          console.warn("[widget/generate] credit deduction failed:", creditErr);
        }
        // Increment customer render count
        if ((req as any).__customerRowId) {
          try {
            await db.execute(
              sql`UPDATE widget_customers SET render_count = render_count + 1,
                  name = COALESCE(${customerName || null}, name),
                  phone = COALESCE(${customerPhone || null}, phone),
                  car_brand = COALESCE(${carBrand || null}, car_brand),
                  car_model = COALESCE(${carModel || null}, car_model)
                  WHERE id = ${(req as any).__customerRowId}`
            );
          } catch (rcErr) { console.warn('[widget/generate] render_count update failed:', rcErr); }
          // Update customer profile info if provided
          if (customerName || customerPhone || carBrand || carModel) {
            try {
              await db.execute(
                sql`UPDATE widget_customers SET
                    name = COALESCE(NULLIF(${customerName || ''}, ''), name),
                    phone = COALESCE(NULLIF(${customerPhone || ''}, ''), phone),
                    car_brand = COALESCE(NULLIF(${carBrand || ''}, ''), car_brand),
                    car_model = COALESCE(NULLIF(${carModel || ''}, ''), car_model)
                    WHERE id = ${(req as any).__customerRowId}`
              );
            } catch (profileErr) { console.warn('[widget/generate] update profile failed:', profileErr); }
          }
        }

        const responseImageUrl = renderId
          ? `https://${req.get("host")}/api/widget/renders/${renderId}/image`
          : processedImageUrl;

        // Fire-and-forget: email the verified visitor a copy of their render.
        // Skipped silently when the visitor has no customer token (pre-
        // verification edge). Falls back to generic WrapUp copy when the
        // partner has no business_name on file.
        const customerEmailForSend = (req as any).__customerEmail;
        if (customerEmailForSend) {
          const partnerName = typeof partner?.business_name === "string" && partner.business_name.trim()
            ? partner.business_name.trim()
            : undefined;
          sendRenderResultEmail({
            to: customerEmailForSend,
            imageData: processedImageUrl,
            colorName: color.name,
            designId: renderId ?? undefined,
            partnerName,
            context: "widget",
          });
        }

        return res.json({
          imageUrl: responseImageUrl,
          colorName: color.name,
          manufacturer: color.manufacturer,
        });
      } catch (err: any) {
        console.error(`[widget/generate:${reqId}] OUTER-CATCH name=${err?.name} msg=${err?.message} code=${err?.code} detail=${err?.detail} statusCode=${err?.statusCode} cause=${err?.cause ? JSON.stringify(err.cause) : "none"}`);
        console.error(err?.stack || err);
        console.error(`[widget/generate:${reqId}] headersSent=${res.headersSent}`);
        if (req.file) { try { fs.unlinkSync(req.file.path); } catch {} }
        if (!res.headersSent) {
          return res.status(500).json({ message: err?.message || "Generation failed" });
        }
        return;
      }
    }
  );

  // GET /api/widget/renders/:id/image — serve widget render image binary from DB
  app.get("/api/widget/renders/:id/image", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid render ID" });

      const result = await db.execute(
        sql`SELECT result_image_url FROM partner_renders WHERE id = ${id} LIMIT 1`
      );
      const row = result.rows?.[0] as any;
      if (!row?.result_image_url) return res.status(404).json({ message: "Render not found" });

      const match = String(row.result_image_url).match(/^data:([^;]+);base64,(.+)$/);
      if (!match) return res.status(500).json({ message: "Invalid image data" });

      const [, mimeType, b64] = match;
      const buffer = Buffer.from(b64, "base64");
      res.set("Content-Type", mimeType);
      res.set("Cache-Control", "public, max-age=86400");
      res.send(buffer);
    } catch (err) {
      console.error("[widget/renders/:id/image]", err);
      res.status(500).json({ message: "Failed to serve render image" });
    }
  });

  // GET /api/widget/customer-state — returning visitor rehydration.
  // Given sessionToken (Authorization header) + x-customer-token, returns
  // { email, rendersUsed, freeRenderLimit } so the widget can show the
  // countdown and verified-email line immediately on page load.
  app.options("/api/widget/customer-state", (_req: Request, res: Response) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, x-customer-token");
    res.setHeader("Access-Control-Max-Age", "86400");
    res.sendStatus(204);
  });
  app.get("/api/widget/customer-state", async (req: Request, res: Response) => {
    try {
      const origin = req.headers["origin"] as string | undefined;
      if (origin) res.setHeader("Access-Control-Allow-Origin", origin);

      const authHeader = req.headers["authorization"] as string | undefined;
      if (!authHeader?.startsWith("Bearer ")) return res.status(401).json({ error: "unauthorized" });
      const tokenStr = authHeader.slice(7);
      const parts = tokenStr.split(".");
      if (parts.length !== 3 || parts[0] !== "wup") return res.status(401).json({ error: "invalid_session" });
      let session: any;
      try {
        const payload = Buffer.from(parts[1], "base64url").toString("utf8");
        const secret = process.env.SESSION_SECRET || "dev-secret";
        const expected = crypto.createHmac("sha256", secret).update(payload).digest("hex");
        if (parts[2] !== expected) return res.status(401).json({ error: "invalid_session" });
        session = JSON.parse(payload);
        if (session.exp < Date.now()) return res.status(401).json({ error: "session_expired" });
      } catch {
        return res.status(401).json({ error: "invalid_session" });
      }

      const customerToken = req.headers["x-customer-token"] as string | undefined;
      if (!customerToken) return res.status(400).json({ error: "missing_customer_token" });

      const result = await db.execute(
        sql`SELECT wc.email, wc.render_count, p.free_render_limit
            FROM widget_customers wc
            JOIN partners p ON p.id = wc.partner_id
            WHERE wc.customer_token = ${customerToken}
              AND wc.partner_id = ${session.partnerId}
            LIMIT 1`
      );
      const row = result.rows?.[0] as any;
      if (!row) return res.status(404).json({ error: "not_found" });
      res.json({
        email: row.email,
        rendersUsed: Number(row.render_count ?? 0),
        freeRenderLimit: Number(row.free_render_limit ?? 2),
      });
    } catch (err) {
      console.error("[widget/customer-state]", err);
      res.status(500).json({ error: "server_error" });
    }
  });

  // GET /api/widget/renders — returning-visitor render history list. Mirrors
  // /api/widget/customer-state auth: HMAC-validate Bearer session JWT to
  // resolve partnerId, then JOIN widget_customers via x-customer-token to
  // resolve email. Returns metadata only (id, color_name, manufacturer,
  // created_at) plus total count — image bytes continue to be served by
  // GET /api/widget/renders/:id/image. limit clamped to [1,100], default 5;
  // offset clamped to >=0, default 0.
  app.options("/api/widget/renders", (_req: Request, res: Response) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, x-customer-token");
    res.setHeader("Access-Control-Max-Age", "86400");
    res.sendStatus(204);
  });
  app.get("/api/widget/renders", async (req: Request, res: Response) => {
    try {
      const origin = req.headers["origin"] as string | undefined;
      if (origin) res.setHeader("Access-Control-Allow-Origin", origin);

      const authHeader = req.headers["authorization"] as string | undefined;
      if (!authHeader?.startsWith("Bearer ")) return res.status(401).json({ error: "unauthorized" });
      const tokenStr = authHeader.slice(7);
      const parts = tokenStr.split(".");
      if (parts.length !== 3 || parts[0] !== "wup") return res.status(401).json({ error: "invalid_session" });
      let session: any;
      try {
        const payload = Buffer.from(parts[1], "base64url").toString("utf8");
        const secret = process.env.SESSION_SECRET || "dev-secret";
        const expected = crypto.createHmac("sha256", secret).update(payload).digest("hex");
        if (parts[2] !== expected) return res.status(401).json({ error: "invalid_session" });
        session = JSON.parse(payload);
        if (session.exp < Date.now()) return res.status(401).json({ error: "session_expired" });
      } catch {
        return res.status(401).json({ error: "invalid_session" });
      }

      const customerToken = req.headers["x-customer-token"] as string | undefined;
      if (!customerToken) return res.status(400).json({ error: "missing_customer_token" });

      const customerResult = await db.execute(
        sql`SELECT email FROM widget_customers
            WHERE customer_token = ${customerToken}
              AND partner_id = ${session.partnerId}
            LIMIT 1`
      );
      const customer = customerResult.rows?.[0] as any;
      if (!customer?.email) return res.status(404).json({ error: "not_found" });

      const limitRaw = parseInt(String(req.query.limit ?? "5"), 10);
      const limit = Math.max(1, Math.min(100, isNaN(limitRaw) ? 5 : limitRaw));
      const offsetRaw = parseInt(String(req.query.offset ?? "0"), 10);
      const offset = Math.max(0, isNaN(offsetRaw) ? 0 : offsetRaw);

      const itemsResult = await db.execute(
        sql`SELECT id, color_name, manufacturer, created_at
            FROM partner_renders
            WHERE partner_id = ${session.partnerId} AND customer_email = ${customer.email}
            ORDER BY created_at DESC
            LIMIT ${limit} OFFSET ${offset}`
      );
      const totalResult = await db.execute(
        sql`SELECT COUNT(*)::int AS c FROM partner_renders
            WHERE partner_id = ${session.partnerId} AND customer_email = ${customer.email}`
      );
      const total = Number((totalResult.rows?.[0] as any)?.c ?? 0);

      res.json({
        items: (itemsResult.rows as any[]).map((r) => ({
          id: r.id,
          colorName: r.color_name,
          manufacturer: r.manufacturer,
          createdAt: r.created_at,
        })),
        total,
      });
    } catch (err) {
      console.error("[widget/renders]", err);
      res.status(500).json({ error: "server_error" });
    }
  });

  // ââ Widget email verification endpoints âââââââââââââââââââââââââââââââââ

  // GET /api/widget/colors â return color catalogue for widget session
  app.get('/api/widget/colors', async (req: Request, res: Response) => {
    try {
      const authHeader = req.headers['authorization'] as string | undefined;
      if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: 'unauthorized' });
      const sessionToken = authHeader.slice(7);
      const parts = sessionToken.split('.');
      if (parts.length < 3) return res.status(401).json({ error: 'invalid_session' });
      let session: any;
      try {
        const payloadB64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        session = JSON.parse(Buffer.from(payloadB64, 'base64').toString());
      } catch { return res.status(401).json({ error: 'invalid_session' }); }
      if (!session.partnerId || !session.exp || session.exp < Date.now() / 1000) {
        return res.status(401).json({ error: 'session_expired' });
      }
      const partnerId = session.partnerId as number;
      const brandResult = await db.execute(
        sql`SELECT brand FROM partner_brands WHERE partner_id = ${partnerId}`
      );
      const brands = (brandResult.rows ?? []).map((r: any) => r.brand);
      let colorsResult;
      if (brands.length > 0) {
        colorsResult = await db.execute(
          sql`SELECT wc.id, wc.name, wc.manufacturer, wc.category, wc.hex_color, wc.thumbnail_url
              FROM wrap_colors wc
              LEFT JOIN manufacturers m ON wc.manufacturer = m.name
              WHERE wc.manufacturer = ANY(${toPgTextArray(brands)}::text[])
              ORDER BY m.sort_order ASC NULLS LAST, wc.sort_order, wc.name`
        );
      } else {
        colorsResult = await db.execute(
          sql`SELECT wc.id, wc.name, wc.manufacturer, wc.category, wc.hex_color, wc.thumbnail_url
              FROM wrap_colors wc
              LEFT JOIN manufacturers m ON wc.manufacturer = m.name
              ORDER BY m.sort_order ASC NULLS LAST, wc.sort_order, wc.name`
        );
      }
      const colors = (colorsResult.rows ?? []).map((c: any) => ({
        id: c.id, name: c.name, manufacturer: c.manufacturer,
        category: c.category, hexColor: c.hex_color, thumbnailUrl: c.thumbnail_url,
      }));
      return res.json(colors);
    } catch (err: any) {
      console.error('[widget/colors]', err);
      return res.status(500).json({ error: 'Server error' });
    }
  });

  app.post('/api/widget/verify-email', rejectDisposableEmail(), verifyEmailVelocityLimiter, async (req: Request, res: Response) => {
    try {
      const { name, email, phone, sessionToken } = req.body;
      if (!email || !sessionToken) {
        return res.status(400).json({ error: 'email and sessionToken required' });
      }
      const parts = sessionToken.split('.');
      if (parts.length < 3) return res.status(401).json({ error: 'invalid_session' });
      let session: any;
      try {
        const payloadB64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        session = JSON.parse(Buffer.from(payloadB64, 'base64').toString());
      } catch { return res.status(401).json({ error: 'invalid_session' }); }
      if (!session.partnerId || !session.exp || session.exp < Date.now() / 1000) {
        return res.status(401).json({ error: 'session_expired' });
      }
      const partnerId = session.partnerId as number;

      // 60s per-email cooldown, mirrors consumer twin at routes.ts:1859-1865.
      // Protects SendGrid quota and prevents code spam from a single
      // (partner_id, email) pair.
      const cooldownResult = await db.execute(
        sql`SELECT last_code_sent_at FROM widget_customers
            WHERE partner_id = ${partnerId} AND email = ${email}
            LIMIT 1`
      );
      const lastSentRaw = (cooldownResult.rows?.[0] as any)?.last_code_sent_at;
      if (lastSentRaw) {
        const elapsedMs = Date.now() - new Date(lastSentRaw).getTime();
        if (elapsedMs < 60_000) {
          return res.status(429).json({ message: "Please wait before requesting another code" });
        }
      }

      const code = String(Math.floor(100000 + Math.random() * 900000));
      const expires = new Date(Date.now() + 10 * 60 * 1000);
      await db.execute(
        sql`INSERT INTO widget_customers (partner_id, name, email, phone, verification_code, code_expires_at, last_code_sent_at)
            VALUES (${partnerId}, ${name || null}, ${email}, ${phone || null}, ${code}, ${expires.toISOString()}, now())
            ON CONFLICT (partner_id, email)
            DO UPDATE SET name = EXCLUDED.name, phone = EXCLUDED.phone,
              verification_code = EXCLUDED.verification_code,
              code_expires_at = EXCLUDED.code_expires_at,
              last_code_sent_at = EXCLUDED.last_code_sent_at`
      );
      const emailResult = await sendVerificationCodeEmail({ to: email, name, code: String(code) });
      if (!emailResult.success) {
        console.error('[widget/verify-email] send failed:', emailResult.error);
        return res.status(500).json({ error: 'Failed to send code' });
      }
      return res.json({ success: true });
    } catch (err: any) {
      console.error('[widget/verify-email]', err);
      return res.status(500).json({ error: err.message || 'Failed to send code' });
    }
  });

  app.post('/api/widget/confirm-email', async (req: Request, res: Response) => {
    try {
      const { email, code, sessionToken } = req.body;
      if (!email || !code || !sessionToken) {
        return res.status(400).json({ error: 'email, code, sessionToken required' });
      }
      const parts = sessionToken.split('.');
      if (parts.length < 3) return res.status(401).json({ error: 'invalid_session' });
      let session: any;
      try {
        const payloadB64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        session = JSON.parse(Buffer.from(payloadB64, 'base64').toString());
      } catch { return res.status(401).json({ error: 'invalid_session' }); }
      if (!session.partnerId || !session.exp || session.exp < Date.now() / 1000) {
        return res.status(401).json({ error: 'session_expired' });
      }
      const partnerId = session.partnerId as number;
      const result = await db.execute(
        sql`SELECT wc.*, p.free_render_limit FROM widget_customers wc
            JOIN partners p ON p.id = wc.partner_id
            WHERE wc.email = ${email} AND wc.partner_id = ${partnerId}`
      );
      const customer = result.rows?.[0] as any;
      if (!customer) return res.status(404).json({ error: 'not_found' });
      if (customer.verification_code !== code) return res.status(400).json({ error: 'invalid_code' });
      if (new Date(customer.code_expires_at) < new Date()) return res.status(400).json({ error: 'code_expired' });
      const customerToken = customer.customer_token || require('crypto').randomUUID();
      await db.execute(
        sql`UPDATE widget_customers
            SET verified = true, customer_token = ${customerToken},
                verification_code = null, code_expires_at = null
            WHERE email = ${email} AND partner_id = ${partnerId}`
      );
      return res.json({
        customerToken,
        rendersUsed: Number(customer.render_count ?? 0),
        freeRenderLimit: Number(customer.free_render_limit ?? 2)
      });
    } catch (err: any) {
      console.error('[widget/confirm-email]', err);
      return res.status(500).json({ error: err.message || 'Confirmation failed' });
    }
  });

  // ââ Partner: list widget customers ââââââââââââââââââââââââââââââââââââââââ
  app.get('/api/partner/customers', async (req: Request, res: Response) => {
    try {
      const authHeader = req.headers.authorization || '';
      const token = authHeader.replace('Bearer ', '');
      if (!token) return res.status(401).json({ error: 'unauthorized' });
      let partnerId: number;
      try {
        const [, payloadB64] = token.split('.');
        const payload = JSON.parse(Buffer.from(payloadB64.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString());
        if (!payload.partnerId || payload.exp < Date.now() / 1000) throw new Error('expired');
        partnerId = payload.partnerId;
      } catch { return res.status(401).json({ error: 'invalid_token' }); }
      const result = await db.execute(
        sql`SELECT id, name, email, phone, verified, render_count, created_at
            FROM widget_customers WHERE partner_id = ${partnerId} ORDER BY created_at DESC`
      );
      return res.json(result.rows);
    } catch (err: any) {
      console.error('[partner/customers]', err);
      return res.status(500).json({ error: err.message });
    }
  });

  // ââ Admin: widget customers per partner âââââââââââââââââââââââââââââââââââ
  app.get('/api/admin/partners/:id/customers', requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const partnerId = Number(req.params.id);
      const result = await db.execute(
        sql`SELECT id, name, email, phone, verified, render_count, created_at
            FROM widget_customers WHERE partner_id = ${partnerId} ORDER BY created_at DESC`
      );
      return res.json(result.rows);
    } catch (err: any) {
      console.error('[admin/partner-customers]', err);
      return res.status(500).json({ error: err.message });
    }
  });

  // Admin: get all renders for a specific partner
  app.get('/api/admin/partners/:id/renders', requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const partnerId = Number(req.params.id);
      const result = await db.execute(
        sql`SELECT id, partner_id, customer_email, color_id, color_name, result_image_url, created_at
            FROM partner_renders
            WHERE partner_id = ${partnerId}
            ORDER BY created_at DESC
            LIMIT 200`
      );
      res.json(result.rows);
    } catch (err) {
      console.error('[admin/partner-renders]', err);
      res.status(500).json({ message: 'Failed to load renders' });
    }
  });

}

// =========== Partner Stripe webhook handler ===========
export async function handlePartnerWebhook(req: Request, res: Response): Promise<void> {
  const sig = req.headers["stripe-signature"] as string | undefined;
  const secret = process.env.PARTNER_STRIPE_WEBHOOK_SECRET;

  if (!sig || !secret) {
    res.status(400).json({ error: "Missing webhook signature or secret" });
    return;
  }

  let event: any;
  try {
    const stripe = getUncachableStripeClient();
    event = stripe.webhooks.constructEvent(req.body, sig, secret);
  } catch {
    res.status(400).json({ error: "Webhook signature verification failed" });
    return;
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as any;
    const metadata = session.metadata || {};

    if (metadata.type === "topup") {
      const partnerId = parseInt(metadata.partnerId, 10);
      if (!isNaN(partnerId)) {
        try {
          await db.execute(sql`
            UPDATE partners
            SET credits_remaining = credits_remaining + 40,
                updated_at = NOW()
            WHERE id = ${partnerId}
          `);
        } catch (err) {
          console.error("[partnerWebhook] Failed to add top-up credits:", err);
          res.status(500).json({ error: "Failed to update credits" });
          return;
        }
      }
    } else if (metadata.partnerId) {
      const partnerId = parseInt(metadata.partnerId, 10);
      if (!isNaN(partnerId)) {
        const subscriptionId = session.subscription;
        try {
          await db.execute(sql`
            UPDATE partners
            SET subscription_status = 'active',
                credits_remaining = 150,
                stripe_subscription_id = ${subscriptionId},
                updated_at = NOW()
            WHERE id = ${partnerId}
          `);
        } catch (err) {
          console.error("[partnerWebhook] Failed to activate partner:", err);
          res.status(500).json({ error: "Failed to activate partner account" });
          return;
        }
      }
    }
    // Other checkout session types are silently ignored
  } else if (event.type === "customer.subscription.updated") {
    const subscription = event.data.object as any;
    const subscriptionId = subscription.id;
    const cancelAtPeriodEnd = !!subscription.cancel_at_period_end;
    const cancelAt = subscription.cancel_at
      ? new Date(subscription.cancel_at * 1000)
      : null;

    const result = await db.execute(sql`
      UPDATE partners
      SET cancel_at_period_end = ${cancelAtPeriodEnd},
          cancels_at = ${cancelAt},
          updated_at = NOW()
      WHERE stripe_subscription_id = ${subscriptionId}
      RETURNING id
    `);

    if (result.rows.length) {
      const partnerId = (result.rows[0] as any).id;
      await auditLog(req, "partner.subscription_updated",
        { type: "partners", id: partnerId },
        { payload: {
            subscriptionId,
            cancelAtPeriodEnd,
            cancelAt: cancelAt ? cancelAt.toISOString() : null,
            stripeStatus: subscription.status,
        } }
      );
    }
  } else if (event.type === "customer.subscription.deleted") {
    const subscription = event.data.object as any;
    const subscriptionId = subscription.id;

    const result = await db.execute(sql`
      UPDATE partners
      SET subscription_status = 'cancelled',
          updated_at = NOW()
      WHERE stripe_subscription_id = ${subscriptionId}
      RETURNING id
    `);

    if (result.rows.length) {
      const partnerId = (result.rows[0] as any).id;
      await auditLog(req, "partner.cancelled",
        { type: "partners", id: partnerId },
        { payload: { subscriptionId, stripeStatus: subscription.status } }
      );
    }
  }

  res.status(200).json({ received: true });
}
