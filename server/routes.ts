import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import path from "path";
import fs from "fs";
import sharp from "sharp";
import { GoogleGenAI } from "@google/genai";
import { KITCHEN_SWATCHES } from "@shared/swatches";
import * as storage from "./storage";
import {
  insertWrapColorSchema,
  rateLimitSettingsSchema,
  addCreditsSchema,
  shareDesignSchema,
  shareIntentRequestSchema,
  insertTicketSchema,
  influencerApplicationFormSchema,
  influencerApplications,
  users,
  wrapColors,
  manufacturers,
  consumerVerifiedEmails,
} from "@shared/schema"
import { processResultImage } from "./imageProcessing";
import { lookupGeo } from "./geoLookup";
import { ensureNonHeif } from "./heicToJpeg";
import { sendDesignByEmail, sendDesignBySMS, sendPasswordResetEmail, sendAmbassadorApplicationEmail, sendRenderResultEmail, sendVerificationCodeEmail } from "./notificationService";
import { maskEmail } from "./lib/maskEmail";
import { registerAdminPackageRoutes } from "./adminPackageRoutes";
import { registerPartnerRoutes } from "./partnerRoutes";
import { getUncachableStripeClient, getStripePublishableKey } from "./stripeClient";
import { db , pool} from "./db";
import { sql, and, eq, asc } from "drizzle-orm";
import { verifyPassword, hashPassword } from "./auth";
import crypto from "crypto";
import { auditLog } from "./adminAudit";
import { verifyTurnstileToken } from "./lib/verifyTurnstile";
import { createIpRateLimiters, invalidateRateLimitCache } from "./rateLimit";
import { rejectDisposableEmail } from "./emailValidation";
import { verifyEmailVelocityLimiter } from "./verifyEmailVelocity";
import { ticketHourlyLimiter, ticketDailyLimiter } from "./ticketSubmissionVelocity";

// In-memory store for password reset tokens (cleared on server restart)
const resetTokens = new Map<string, { email: string; expires: number }>();

// Free tier configuration
const FREE_TIER_LIMIT = 2;

// IP-keyed rate limiters for the consumer render endpoint. Three windows
// (minute, hour, day) read from rate_limit_settings via 60s in-memory cache.
const consumerRenderLimiters = createIpRateLimiters();

// PR #70 — referral handle validation. Trims, lowercases, enforces 3-30
// length and a conservative character set. Throws a structured Error on
// invalid input; callers turn that into a 400 response. The DB UNIQUE
// constraint provides duplicate detection; PG error code 23505 is
// translated to 409 by the calling handler.
const HANDLE_REGEX = /^[a-zA-Z0-9_-]+$/;

function validateAndNormalizeHandle(raw: unknown): string {
  if (typeof raw !== "string") {
    throw new Error("referralHandle must be a string");
  }
  const normalized = raw.trim().toLowerCase();
  if (normalized.length < 3 || normalized.length > 30) {
    throw new Error("Handle must be 3-30 characters");
  }
  if (!HANDLE_REGEX.test(normalized)) {
    throw new Error("Handle may contain only letters, digits, _ and -");
  }
  return normalized;
}

// Initialize Gemini AI
const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

// Helper to normalize image to JPEG and resize for Gemini
async function normalizeImageForGemini(
  imagePath: string,
): Promise<{ base64: string; mimeType: string }> {
  const MAX_DIMENSION = 1536;

  // Auto-orient based on EXIF metadata (fixes portrait photos taken on phones),
  // then scale so neither dimension exceeds MAX_DIMENSION while keeping aspect ratio.
  const buffer = await sharp(imagePath)
    .rotate()                                        // apply EXIF orientation
    .resize(MAX_DIMENSION, MAX_DIMENSION, { fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 90 })
    .toBuffer();

  return {
    base64: buffer.toString("base64"),
    mimeType: "image/jpeg",
  };
}

// Helper to load color swatch/reference from a data URI or legacy file path and convert to base64 for Gemini
async function loadColorSwatchForGemini(
  imageUrl: string,
): Promise<{ base64: string; mimeType: string } | null> {
  const MAX_DIMENSION = 512; // Smaller for swatch reference

  try {
    let inputBuffer: Buffer;

    if (imageUrl.startsWith("data:")) {
      // data URI format: "data:<mimeType>;base64,<data>"
      const commaIdx = imageUrl.indexOf(",");
      if (commaIdx === -1) return null;
      const b64 = imageUrl.slice(commaIdx + 1);
      inputBuffer = Buffer.from(b64, "base64");
    } else {
      // Legacy file path: "/colors/3M%202080/Gloss/filename.jpg"
      const decodedUrl = decodeURIComponent(imageUrl);
      const localPath = path.join(process.cwd(), "client/public", decodedUrl);
      if (!fs.existsSync(localPath)) {
        console.log(`Color swatch file not found: ${localPath}`);
        return null;
      }
      inputBuffer = fs.readFileSync(localPath);
    }

    const image = sharp(inputBuffer);
    const metadata = await image.metadata();

    let width = metadata.width || MAX_DIMENSION;
    let height = metadata.height || MAX_DIMENSION;

    // Scale down if needed
    if (width > height) {
      if (width > MAX_DIMENSION) {
        height = Math.round(height * (MAX_DIMENSION / width));
        width = MAX_DIMENSION;
      }
    } else {
      if (height > MAX_DIMENSION) {
        width = Math.round(width * (MAX_DIMENSION / height));
        height = MAX_DIMENSION;
      }
    }

    const normalizedBuffer = await image
      .resize(width, height)
      .jpeg({ quality: 90 })
      .toBuffer();

    return {
      base64: normalizedBuffer.toString("base64"),
      mimeType: "image/jpeg",
    };
  } catch (error) {
    console.error("Error loading color swatch:", error);
    return null;
  }
}

// Helper to extract dominant hex color from a swatch image buffer
async function extractHexFromSwatchBuffer(buffer: Buffer): Promise<string | null> {
  try {
    // Trim white borders first, then get stats on the color area
    const trimmed = await sharp(buffer)
      .trim({ background: "#ffffff", threshold: 30 })
      .toBuffer()
      .catch(() => buffer); // fallback to original if trim fails

    const { channels } = await sharp(trimmed).stats();
    const r = Math.round(channels[0].mean);
    const g = Math.round(channels[1].mean);
    const b = Math.round(channels[2].mean);
    return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
  } catch (e) {
    console.error("Error extracting hex from swatch:", e);
    return null;
  }
}

// Generate car wrap using Gemini 3
async function generateCarWrapWithGemini(
  imagePath: string,
  colorName: string,
  colorHex: string,
  colorSwatchBase64: string | null,
  referenceImageData: string | null,
  options: string[],
): Promise<string> {
  const { base64, mimeType } = await normalizeImageForGemini(imagePath);

  const optionsText =
    options.length > 0
      ? `Additional modifications: ${options.join(", ")}.`
      : "";

  // Build parts array - car image first
  const parts: any[] = [];

  // Try to load color swatch image if URL provided
  console.log(`Attempting to load color swatch for: ${colorName}, imageUrl: ${colorSwatchBase64}`);
  const swatchData = colorSwatchBase64 
    ? await loadColorSwatchForGemini(colorSwatchBase64) 
    : null;

  if (swatchData) {
    console.log(`Successfully loaded color swatch image for ${colorName}`);
  } else {
    console.log(`No swatch image available for ${colorName}, falling back to hex color: ${colorHex}`);
  }

  if (swatchData) {
    // If we have a color swatch image, use it as reference
    const prompt = `Task: Edit the image of the car to apply a "${colorName}" car wrap to the vehicle. The second image is the color/finish reference swatch. ${referenceImageData ? "The third image is a real car wrapped in this color, use it ONLY as a reference for how the color and finish look on a vehicle. DO NOT copy, recreate, or use the specific car, background, angle, or composition from it." : ""}
${optionsText}

CRITICAL INSTRUCTIONS - DO NOT ALTER ANYTHING EXCEPT WHAT IS SPECIFIED:
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
- Apply the wrap color from the swatch image to all painted body panels only
- Match the color, texture, and finish from the color swatch image exactly
- If "Chrome Delete" is specified: change chrome trim to body-color or black
- If "Window Tint" is specified: darken the window glass

OUTPUT FORMAT - VERY IMPORTANT:
- Output ONLY ONE image showing the modified car
- The output image must have the SAME dimensions and aspect ratio as the input car image
- Do NOT create a comparison, collage, side-by-side, or before/after image
- Do NOT stack multiple images vertically or horizontally
- Just output the single edited car image with the wrap applied

Output the modified image maintaining photorealistic quality.`;

    parts.push({ text: prompt });
    parts.push({
      inlineData: {
        mimeType: mimeType,
        data: base64,
      },
    });
    parts.push({
      inlineData: {
        mimeType: swatchData.mimeType,
        data: swatchData.base64,
      },
    });
    // Add reference image (real car in this color) if available — for color/feel context only
    if (referenceImageData) {
      const refMatch = referenceImageData.match(/^data:([^;]+);base64,(.+)$/);
      if (refMatch) {
        parts.push({
          inlineData: {
            mimeType: refMatch[1],
            data: refMatch[2],
          },
        });
      }
    }
  } else {
    // Fallback to hex color if no swatch image
    const prompt = `Task: Edit this image to apply a ${colorName} (${colorHex}) car wrap to the vehicle.
${optionsText}

CRITICAL INSTRUCTIONS - DO NOT ALTER ANYTHING EXCEPT WHAT IS SPECIFIED:
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
- Apply the ${colorName} color wrap to all painted body panels only
- If "Chrome Delete" is specified: change chrome trim to body-color or black
- If "Window Tint" is specified: darken the window glass

OUTPUT FORMAT - VERY IMPORTANT:
- Output ONLY ONE image showing the modified car
- The output image must have the SAME dimensions and aspect ratio as the input car image
- Do NOT create a comparison, collage, side-by-side, or before/after image
- Do NOT stack multiple images vertically or horizontally
- Just output the single edited car image with the wrap applied

Output the modified image maintaining photorealistic quality.`;

    parts.push({ text: prompt });
    parts.push({
      inlineData: {
        mimeType: mimeType,
        data: base64,
      },
    });
  }

  const response = await genAI.models.generateContent({
    model: "gemini-3.1-flash-image-preview",
    contents: [
      {
        parts: parts,
      },
    ],
    config: {
      responseModalities: ["Text", "Image"],
    } as any,
  });

  // Parse the response for the generated image
  let generatedImageBase64: string | null = null;

  if (response.candidates && response.candidates[0]?.content?.parts) {
    for (const part of response.candidates[0].content.parts) {
      if ((part as any).inlineData && (part as any).inlineData.data) {
        generatedImageBase64 = (part as any).inlineData.data;
        break;
      }
    }
  }

  if (!generatedImageBase64) {
    throw new Error("No image generated by Gemini");
  }

  return `data:image/png;base64,${generatedImageBase64}`;
}

// ===== KITCHEN CLONE — finish-swatch render =====
// Renders a kitchen photo with a finish swatch applied to the cabinet doors
// and drawer fronts. Sends EXACTLY TWO images to Gemini, both mandatory:
//   parts[0] = text prompt
//   parts[1] = the user's uploaded kitchen photo   (required)
//   parts[2] = the selected finish/texture swatch  (required)
// There is no hex-color fallback and no optional reference-image (parts[3])
// path — if either image is missing this throws, so a render can never
// silently degrade. Model + config are identical to production (Golden
// Rule 10): gemini-3.1-flash-image-preview with responseModalities Text+Image.
async function generateKitchenWithGemini(
  kitchenPhotoPath: string,
  swatchPath: string,
): Promise<string> {
  if (!kitchenPhotoPath || !fs.existsSync(kitchenPhotoPath)) {
    throw new Error("Kitchen photo is required but was missing");
  }
  if (!swatchPath || !fs.existsSync(swatchPath)) {
    throw new Error("Finish swatch is required but was missing");
  }

  const kitchen = await normalizeImageForGemini(kitchenPhotoPath);
  const swatch = await normalizeImageForGemini(swatchPath);

  const prompt = `Apply the wood grain texture and color from the reference swatch onto the cabinet doors and drawer fronts in the kitchen photo. Keep the countertops, backsplash, walls, floor, appliances, hardware and lighting exactly as they are. Match the grain direction naturally (vertical on doors). Photorealistic, same camera angle and lighting.

The first image is the kitchen photo. The second image is the finish/texture swatch.

OUTPUT FORMAT - VERY IMPORTANT:
- Output ONLY ONE image showing the modified kitchen
- The output image must have the SAME dimensions and aspect ratio as the input kitchen photo
- Do NOT create a comparison, collage, side-by-side, or before/after image
- Do NOT stack multiple images vertically or horizontally`;

  // Both images are unconditional members of the request — no optional push.
  const parts: any[] = [
    { text: prompt },
    { inlineData: { mimeType: kitchen.mimeType, data: kitchen.base64 } },
    { inlineData: { mimeType: swatch.mimeType, data: swatch.base64 } },
  ];

  const response = await genAI.models.generateContent({
    model: "gemini-3.1-flash-image-preview",
    contents: [
      {
        parts: parts,
      },
    ],
    config: {
      responseModalities: ["Text", "Image"],
    } as any,
  });

  let generatedImageBase64: string | null = null;
  if (response.candidates && response.candidates[0]?.content?.parts) {
    for (const part of response.candidates[0].content.parts) {
      if ((part as any).inlineData && (part as any).inlineData.data) {
        generatedImageBase64 = (part as any).inlineData.data;
        break;
      }
    }
  }

  if (!generatedImageBase64) {
    throw new Error("No image generated by Gemini");
  }

  return `data:image/png;base64,${generatedImageBase64}`;
}

// Configure multer for file uploads
const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const upload = multer({
  storage: multer.diskStorage({
    destination: uploadDir,
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      cb(null, uniqueSuffix + path.extname(file.originalname));
    },
  }),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only JPEG, PNG, WebP, and HEIC are allowed."));
    }
  },
});

export async function registerRoutes(
  httpServer: Server,
  app: Express,
): Promise<Server> {
  // Middleware to protect admin routes
  const requireAdminAuth = (req: Request, res: Response, next: Function) => {
    if (!req.session.isAdminAuthenticated) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    next();
  };

  // Stricter gate: required for writes to wrap_colors protected columns
  // (image_url, reference_image_data, manufacturer, color_number, name, category).
  // See server/migrate.ts for the trigger + bypass contract.
  const requireSuperadmin = (req: Request, res: Response, next: Function) => {
    if (!req.session.isAdminAuthenticated || req.session.adminRole !== "superadmin") {
      return res.status(403).json({ message: "Superadmin access required" });
    }
    next();
  };

  // ============ COLORS API ============

  // Get all colors
  app.get("/api/colors", async (req: Request, res: Response) => {
    try {
      const colors = await storage.getColors();
      res.json(colors);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch colors" });
    }
  });

  // Admin-only: returns ALL columns including full-res imageUrl and referenceImageData.
  // The public GET /api/colors intentionally omits imageUrl for mobile performance.
  app.get("/api/admin/colors", async (req: Request, res: Response) => {
    try {
      if (!req.session.isAdminAuthenticated) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const colors = await storage.getColorsAdmin();
      res.json(colors);
    } catch (error) {
      console.error("[GET /api/admin/colors] Error:", error);
      res.status(500).json({ error: "Failed to fetch colors" });
    }
  });

  // TEMPORARY: admin endpoint to backfill thumbnails for existing colors.
  // Remove once backfill has been confirmed successful.
  app.post("/api/admin/run-thumbnail-backfill", async (req: Request, res: Response) => {
    try {
      if (!req.session.isAdminAuthenticated) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const dryRun = req.query.dryRun === "true";

      // Fetch colors that need thumbnails: imageUrl is a data URI and thumbnailUrl is null
      const colorsToProcess = await db
        .select({ id: wrapColors.id, imageUrl: wrapColors.imageUrl })
        .from(wrapColors)
        .where(sql`(${wrapColors.thumbnailUrl} IS NULL OR ${wrapColors.thumbnailUrl} = '') AND (${wrapColors.imageUrl} LIKE 'data:%' OR ${wrapColors.imageUrl} LIKE '/colors/%')`);

      if (dryRun) {
        return res.json({ wouldUpdate: colorsToProcess.length, dryRun: true });
      }

      let updated = 0;
      let skipped = 0;

      for (const color of colorsToProcess) {
        try {
          let imageBuffer: Buffer;
          if (color.imageUrl.startsWith("data:")) {
            const commaIdx = color.imageUrl.indexOf(",");
            if (commaIdx === -1) { updated--; continue; }
            imageBuffer = Buffer.from(color.imageUrl.slice(commaIdx + 1), "base64");
          } else {
            const filePath = path.join(
              process.cwd(), "client", "public",
              color.imageUrl.replace(/^\//, "")
            );
            if (!fs.existsSync(filePath)) {
              console.warn(`Color ${color.id}: file not found at ${filePath}, skipping`);
              updated--;
              continue;
            }
            imageBuffer = fs.readFileSync(filePath);
          }
          const thumbnailBuffer = await sharp(imageBuffer)
            .resize(300, 300, { fit: "cover" })
            .jpeg({ quality: 80 })
            .toBuffer();
          const thumbnailUrl = `data:image/jpeg;base64,${thumbnailBuffer.toString("base64")}`;

          await db
            .update(wrapColors)
            .set({ thumbnailUrl })
            .where(eq(wrapColors.id, color.id));
          updated++;
        } catch (err) {
          console.error(`[backfill] Failed for color ${color.id}:`, err);
          skipped++;
        }
      }

      console.log(`[backfill] Done. updated=${updated} skipped=${skipped}`);
      await auditLog(req, "color.thumbnail_backfill",
        { type: "wrap_colors", id: null },
        { payload: { updated, skipped, dryRun } });
      res.json({ updated, skipped });
    } catch (error) {
      console.error("[POST /api/admin/run-thumbnail-backfill] Error:", error);
      res.status(500).json({ error: "Backfill failed" });
    }
  });

  // Get single color
  app.get("/api/colors/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid color ID" });
      }
      const color = await storage.getColorById(id);
      if (!color) {
        return res.status(404).json({ message: "Color not found" });
      }
      res.json(color);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch color" });
    }
  });

  // Create color
  app.post("/api/colors", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const validation = insertWrapColorSchema.safeParse(req.body);
      if (!validation.success) {
        return res
          .status(400)
          .json({ message: validation.error.errors[0].message });
      }
      // Auto-register a new manufacturer if this color introduces one. Lands
      // the new brand at the bottom of the brand list (MAX(sort_order)+10);
      // superadmin can reorder via the brand-reorder UI later. Idempotent via
      // ON CONFLICT (name).
      if (validation.data.manufacturer) {
        await db.execute(sql`
          INSERT INTO manufacturers (name, sort_order)
          SELECT ${validation.data.manufacturer}, COALESCE(MAX(sort_order), 0) + 10 FROM manufacturers
          ON CONFLICT (name) DO NOTHING
        `);
      }
      // New colors land at the bottom of their brand group (Item 0d spec).
      // The form does not expose sort_order, so the schema default of 0
      // arrives here; treat 0/undefined as "compute next within brand".
      const dataToInsert: typeof validation.data = { ...validation.data };
      if (!dataToInsert.sortOrder) {
        const r = await db.execute(sql`
          SELECT COALESCE(MAX(sort_order), 0) + 1 AS next FROM wrap_colors WHERE manufacturer = ${dataToInsert.manufacturer}
        `);
        dataToInsert.sortOrder = Number((r.rows[0] as any).next);
      }
      const color = await storage.createColor(dataToInsert);
      // Auto-generate thumbnail
      if (color.imageUrl) {
        try {
          let thumbBuffer: Buffer;
          if (color.imageUrl.startsWith("data:")) {
            thumbBuffer = Buffer.from(color.imageUrl.split(",")[1], "base64");
          } else {
            const fp = path.join(process.cwd(), "client", "public", color.imageUrl.replace(/^\//, ""));
            thumbBuffer = fs.readFileSync(fp);
          }
          const thumbnailBuffer = await sharp(thumbBuffer)
            .resize(900, 900, { fit: "cover" })
            .extract({ left: 300, top: 300, width: 300, height: 300 })
            .jpeg({ quality: 80 })
            .toBuffer();
          const thumbnailUrl = `data:image/jpeg;base64,${thumbnailBuffer.toString("base64")}`;
          await db.update(wrapColors).set({ thumbnailUrl }).where(eq(wrapColors.id, color.id));
          (color as any).thumbnailUrl = thumbnailUrl;
        } catch (e) { /* non-fatal */ }
      }
      await auditLog(req, "color.create",
        { type: "wrap_colors", id: color.id },
        { payload: {
            manufacturer: validation.data.manufacturer,
            colorNumber: validation.data.colorNumber,
            name: validation.data.name,
            category: validation.data.category,
            hexColor: validation.data.hexColor,
            sortOrder: dataToInsert.sortOrder,
          } });
      res.status(201).json(color);
    } catch (error) {
      res.status(500).json({ message: "Failed to create color" });
    }
  });

  // Reorder colors (PATCH) — must come before /api/colors/:id to avoid route conflict
  app.patch("/api/colors/reorder", async (req: Request, res: Response) => {
    if (!req.session.isAdminAuthenticated) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    try {
      const { orderedIds } = req.body;
      if (!Array.isArray(orderedIds) || orderedIds.some((id) => typeof id !== "number")) {
        return res.status(400).json({ message: "orderedIds must be an array of numbers" });
      }
      await Promise.all(
        orderedIds.map((id, index) => storage.updateColor(id, { sortOrder: index + 1 } as any))
      );
      await auditLog(req, "color.reorder",
        { type: "wrap_colors", id: null },
        { payload: { count: orderedIds.length, orderedIds } });
      res.json({ ok: true });
    } catch (error) {
      console.error("Reorder error:", error);
      res.status(500).json({ message: "Failed to reorder colors" });
    }
  });

    // Update color
  app.patch("/api/colors/:id", requireSuperadmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid color ID" });
      }
      const validation = insertWrapColorSchema.partial().safeParse(req.body);
      if (!validation.success) {
        return res
          .status(400)
          .json({ message: validation.error.errors[0].message });
      }
      const color = await storage.adminUpdateColor(id, validation.data);
      if (!color) {
        return res.status(404).json({ message: "Color not found" });
      }
      res.json(color);
    } catch (error) {
      res.status(500).json({ message: "Failed to update color" });
    }
  });

  // Delete color
  app.delete("/api/colors/:id", async (req: Request, res: Response) => {
    if (!req.session.isAdminAuthenticated) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid color ID" });
      }
      const before = await storage.getColorById(id);
      if (!before) {
        return res.status(404).json({ message: "Color not found" });
      }
      const deleted = await storage.deleteColor(id);
      if (!deleted) {
        return res.status(404).json({ message: "Color not found" });
      }
      await auditLog(req, "color.delete",
        { type: "wrap_colors", id },
        { before: {
            manufacturer: before.manufacturer,
            colorNumber: before.colorNumber,
            name: before.name,
            category: before.category,
            hexColor: before.hexColor,
            sortOrder: before.sortOrder,
          } });
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete color" });
    }
  });
  // ============================================
  // MUST be defined before PATCH /api/colors/:id to avoid "reorder" being parsed as an id
  app.post("/api/colors/reorder", async (req: Request, res: Response) => {
    if (!req.session.isAdminAuthenticated) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    try {
      const { orderedIds } = req.body;
      if (!Array.isArray(orderedIds) || orderedIds.some((id) => typeof id !== "number")) {
        return res.status(400).json({ message: "orderedIds must be an array of numbers" });
      }
      // Update each color's sort_order to its position in the array (1-based: first = 1, not 0)
      // IMPORTANT: never use 0-based index — migrate.ts previously reset sort_order=0 rows to their DB id
      await Promise.all(
        orderedIds.map((id, index) => storage.updateColor(id, { sortOrder: index + 1 } as any))
      );
      await auditLog(req, "color.reorder",
        { type: "wrap_colors", id: null },
        { payload: { count: orderedIds.length, orderedIds } });
      res.json({ ok: true });
    } catch (error) {
      console.error("Reorder error:", error);
      res.status(500).json({ message: "Failed to reorder colors" });
    }
  });

  // ============ MANUFACTURERS API (Item 0d) ============

  // Public list of manufacturers in display order. Drives the brand-reorder
  // UI on /admin/colors and is safe to expose unauthenticated (the same
  // names are already public via /api/colors and /api/partner/brands-list).
  app.get("/api/manufacturers", async (_req: Request, res: Response) => {
    try {
      const rows = await db.select().from(manufacturers)
        .orderBy(asc(manufacturers.sortOrder), asc(manufacturers.name));
      res.json(rows);
    } catch (err) {
      console.error("[GET /api/manufacturers] Error:", err);
      res.status(500).json({ error: "Failed to fetch manufacturers" });
    }
  });

  // Reorder manufacturer (brand) display groups. Superadmin-only per Item 0d
  // spec — same gate as the GR 6 protected wrap_colors writes. Sort orders
  // are rewritten to (index+1)*10 to match the migration seed spacing so
  // future single-row moves don't have to renumber everything.
  app.patch("/api/manufacturers/reorder", requireSuperadmin, async (req: Request, res: Response) => {
    try {
      const { orderedIds } = req.body;
      if (!Array.isArray(orderedIds) || orderedIds.some((id) => typeof id !== "number")) {
        return res.status(400).json({ message: "orderedIds must be an array of numbers" });
      }
      await Promise.all(
        orderedIds.map((id, index) =>
          db.update(manufacturers).set({ sortOrder: (index + 1) * 10 }).where(eq(manufacturers.id, id))
        )
      );
      await auditLog(req, "manufacturer.reorder",
        { type: "manufacturers", id: null },
        { payload: { count: orderedIds.length, orderedIds } });
      res.json({ ok: true });
    } catch (error) {
      console.error("Manufacturer reorder error:", error);
      res.status(500).json({ message: "Failed to reorder manufacturers" });
    }
  });

  // Item 0l Session 1 — create a new manufacturer (typically pipeline state)
  // from the admin UI. Lands the row just above the __request__ placeholder
  // so the dropdown order is: active brands → in_progress → pipeline → request.
  // Note: the existing auto-register pattern in POST /api/colors:478-484 uses
  // an unfiltered MAX(sort_order) which would now place new auto-registered
  // brands AFTER the __request__ placeholder. Tracked as a v31 cleanup item.
  app.post("/api/manufacturers", requireSuperadmin, async (req: Request, res: Response) => {
    try {
      const allowedStatuses = ["active", "in_progress", "pipeline", "request"];

      const rawName = typeof req.body?.name === "string" ? req.body.name.trim() : "";
      const status = typeof req.body?.status === "string" ? req.body.status : "";
      const rawDisplayLabel = typeof req.body?.displayLabel === "string" ? req.body.displayLabel.trim() : "";
      const displayLabel = rawDisplayLabel.length > 0 ? rawDisplayLabel : null;

      if (!rawName) {
        return res.status(400).json({ message: "Name is required" });
      }
      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({ message: "Status must be one of: active, in_progress, pipeline, request" });
      }
      // Guard: 'request' status is reserved for the system __request__
      // placeholder seeded in the schema migration. Allowing additional rows
      // would surface duplicate "My brand isn't listed →" entries in the
      // consumer dropdown.
      if (status === "request") {
        return res.status(400).json({ message: "Request status is reserved for the __request__ placeholder" });
      }

      // Duplicate-name check (case-insensitive). The DB UNIQUE constraint on
      // name is case-sensitive, so this catches "Avery Dennison" vs
      // "avery dennison" before we hit a constraint error.
      const [existing] = await db
        .select({ id: manufacturers.id })
        .from(manufacturers)
        .where(sql`LOWER(${manufacturers.name}) = LOWER(${rawName})`)
        .limit(1);
      if (existing) {
        return res.status(409).json({ message: "A manufacturer with this name already exists" });
      }

      // Land the new brand at the bottom of the real-brand list (above the
      // __request__ placeholder, which sits at sort_order=9999).
      const sortOrderRow = await db.execute(sql`
        SELECT COALESCE(MAX(sort_order), 0) + 10 AS next
          FROM manufacturers
         WHERE status != 'request'
      `);
      const nextSortOrder = Number((sortOrderRow.rows[0] as any).next);

      const [row] = await db
        .insert(manufacturers)
        .values({
          name: rawName,
          status,
          displayLabel,
          sortOrder: nextSortOrder,
        })
        .returning();

      await auditLog(req, "manufacturer.create",
        { type: "manufacturers", id: row.id },
        { payload: { name: row.name, status: row.status, displayLabel: row.displayLabel, sortOrder: row.sortOrder } });
      res.status(201).json(row);
    } catch (error) {
      console.error("[POST /api/manufacturers] Error:", error);
      res.status(500).json({ message: "Failed to create manufacturer" });
    }
  });

  // Item 0l Session 1 — transition a manufacturer's status (and optionally
  // displayLabel). Typical sequence: pipeline → in_progress → active. Refuses
  // to touch the __request__ placeholder or to set status='request'.
  app.patch("/api/manufacturers/:id/status", requireSuperadmin, async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ message: "Invalid manufacturer id" });
      }

      const allowedStatuses = ["active", "in_progress", "pipeline", "request"];
      const status = typeof req.body?.status === "string" ? req.body.status : "";
      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({ message: "Status must be one of: active, in_progress, pipeline, request" });
      }
      if (status === "request") {
        return res.status(400).json({ message: "Request status is reserved for the __request__ placeholder" });
      }

      const [existing] = await db.select().from(manufacturers).where(eq(manufacturers.id, id)).limit(1);
      if (!existing) {
        return res.status(404).json({ message: "Manufacturer not found" });
      }
      // Guard: never modify the __request__ placeholder. It is a system
      // sentinel; transitioning it to a real status would break the consumer
      // brand-request popup in Session 2.
      if (existing.name === "__request__") {
        return res.status(400).json({ message: "The __request__ placeholder cannot be modified" });
      }

      // displayLabel is optional. Empty string clears it (back to NULL); any
      // non-empty string trims and stores. Absent key leaves the existing
      // value untouched.
      const updateData: { status: string; displayLabel?: string | null } = { status };
      if (req.body && Object.prototype.hasOwnProperty.call(req.body, "displayLabel")) {
        const rawLabel = typeof req.body.displayLabel === "string" ? req.body.displayLabel.trim() : "";
        updateData.displayLabel = rawLabel.length > 0 ? rawLabel : null;
      }

      const [row] = await db
        .update(manufacturers)
        .set(updateData)
        .where(eq(manufacturers.id, id))
        .returning();

      await auditLog(req, "manufacturer.status_change",
        { type: "manufacturers", id: row.id },
        { payload: {
            name: row.name,
            oldStatus: existing.status,
            newStatus: row.status,
            oldDisplayLabel: existing.displayLabel,
            newDisplayLabel: row.displayLabel,
          } });
      res.json(row);
    } catch (error) {
      console.error("[PATCH /api/manufacturers/:id/status] Error:", error);
      res.status(500).json({ message: "Failed to update manufacturer status" });
    }
  });

  // Upload color swatch image
  app.post(
    "/api/colors/:id/swatch",
    requireSuperadmin,
    upload.single("image"),
    async (req: Request, res: Response) => {
      try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) {
          if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
          }
          return res.status(400).json({ message: "Invalid color ID" });
        }

        if (!req.file) {
          return res.status(400).json({ message: "No image uploaded" });
        }

        const color = await storage.getColorById(id);
        if (!color) {
          fs.unlinkSync(req.file.path);
          return res.status(404).json({ message: "Color not found" });
        }

        // Read the raw file buffer (needed for both storage and hex extraction)
        const rawBuffer = fs.readFileSync(req.file.path);

        // Trim white borders and convert to JPEG for storage
        const trimmedBuffer = await sharp(rawBuffer)
          .trim({ background: "#ffffff", threshold: 30 })
          .jpeg({ quality: 90 })
          .toBuffer()
          .catch(async () => {
            // Fallback: just convert to jpeg without trimming
            return sharp(rawBuffer).jpeg({ quality: 90 }).toBuffer();
          });

        const imageUrl = `data:image/jpeg;base64,${trimmedBuffer.toString("base64")}`;

        // Generate 300x300 cover-fit thumbnail for fast list loading
    const thumbnailBuffer = await sharp(trimmedBuffer)
      .resize(900, 900, { fit: "cover" })
      .extract({ left: 300, top: 300, width: 300, height: 300 })
      .jpeg({ quality: 80 })
      .toBuffer();
    const thumbnailUrl = `data:image/jpeg;base64,${thumbnailBuffer.toString("base64")}`;

    // Auto-extract hex color from the trimmed swatch
        const autoHex = await extractHexFromSwatchBuffer(trimmedBuffer);

        // Clean up uploaded file
        fs.unlinkSync(req.file.path);

        // Update the color with the image (and auto-extracted hex if available)
        const updateData: Record<string, any> = { imageUrl, thumbnailUrl };
        if (autoHex) {
          updateData.hexColor = autoHex;
        }
        const updatedColor = await storage.adminUpdateColor(id, updateData);
        res.json({ ...updatedColor, autoHex });
      } catch (error) {
        console.error("Upload swatch error:", error);
        res.status(500).json({ message: "Failed to upload swatch image" });
      }
    }
  );

  // Upload reference image for a color (real car photo in that color)
  app.post(
    "/api/colors/:id/reference",
    requireSuperadmin,
    upload.single("image"),
    async (req: Request, res: Response) => {
      try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) {
          if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
          return res.status(400).json({ message: "Invalid color ID" });
        }
        if (!req.file) {
          return res.status(400).json({ message: "No image uploaded" });
        }
        const color = await storage.getColorById(id);
        if (!color) {
          fs.unlinkSync(req.file.path);
          return res.status(404).json({ message: "Color not found" });
        }

        // Normalize and store as base64 data URI
        const { base64 } = await normalizeImageForGemini(req.file.path);
        const referenceImageData = `data:image/jpeg;base64,${base64}`;

        // Clean up uploaded file
        fs.unlinkSync(req.file.path);

        const updatedColor = await storage.adminUpdateColor(id, { referenceImageData });
        res.json(updatedColor);
      } catch (error) {
        console.error("Upload reference error:", error);
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        res.status(500).json({ message: "Failed to upload reference image" });
      }
    }
  );

  // Remove reference image for a color
  app.delete("/api/colors/:id/reference", requireSuperadmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid color ID" });
      const color = await storage.getColorById(id);
      if (!color) return res.status(404).json({ message: "Color not found" });
      const updatedColor = await storage.adminUpdateColor(id, { referenceImageData: null });
      res.json(updatedColor);
    } catch (error) {
      res.status(500).json({ message: "Failed to remove reference image" });
    }
  });

  // Bulk import a single color with swatch (and optional reference) in one request.
  // Called once per row from the staging table in the admin UI.
  const importUpload = multer({
    storage: multer.diskStorage({
      destination: uploadDir,
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
      },
    }),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      const allowed = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
      cb(null, allowed.includes(file.mimetype) as any);
    },
  }).fields([
    { name: "swatch", maxCount: 1 },
    { name: "reference", maxCount: 1 },
  ]);

  app.post(
    "/api/colors/import",
    requireAdminAuth,
    importUpload,
    async (req: Request, res: Response) => {
      const files = req.files as Record<string, Express.Multer.File[]>;
      const swatchFile = files?.swatch?.[0];
      const referenceFile = files?.reference?.[0];

      try {
        const { manufacturer, colorNumber, name, category, hexColor } = req.body;

        if (!manufacturer || !name) {
          return res.status(400).json({ message: "manufacturer and name are required" });
        }

        // Process swatch
        let imageUrl: string | null = null;
        let autoHex: string | null = null;
        if (swatchFile) {
          const rawBuffer = fs.readFileSync(swatchFile.path);
          const trimmedBuffer = await sharp(rawBuffer)
            .trim({ background: "#ffffff", threshold: 30 })
            .jpeg({ quality: 90 })
            .toBuffer()
            .catch(() => sharp(rawBuffer).jpeg({ quality: 90 }).toBuffer());

          imageUrl = `data:image/jpeg;base64,${trimmedBuffer.toString("base64")}`;
          autoHex = await extractHexFromSwatchBuffer(trimmedBuffer);
          fs.unlinkSync(swatchFile.path);
        }

        // Process reference
        let referenceImageData: string | null = null;
        if (referenceFile) {
          const { base64 } = await normalizeImageForGemini(referenceFile.path);
          referenceImageData = `data:image/jpeg;base64,${base64}`;
          fs.unlinkSync(referenceFile.path);
        }

        const finalHex = (hexColor && hexColor !== "#000000") ? hexColor : (autoHex ?? "#888888");

        const newColor = await storage.createColor({
          manufacturer,
          colorNumber: colorNumber || null,
          name,
          category: category || "Gloss",
          hexColor: finalHex,
          imageUrl,
          referenceImageData,
        } as any);

        // Auto-generate thumbnail
        if (newColor.imageUrl) {
          try {
            let thumbBuffer: Buffer;
            if (newColor.imageUrl.startsWith("data:")) {
              thumbBuffer = Buffer.from(newColor.imageUrl.split(",")[1], "base64");
            } else {
              const fp = path.join(process.cwd(), "client", "public", newColor.imageUrl.replace(/^\//, ""));
              thumbBuffer = fs.readFileSync(fp);
            }
            const thumbnailBuffer = await sharp(thumbBuffer)
              .resize(900, 900, { fit: "cover" })
              .extract({ left: 300, top: 300, width: 300, height: 300 })
              .jpeg({ quality: 80 })
              .toBuffer();
            const thumbnailUrl = `data:image/jpeg;base64,${thumbnailBuffer.toString("base64")}`;
            await db.update(wrapColors).set({ thumbnailUrl }).where(eq(wrapColors.id, newColor.id));
            (newColor as any).thumbnailUrl = thumbnailUrl;
          } catch (e) { /* non-fatal */ }
        }
        await auditLog(req, "color.import",
          { type: "wrap_colors", id: newColor.id },
          { payload: {
              manufacturer,
              colorNumber: colorNumber || null,
              name,
              category: category || "Gloss",
              hexColor: finalHex,
              hadSwatch: !!swatchFile,
              hadReference: !!referenceFile,
            } });
        res.json({ ...newColor, autoHex });
      } catch (error) {
        console.error("Import color error:", error);
        if (swatchFile && fs.existsSync(swatchFile.path)) fs.unlinkSync(swatchFile.path);
        if (referenceFile && fs.existsSync(referenceFile.path)) fs.unlinkSync(referenceFile.path);
        res.status(500).json({ message: "Failed to import color" });
      }
    }
  );

  // ============ CREDITS & PAYMENT API ============

  // Get Stripe publishable key
  app.get("/api/stripe/publishable-key", async (req: Request, res: Response) => {
    try {
      const key = getStripePublishableKey();
      res.json({ publishableKey: key });
    } catch (error) {
      console.error("Error getting publishable key:", error);
      res.status(500).json({ message: "Payment system unavailable" });
    }
  });

  // Get credit packages (from Stripe products)
  app.get("/api/credit-packages", async (req: Request, res: Response) => {
    try {
      // First try reading from the credit_packages table (managed via admin panel)
      const dbResult = await db.execute(
        sql`SELECT package_id, name, description, credits, price, price_id, savings, popular, plan_type, sort_order
             FROM credit_packages
             WHERE active = true AND plan_type != 'partner' AND price_id IS NOT NULL AND price_id != ''
             ORDER BY sort_order ASC, price ASC`
      );

      if (dbResult.rows.length > 0) {
      const packages = dbResult.rows.map((row: any) => {
        // Parse credits from description if DB credits is 0
        const dbCredits = row.credits || 0;
        const descCredits = parseInt((row.description || '').match(/(\d+)\s*credits/i)?.[1] || '0', 10);
        const credits = dbCredits || descCredits;
        // Auto-detect Top-Up products by name
        const isTopUp = /top.?up/i.test(row.name);
        const planType = isTopUp ? 'topup' : (row.plan_type || 'plan');
        return {
          id: row.package_id,
          name: row.name,
          description: row.description,
          credits,
          price: row.price,
          priceId: row.price_id || null,
          savings: row.savings || null,
          popular: row.popular || false,
          plan_type: planType,
        };
      });
        return res.json(packages);
      }

      const stripe = getUncachableStripeClient();
      const stripePrices = await stripe.prices.list({
        active: true,
        expand: ['data.product'],
        limit: 100,
      });

      const stripePackages: any[] = [];
      for (const price of stripePrices.data) {
        const product = price.product as any;
        if (!product || typeof product === 'string' || !product.active) continue;

        // Skip partner and test products from Stripe fallback
        if (product.name.toLowerCase().includes('partner') || product.name.toLowerCase().includes('test')) continue;

        // Parse credits from product description (e.g. "20 credits per month" -> 20)
        const descCredits = parseInt((product.description || '').match(/(\d+)\s*credits/i)?.[1] || '0', 10);
        const credits = parseInt(product.metadata?.credits || '0', 10) || descCredits;

        // Auto-detect plan type: subscription if recurring, topup if name contains "top-up"
        const isTopUp = /top.?up/i.test(product.name);
        const planType = price.recurring ? 'subscription' : (isTopUp ? 'topup' : (product.metadata?.plan_type || 'plan'));

        stripePackages.push({
          id: product.id,
          name: product.name,
          description: product.description || '',
          credits,
          savings: product.metadata?.savings || null,
          popular: product.metadata?.popular === 'true',
          priceId: price.id,
          plan_type: planType,
          price: (price.unit_amount || 0) / 100,
        });
      }

      if (stripePackages.length > 0) {
        stripePackages.sort((a, b) => a.price - b.price);
        return res.json(stripePackages);
      }
      // No packages found - return empty array
      res.json([]);
    } catch (error) {
      console.error("Error fetching credit packages:", error);
      res.status(500).json({ error: "Failed to load packages", details: String(error) });
    }
  });


  // Get user credit status
  app.get("/api/credits/status", async (req: Request, res: Response) => {
    const user = (req as any).user;

    if (user?.id) {
      // Authenticated user - check for credits
      let credits = await storage.getUserCredits(user.id);

      // If user has email but no credits, check if there's a stripe-created user with same email
      // This links accounts when a user who purchased anonymously later logs in
      if (credits === 0 && user.email) {
        const linkedCredits = await linkUserByEmail(user.id, user.email);
        if (linkedCredits > 0) {
          credits = linkedCredits;
        }
      }

      return res.json({
        isAuthenticated: true,
        credits,
        freeUsageRemaining: 0,
        canGenerate: credits > 0,
      });
    }

    // Anonymous — cookie-based free-render counter (Item 0c). Any stale
    // fingerprintId query param from older bundles is silently ignored.
    // Orphaned cookies are NOT cleared here; /api/consumer/customer-state
    // is the canonical rehydrate endpoint that handles that side-effect.
    const cookie = req.cookies?.wup_consumer_token;
    if (typeof cookie === "string" && cookie) {
      const row = await storage.getConsumerStateByToken(cookie);
      if (row && row.verifiedAt) {
        const remaining = Math.max(0, FREE_TIER_LIMIT - row.renderCount);
        return res.json({
          isAuthenticated: false,
          credits: 0,
          freeUsageRemaining: remaining,
          canGenerate: remaining > 0,
        });
      }
    }

    // No cookie, or cookie present but row is missing/unverified: report
    // the clean-slate quota so the frontend can show "X free renders" as
    // a verification incentive rather than zero.
    res.json({
      isAuthenticated: false,
      credits: 0,
      freeUsageRemaining: FREE_TIER_LIMIT,
      canGenerate: true,
    });
  });

  // Helper to link credits from stripe-created user to auth user by email
  async function linkUserByEmail(authUserId: string, email: string): Promise<number> {
    try {
      // Find any stripe-created users with matching email that have credits
      const stripeUsers = await db.select()
        .from(users)
        .where(
          and(
            eq(users.email, email),
            sql`id LIKE 'stripe_%'`,
            sql`credits > 0`
          )
        );
      
      let totalTransferred = 0;
      
      for (const stripeUser of stripeUsers) {
        if (stripeUser.id === authUserId) continue;
        
        const creditsToTransfer = stripeUser.credits || 0;
        if (creditsToTransfer <= 0) continue;
        
        // Transfer credits to the authenticated user
        // Get current user to check if they have a stripeCustomerId
        const [currentUser] = await db.select().from(users).where(eq(users.id, authUserId));
        await db.update(users)
          .set({ 
            credits: sql`credits + ${creditsToTransfer}`,
            stripeCustomerId: currentUser?.stripeCustomerId || stripeUser.stripeCustomerId,
            updatedAt: new Date()
          })
          .where(eq(users.id, authUserId));
        
        // Zero out the stripe user's credits
        await db.update(users)
          .set({ credits: 0, updatedAt: new Date() })
          .where(eq(users.id, stripeUser.id));
        
        console.log(`Transferred ${creditsToTransfer} credits from ${stripeUser.id} to ${authUserId}`);
        totalTransferred += creditsToTransfer;
      }
      
      return totalTransferred;
    } catch (error) {
      console.error('Error linking user by email:', error);
      return 0;
    }
  }

  // Get user subscription status
  app.get("/api/subscription/status", async (req: Request, res: Response) => {
    const user = (req as any).user;
    if (!user?.id) {
      return res.json({ hasSubscription: false });
    }
    try {
      const result = await db.execute(
        sql`SELECT subscription_id, subscription_status, subscription_plan_id,
                   subscription_renews_at, subscription_credits_per_month
            FROM users WHERE id = ${user.id}`
      );
      const row = result.rows[0] as any;
      if (row?.subscription_status === 'active') {
        return res.json({
          hasSubscription: true,
          subscriptionId: row.subscription_id,
          status: row.subscription_status,
          planId: row.subscription_plan_id,
          renewsAt: row.subscription_renews_at,
          creditsPerMonth: row.subscription_credits_per_month,
        });
      }
      return res.json({ hasSubscription: false });
    } catch (error) {
      console.error("Error fetching subscription status:", error);
      return res.json({ hasSubscription: false });
    }
  });

  // Create checkout session for credits or subscriptions (requires authentication)
  app.post("/api/checkout", async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const { priceId, credits, planType, packageId } = req.body;

      if (!priceId || !credits) {
        return res.status(400).json({ message: "Missing price or credits info" });
      }

      // Require authentication for purchases
      if (!user?.id) {
        return res.status(401).json({ message: "You must be logged in to purchase credits" });
      }

      const stripe = getUncachableStripeClient();
      const baseUrl = `https://${req.get('host')}`;

      const userId = user.id;
      const userEmail = user.email;

      // Get or create Stripe customer
      const dbUser = await storage.getUser(userId);
      let customerId = dbUser?.stripeCustomerId;

      // Verify existing customer still exists in Stripe
      if (customerId) {
        try {
          await stripe.customers.retrieve(customerId);
        } catch (e: any) {
          console.error("Stored Stripe customer not found, creating new one:", customerId);
          customerId = null;
        }
      }

      if (!customerId) {
        const customer = await stripe.customers.create({
          email: userEmail,
          metadata: { userId: String(userId) },
        });
        customerId = customer.id;
        await storage.updateUser(userId, { stripeCustomerId: customerId });
      }

      const isSubscription = planType === 'subscription';

      const sessionConfig: any = {
        payment_method_types: ['card'],
        line_items: [{ price: priceId, quantity: 1 }],
        mode: isSubscription ? 'subscription' : 'payment',
        success_url: `${baseUrl}?checkout=success`,
        cancel_url: `${baseUrl}?checkout=cancel`,
        customer: customerId,
        metadata: {
          credits: String(credits),
          priceId,
          userId: String(userId),
          planType: planType || 'plan',
          packageId: packageId || '',
        },
      };

      // For subscriptions, put metadata on the subscription object too
      if (isSubscription) {
        sessionConfig.subscription_data = {
          metadata: {
            credits: String(credits),
            priceId,
            userId: String(userId),
            planType: 'subscription',
            packageId: packageId || '',
          },
        };
      }

      const session = await stripe.checkout.sessions.create(sessionConfig);
      res.json({ url: session.url });
    } catch (error) {
      console.error("Checkout error message:", error?.message);
    console.error("Checkout error type:", error?.type);
    console.error("Checkout error code:", error?.code);
    console.error("Checkout error param:", error?.param);
      res.status(500).json({ message: "Failed to create checkout session" });
    }
  });

  // ============ GENERATE API ============

  // Generate kitchen finish visualization (CLONE — was: car wrap)
  app.post(
    "/api/generate",
    ...consumerRenderLimiters,
    upload.single("image"),
    async (req: Request, res: Response) => {
      try {
        // ===== CLONE COST GUARD =====
        // An open /api/generate on a public Railway URL is an open Gemini-spend
        // faucet on Peter's API account. Require a shared secret sent as the
        // x-kitchen-secret header. FAIL CLOSED: if KITCHEN_TEST_SECRET is unset
        // OR the header does not match, return 403 and never call Gemini. The
        // frontend sends this header automatically from VITE_KITCHEN_TEST_SECRET
        // (set both env vars to the same value locally and on Railway).
        const requiredSecret = process.env.KITCHEN_TEST_SECRET || "";
        if (!requiredSecret || req.header("x-kitchen-secret") !== requiredSecret) {
          if (!requiredSecret) {
            console.warn(
              "[kitchen] KITCHEN_TEST_SECRET is not set — refusing all /api/generate requests (fail-closed). Set it to enable the endpoint.",
            );
          }
          return res.status(403).json({ message: "Forbidden" });
        }

        if (!req.file) {
          return res.status(400).json({ message: "No image uploaded" });
        }

        // HEIC/HEIF pre-processing — convert iPhone HEIC to JPEG before any
        // Sharp/Gemini call. Pure passthrough for non-HEIF (12-byte sniff).
        // See server/heicToJpeg.ts for the why.
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

        // Resolve the selected finish swatch from the hardcoded static set
        // (client/public/swatches/). No DB color lookup — the swatch is a file
        // on disk, so it can never silently fail into a degraded path. Both the
        // kitchen photo (uploaded above) and this swatch are mandatory.
        const { swatchId } = req.body;
        if (!swatchId) {
          if (fs.existsSync(workingPath)) fs.unlinkSync(workingPath);
          return res.status(400).json({ message: "Swatch selection is required" });
        }
        const swatch = KITCHEN_SWATCHES.find((s) => s.id === swatchId);
        if (!swatch) {
          if (fs.existsSync(workingPath)) fs.unlinkSync(workingPath);
          return res.status(400).json({ message: "Invalid swatch selection" });
        }
        const swatchPath = path.join(process.cwd(), "client/public/swatches", swatch.file);
        if (!fs.existsSync(swatchPath)) {
          if (fs.existsSync(workingPath)) fs.unlinkSync(workingPath);
          console.error(`[kitchen] Swatch file missing on disk: ${swatchPath}`);
          return res.status(500).json({ message: "Swatch image not available on server" });
        }

        // ===== CLONE: email / credit / verification gate BYPASSED =====
        // This throwaway clone is not configured for SendGrid, so the consumer
        // email-verification gate below would make it impossible to test (no
        // verification email -> no render). The original PRODUCTION gate is
        // preserved verbatim (commented out) so the bypass is obvious and fully
        // reversible. Do NOT ship this clone as a public consumer product
        // without restoring it. To restore: un-comment and re-add the colorId /
        // email parsing this clone removed.
        //
        // --- BEGIN original production gate (DISABLED in clone) ---
        // if (!email) {
        //   return res.status(400).json({ message: "Email is required" });
        // }
        //
        // // Determine if user has credits or free usage
        // const user = (req as any).user;
        // let isPaidGeneration = false;
        // let userId: string | null = null;
        //
        // if (user?.id) {
        //   // Authenticated user - check credits
        //   userId = user.id;
        //   const credits = await storage.getUserCredits(userId);
        //   if (credits > 0) {
        //     isPaidGeneration = true;
        //   }
        // }
        //
        // let consumerToken: string | null = null;
        // let consumerRenderCount = 0;
        // if (!isPaidGeneration) {
        //   const cookie = req.cookies?.wup_consumer_token;
        //   if (typeof cookie !== "string" || !cookie) {
        //     if (fs.existsSync(workingPath)) fs.unlinkSync(workingPath);
        //     return res.status(401).json({ message: "Email verification required" });
        //   }
        //   const consumerRow = await storage.getConsumerStateByToken(cookie);
        //   if (!consumerRow || !consumerRow.verifiedAt) {
        //     if (fs.existsSync(workingPath)) fs.unlinkSync(workingPath);
        //     return res.status(401).json({ message: "Email verification required" });
        //   }
        //   if (consumerRow.renderCount >= FREE_TIER_LIMIT) {
        //     if (fs.existsSync(workingPath)) fs.unlinkSync(workingPath);
        //     return res.status(402).json({
        //       message: "Free tier limit reached",
        //       requiresPayment: true,
        //       usageCount: consumerRow.renderCount,
        //       limit: FREE_TIER_LIMIT,
        //     });
        //   }
        //   consumerToken = cookie;
        //   consumerRenderCount = consumerRow.renderCount;
        // }
        // --- END original production gate (DISABLED in clone) ---

        let rawImageUrl: string;
        let originalImageData: string | null = null;

        try {
          // Read original image before it gets deleted (for before/after comparison)
          // Convert to JPEG so browsers can display it
          if (fs.existsSync(workingPath)) {
            const jpegBuffer = await sharp(workingPath).rotate().jpeg({ quality: 90 }).toBuffer();
            originalImageData = `data:image/jpeg;base64,${jpegBuffer.toString("base64")}`;
          }

          // Render via Gemini — TWO mandatory images:
          //   parts[1] = the user's kitchen photo, parts[2] = the finish swatch.
          rawImageUrl = await generateKitchenWithGemini(workingPath, swatchPath);
        } finally {
          // Clean up uploaded file
          if (fs.existsSync(workingPath)) {
            fs.unlinkSync(workingPath);
          }
        }

        // Render-validation clone: return the raw Gemini image directly. No
        // watermark/branding (processResultImage needs color metadata that no
        // longer exists), no DB writes (no wrap_colors row, no email submission,
        // no generated_images row), no auto-email. The production bookkeeping
        // that lived here was stripped for the test — recover it from the
        // vehicle repo / git history if this clone is ever productized.
        res.json({
          imageUrl: rawImageUrl,
          originalImageData: originalImageData,
          message: "Design generated successfully",
          swatchId: swatch.id,
          swatchLabel: swatch.label,
        });
      } catch (error) {
        console.error("Generate error:", error);
        res.status(500).json({ message: "Failed to generate design" });
      }
    },
  );

  // =========== GET /api/designs/:id/image ===========
  app.get("/api/designs/:id/image", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid design ID" });

      const design = await storage.getGeneratedImageById(id);
      if (!design) return res.status(404).json({ message: "Design not found" });

      // imageData is a base64 data URL like "data:image/jpeg;base64,..."
      const match = design.imageData.match(/^data:(image\/\w+);base64,(.+)$/);
      if (!match) return res.status(500).json({ message: "Invalid image data" });

      const [, mimeType, b64] = match;
      const buffer = Buffer.from(b64, "base64");
      res.set("Content-Type", mimeType);
      res.set("Cache-Control", "public, max-age=86400");
      res.send(buffer);
    } catch (err) {
      console.error("Image serve error:", err);
      res.status(500).json({ message: "Failed to serve image" });
    }
  });

  // =========== GET /api/designs/:id/original ===========
  // Sibling of /api/designs/:id/image — serves the user's original (pre-render)
  // photo from the original_image_data column. Same public-no-auth posture
  // and Cache-Control. 404 when original_image_data is NULL (older renders or
  // server-rejected uploads).
  app.get("/api/designs/:id/original", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid design ID" });

      const design = await storage.getGeneratedImageById(id);
      if (!design) return res.status(404).json({ message: "Design not found" });
      if (!design.originalImageData) return res.status(404).json({ message: "Original not available" });

      const match = design.originalImageData.match(/^data:(image\/\w+);base64,(.+)$/);
      if (!match) return res.status(500).json({ message: "Invalid image data" });

      const [, mimeType, b64] = match;
      const buffer = Buffer.from(b64, "base64");
      res.set("Content-Type", mimeType);
      res.set("Cache-Control", "public, max-age=86400");
      res.send(buffer);
    } catch (err) {
      console.error("Original image serve error:", err);
      res.status(500).json({ message: "Failed to serve original image" });
    }
  });

  // =========== POST /api/designs/:id/share ===========
  app.post("/api/designs/:id/share", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid design ID" });

      const parseResult = shareDesignSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ message: parseResult.error.errors[0]?.message || "Invalid request" });
      }

      const { deliveryMethod, customerEmail, customerPhone } = parseResult.data;

      const design = await storage.getGeneratedImageById(id);
      if (!design) return res.status(404).json({ message: "Design not found" });

      let result: { success: boolean; error?: string };

      // Get subscriber (sender) info if logged in
      const senderUser = (req as any).user;
      const senderName = senderUser ? [senderUser.firstName, senderUser.lastName].filter(Boolean).join(" ") : undefined;
      const senderEmail = senderUser?.email || undefined;

      if (deliveryMethod === "email" && customerEmail) {
        result = await sendDesignByEmail({
          to: customerEmail,
          imageData: design.imageData,
          colorName: design.colorName || undefined,
          designId: id,
          senderName,
          senderEmail,
        });
      } else if (deliveryMethod === "sms" && customerPhone) {
        result = await sendDesignBySMS({
          to: customerPhone,
          designId: id,
          colorName: design.colorName || undefined,
        });
      } else {
        return res.status(400).json({ message: "Missing contact info for the selected delivery method" });
      }

      if (!result.success) {
        return res.status(422).json({ message: result.error || "Failed to send" });
      }

      // Record the share (including sender info for admin tracking)
      await storage.createDesignShare({
        generatedImageId: id,
        customerEmail: customerEmail || null,
        customerPhone: customerPhone || null,
        deliveryMethod,
        senderEmail: senderEmail || null,
        senderName: senderName || null,
      });

      res.json({ success: true, message: `Design sent successfully via ${deliveryMethod}` });
    } catch (err) {
      console.error("Share error:", err);
      res.status(500).json({ message: "Failed to share design" });
    }
  });

  // CORS middleware for /api/share-intent — widget surface calls this
  // cross-origin from partner domains. Mirrors the /api/widget/ pattern in
  // partnerRoutes.ts. No credentials flag (widget uses Bearer token in
  // Authorization header, not cookies).
  app.use('/api/share-intent', (req: Request, res: Response, next: any) => {
    const origin = req.headers['origin'] as string | undefined;
    if (origin) res.setHeader('Access-Control-Allow-Origin', origin);
    else res.setHeader('Access-Control-Allow-Origin', '*');
    if (req.method === 'OPTIONS') {
      res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      return res.sendStatus(204);
    }
    next();
  });

  // =========== POST /api/share-intent ===========
  // Tier 1 Growth Loops click-baseline tracking. Public, fire-and-forget from
  // the client. Best-effort widget-session parse for partnerId (never 401 —
  // analytics, not auth). Geo lookup wrapped so it can never slow the endpoint.
  app.post("/api/share-intent", async (req: Request, res: Response) => {
    try {
      const parsed = shareIntentRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message || "Invalid request" });
      }
      const { surface, designId } = parsed.data;

      let partnerId: number | null = null;
      if (surface === "widget") {
        const authHeader = req.headers["authorization"] as string | undefined;
        if (authHeader?.startsWith("Bearer ")) {
          try {
            const tokenStr = authHeader.slice(7);
            const parts = tokenStr.split(".");
            if (parts.length === 3 && parts[0] === "wup") {
              const payload = Buffer.from(parts[1], "base64url").toString("utf8");
              const secret = process.env.SESSION_SECRET;
              if (secret) {
                const expected = crypto.createHmac("sha256", secret).update(payload).digest("hex");
                if (parts[2] === expected) {
                  const session = JSON.parse(payload);
                  if (typeof session.partnerId === "number" && typeof session.exp === "number" && session.exp >= Date.now()) {
                    partnerId = session.partnerId;
                  }
                }
              }
            }
          } catch {
            // best-effort; ignore parse errors
          }
        }
      }

      let country: string | null = null;
      try {
        const geo = await lookupGeo(req.ip);
        country = geo.country;
      } catch {
        // silent
      }

      await storage.recordShareIntent({
        surface,
        partnerId,
        designId: designId ?? null,
        country,
      });

      res.status(200).json({ ok: true });
    } catch (err) {
      console.error("[share-intent] insert failed:", (err as Error)?.name);
      res.status(500).json({ message: "Internal error" });
    }
  });

  // CORS middleware for /api/tickets — widget surface calls this cross-origin
  // from partner domains. Sets Access-Control-Allow-Origin on POST responses
  // only. OPTIONS preflights are handled by the explicit app.options handler
  // below; this middleware no longer short-circuits OPTIONS (an earlier
  // res.sendStatus(204) here was preventing the app.options handler from
  // ever firing, which broke browser preflights from cross-origin contexts).
  // No credentials flag (widget uses Bearer; consumer is same-origin so the
  // CORS check does not apply on its requests).
  app.use('/api/tickets', (req: Request, res: Response, next: any) => {
    const origin = req.headers['origin'] as string | undefined;
    if (origin) res.setHeader('Access-Control-Allow-Origin', origin);
    else res.setHeader('Access-Control-Allow-Origin', '*');
    next();
  });

  // Explicit OPTIONS preflight handler. The app.use middleware above handles
  // CORS for POST responses, but Express's app.use(path, fn) does not always
  // route browser-issued OPTIONS preflights to the path-bound middleware
  // (cURL preflights pass through 204; Chrome cross-origin preflights from
  // 2wrap.com observed returning 405 in production). Explicit registration
  // guarantees the preflight responds 204 with full CORS headers and a 24h
  // Max-Age cache to suppress repeat preflights.
  app.options("/api/tickets", (req: Request, res: Response) => {
    const origin = req.headers["origin"] as string | undefined;
    if (origin) res.setHeader('Access-Control-Allow-Origin', origin);
    else res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Max-Age', '86400');
    res.sendStatus(204);
  });

  // =========== POST /api/tickets ===========
  // Public ticket submission shared by consumer (same-origin) and widget
  // (cross-origin) surfaces. User-facing label is "Ticket"; backend stays
  // bug_reports. Anonymous allowed; logged-in consumer auto-fills user_id;
  // widget Bearer best-effort fills partner_id (mirrors share-intent HMAC
  // parse at server/routes.ts:1746-1777). category hardcoded 'other' for v1.
  app.post(
    "/api/tickets",
    ticketHourlyLimiter,
    ticketDailyLimiter,
    async (req: Request, res: Response) => {
      try {
        const parsed = insertTicketSchema.safeParse(req.body);
        if (!parsed.success) {
          return res.status(400).json({
            message: parsed.error.errors[0]?.message || "Invalid request",
          });
        }
        const { description, email, surface } = parsed.data;

        // Server-side capture — never trusted from body. Referer first;
        // body.url is a fallback for widget cross-origin clients where the
        // browser may strip Referer under a strict policy.
        const refererRaw = req.headers["referer"] as string | undefined;
        const bodyUrl = typeof req.body?.url === "string" ? req.body.url : "";
        const urlRaw = refererRaw || bodyUrl || "";
        const url = urlRaw ? urlRaw.slice(0, 2000) : null;

        const uaRaw = req.headers["user-agent"] as string | undefined;
        const userAgent = uaRaw ? uaRaw.slice(0, 500) : null;

        const viewportRaw = typeof req.body?.viewport === "string" ? req.body.viewport : "";
        const viewport = /^\d{1,5}x\d{1,5}$/.test(viewportRaw) ? viewportRaw : null;

        // user_id: consumer surface only, from Passport session. Widget is
        // cross-origin so the consumer cookie is not present anyway.
        const passportUser = (req as any).user as { id?: string } | undefined;
        const userId = passportUser?.id ?? null;

        // partner_id: widget surface only, best-effort HMAC parse. Mirrors
        // /api/share-intent at server/routes.ts:1746-1777. Never a gate —
        // widget tickets without a valid Bearer still record (partner_id null).
        let partnerId: number | null = null;
        if (surface === "widget") {
          const authHeader = req.headers["authorization"] as string | undefined;
          if (authHeader?.startsWith("Bearer ")) {
            try {
              const tokenStr = authHeader.slice(7);
              const parts = tokenStr.split(".");
              if (parts.length === 3 && parts[0] === "wup") {
                const payload = Buffer.from(parts[1], "base64url").toString("utf8");
                const secret = process.env.SESSION_SECRET;
                if (secret) {
                  const expected = crypto.createHmac("sha256", secret).update(payload).digest("hex");
                  if (parts[2] === expected) {
                    const session = JSON.parse(payload);
                    if (typeof session.partnerId === "number" && typeof session.exp === "number" && session.exp >= Date.now()) {
                      partnerId = session.partnerId;
                    }
                  }
                }
              }
            } catch {
              // best-effort; ignore parse errors
            }
          }
        }

        const created = await storage.createBugReport({
          description,
          reporterEmail: email ?? null,
          surface,
          userId,
          partnerId,
          url,
          userAgent,
          viewport,
        });

        // Audit log: NEVER include reporter_email value, full description, or
        // full url. url_truncated capped at 200 chars for path context only.
        await auditLog(
          req,
          "bug_report.created",
          { type: "bug_reports", id: created.id },
          {
            payload: {
              surface,
              partner_id: partnerId,
              has_email: Boolean(email),
              has_user: Boolean(userId),
              viewport,
              url_truncated: url ? url.slice(0, 200) : null,
            },
          },
        );

        return res.status(201).json({ id: created.id });
      } catch (err) {
        console.error("[POST /api/tickets] insert failed:", (err as Error)?.name);
        return res.status(500).json({ message: "Internal error" });
      }
    },
  );

  // =========== GET /api/designs ===========
  app.get("/api/designs", async (req: Request, res: Response) => {
    const user = (req as any).user;
    if (!user?.id) return res.status(401).json({ message: "Please log in to view your designs" });

    const designs = await storage.getDesignsByUserId(user.id);
    // Return without raw image data to keep response small
    const stripped = designs.map(({ imageData, originalImageData, ...rest }) => rest);
    res.json(stripped);
  });

    // Unlock high-res version of a generated image (requires login + credits)
  app.post("/api/unlock/:imageId", async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      if (!user?.id) {
        return res.status(401).json({ message: "Please log in to unlock high-res images" });
      }

      const imageId = parseInt(req.params.imageId, 10);
      if (isNaN(imageId)) {
        return res.status(400).json({ message: "Invalid image ID" });
      }

      // Check user has credits
      const credits = await storage.getUserCredits(user.id);
      if (credits <= 0) {
        return res.status(402).json({ 
          message: "No credits remaining",
          requiresPayment: true,
        });
      }

      // Get the stored high-res image
      const images = await storage.getGeneratedImagesByEmail(imageId);
      if (images.length === 0) {
        return res.status(404).json({ message: "Image not found" });
      }

      // Deduct credit
      await storage.deductCredit(user.id);

      res.json({
        imageUrl: images[0].imageData,
        creditsRemaining: credits - 1,
      });
    } catch (error) {
      console.error("Unlock error:", error);
      res.status(500).json({ message: "Failed to unlock image" });
    }
  });

  // ============ CONSUMER EMAIL VERIFICATION (Item 0c, v29) ============
  // Anonymous-render gate. Reuses the widget verification UX (6-digit code,
  // 10-min expiry) but is partner-agnostic. Turnstile is fail-closed here:
  // an unconfigured production deploy refuses verify-email rather than
  // silently bypassing CAPTCHA on a high-abuse target.

  // POST /api/verify-email — send a 6-digit code to the supplied email.
  app.post("/api/verify-email", rejectDisposableEmail(), verifyEmailVelocityLimiter, async (req: Request, res: Response) => {
    const rawEmail = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const turnstileToken = typeof req.body?.turnstileToken === "string" ? req.body.turnstileToken : undefined;

    if (!rawEmail || !/\S+@\S+\.\S+/.test(rawEmail)) {
      return res.status(400).json({ message: "Please enter a valid email address" });
    }

    const ts = await verifyTurnstileToken(turnstileToken, { failClosed: true });
    if (!ts.ok) {
      return res.status(ts.status).json({ message: ts.message });
    }

    try {
      const [existing] = await db
        .select()
        .from(consumerVerifiedEmails)
        .where(eq(consumerVerifiedEmails.email, rawEmail))
        .limit(1);

      // 60-second cooldown — protects SendGrid quota and prevents code spam.
      if (existing?.lastCodeSentAt) {
        const elapsedMs = Date.now() - new Date(existing.lastCodeSentAt).getTime();
        if (elapsedMs < 60_000) {
          return res.status(429).json({ message: "Please wait before requesting another code" });
        }
      }

      const code = String(Math.floor(100000 + Math.random() * 900000));
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
      const sentAt = new Date();

      // UPSERT: new row gets a fresh customer_token UUID; existing row keeps
      // its token (cookie binding) and verified_at (per-email-forever model)
      // — only the transient code/expiry/cooldown fields are updated.
      await db
        .insert(consumerVerifiedEmails)
        .values({
          email: rawEmail,
          customerToken: crypto.randomUUID(),
          verificationCode: code,
          codeExpiresAt: expiresAt,
          lastCodeSentAt: sentAt,
        })
        .onConflictDoUpdate({
          target: consumerVerifiedEmails.email,
          set: {
            verificationCode: code,
            codeExpiresAt: expiresAt,
            lastCodeSentAt: sentAt,
          },
        });

      const sendResult = await sendVerificationCodeEmail({ to: rawEmail, code });
      if (!sendResult.success) {
        console.error(`[verify-email] error to=${maskEmail(rawEmail)} error=${sendResult.error || "send failed"}`);
        return res.status(500).json({ message: "Failed to send verification code. Please try again." });
      }

      console.log(`[verify-email] code sent to=${maskEmail(rawEmail)}`);
      res.json({ success: true, cooldownSeconds: 60 });
    } catch (err: any) {
      console.error(`[verify-email] error to=${maskEmail(rawEmail)} error=${err?.message || String(err)}`);
      res.status(500).json({ message: "Failed to send verification code. Please try again." });
    }
  });

  // POST /api/confirm-email — match the user-entered code against the row,
  // mark verified, and bind the browser to the row via an HttpOnly cookie.
  // No Turnstile here: possession of the code (delivered out-of-band to a
  // mailbox the user controls) is itself proof of humanity, and the user
  // already passed Turnstile on /api/verify-email to receive it.
  app.post("/api/confirm-email", async (req: Request, res: Response) => {
    const rawEmail = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const code = typeof req.body?.code === "string" ? req.body.code.trim() : "";

    if (!rawEmail || !/\S+@\S+\.\S+/.test(rawEmail)) {
      return res.status(400).json({ message: "Please enter a valid email address" });
    }
    if (!/^\d{6}$/.test(code)) {
      return res.status(400).json({ message: "Code must be 6 digits" });
    }

    try {
      const [row] = await db
        .select()
        .from(consumerVerifiedEmails)
        .where(eq(consumerVerifiedEmails.email, rawEmail))
        .limit(1);

      if (!row) {
        console.log(`[confirm-email] invalid code to=${maskEmail(rawEmail)} reason=no_row`);
        return res.status(400).json({ message: "Verification not started" });
      }
      if (row.verificationCode !== code) {
        console.log(`[confirm-email] invalid code to=${maskEmail(rawEmail)} reason=code_mismatch`);
        return res.status(400).json({ message: "Invalid code" });
      }
      if (!row.codeExpiresAt || new Date(row.codeExpiresAt) < new Date()) {
        console.log(`[confirm-email] invalid code to=${maskEmail(rawEmail)} reason=code_expired`);
        return res.status(400).json({ message: "Code expired" });
      }

      // Clear the transient code/expiry and stamp verifiedAt. customerToken
      // and renderCount are preserved (renderCount is per-email-forever).
      await db
        .update(consumerVerifiedEmails)
        .set({
          verifiedAt: new Date(),
          verificationCode: null,
          codeExpiresAt: null,
        })
        .where(eq(consumerVerifiedEmails.email, rawEmail));

      // HttpOnly cookie bound to row.customerToken. maxAge is in
      // milliseconds in Express; the resulting Set-Cookie carries
      // Max-Age=63072000 (2 years) per the locked architecture.
      res.cookie("wup_consumer_token", row.customerToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 63072000 * 1000,
      });

      console.log(`[confirm-email] verified to=${maskEmail(rawEmail)}`);
      res.json({
        success: true,
        rendersUsed: row.renderCount,
        freeRenderLimit: FREE_TIER_LIMIT,
      });
    } catch (err: any) {
      console.error(`[confirm-email] error to=${maskEmail(rawEmail)} error=${err?.message || String(err)}`);
      res.status(500).json({ message: "Failed to confirm verification code. Please try again." });
    }
  });

  // GET /api/consumer/customer-state — returning-visitor rehydration.
  // Reads the wup_consumer_token cookie and resolves it to an email +
  // render count so the consumer frontend (Session 2) knows whether to
  // show the verification UI on page load. Called on every page load —
  // logging is deliberately quiet on the high-volume happy paths so a
  // genuine signal (orphaned/forged token) actually shows up in logs.
  app.get("/api/consumer/customer-state", async (req: Request, res: Response) => {
    const token = req.cookies?.wup_consumer_token;
    if (!token || typeof token !== "string") {
      return res.json({ verified: false });
    }

    try {
      const row = await storage.getConsumerStateByToken(token);

      if (!row) {
        // Token does not match any row — either fabricated, leaked from
        // a deleted row, or stale across a DB reset. Clear it so the
        // browser stops presenting it on every request.
        console.warn(`[customer-state] orphaned cookie cleared token=${token.slice(0, 8)}...`);
        res.clearCookie("wup_consumer_token", { path: "/" });
        return res.json({ verified: false });
      }
      if (!row.verifiedAt) {
        // Row exists (verify-email was called) but confirm-email never
        // succeeded. Treat as unverified and force the user back through
        // the gate.
        console.warn(`[customer-state] unverified row, cookie cleared token=${token.slice(0, 8)}...`);
        res.clearCookie("wup_consumer_token", { path: "/" });
        return res.json({ verified: false });
      }

      res.json({
        verified: true,
        email: row.email,
        rendersUsed: row.renderCount,
        freeRenderLimit: FREE_TIER_LIMIT,
      });
    } catch (err: any) {
      console.error(`[customer-state] lookup error token=${token.slice(0, 8)}... error=${err?.message || String(err)}`);
      // Fail open: treat as unverified so the gate UI shows, rather than
      // 500ing on every page load if the DB is briefly unreachable.
      res.json({ verified: false });
    }
  });

  // ============ ADMIN AUTH ============

  // Check admin auth status
  app.get("/api/admin/auth/status", (req: Request, res: Response) => {
    res.json({
      authenticated: !!req.session.isAdminAuthenticated,
      userId: req.session.adminUserId,
      role: req.session.adminRole,
    });
  });

  // Admin login with email + password
  app.post("/api/admin/auth/login", async (req: Request, res: Response) => {
    const { email, password, turnstileToken } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    // Verify Cloudflare Turnstile CAPTCHA. failClosed defaults to false here
    // so a missing TURNSTILE_SECRET_KEY in non-production environments lets
    // login proceed (preserves prior behavior).
    const ts = await verifyTurnstileToken(turnstileToken);
    if (!ts.ok) {
      return res.status(ts.status).json({ message: ts.message });
    }

    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, email.toLowerCase()))
        .limit(1);

      if (!user || !user.passwordHash) {
        return res.status(401).json({ message: "Invalid email or password" });
      }
      if (!verifyPassword(password, user.passwordHash)) {
        return res.status(401).json({ message: "Invalid email or password" });
      }
      if (user.role !== "admin" && user.role !== "superadmin") {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      req.session.regenerate((err) => {
        if (err) {
          return res.status(500).json({ message: "Session error" });
        }
        req.session.isAdminAuthenticated = true;
        req.session.adminUserId = user.id;
        req.session.adminRole = user.role;
        req.session.adminEmail = user.email ?? undefined;
        res.json({ success: true });
      });
    } catch (err: any) {
      console.error("[admin-login] Error:", err);
      return res.status(500).json({ message: "Login error" });
    }
  });

  // Admin logout
  app.post("/api/admin/auth/logout", (req: Request, res: Response) => {
    // Only clear admin session properties (preserves user auth session)
    delete req.session.isAdminAuthenticated;
    delete req.session.adminUserId;
    delete req.session.adminRole;
    delete req.session.adminEmail;
    req.session.save((err) => {
      if (err) console.error("Session save error on admin logout:", err);
    });
    res.json({ success: true });
  });


  // Forgot password - request a reset link
  app.post("/api/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      // Check if user exists
      const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase()));
      
      // Always return success to prevent email enumeration
      if (!user) {
        return res.json({ message: "If an account exists with that email, a reset link has been sent." });
      }

      // Generate reset token
      const token = crypto.randomBytes(32).toString("hex");
      const expires = Date.now() + 60 * 60 * 1000; // 1 hour
      resetTokens.set(token, { email: user.email, expires });

      // Build reset URL using BASE_URL for correct https behind proxy
      const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get("host")}`;
      const resetUrl = `${baseUrl}/reset-password?token=${token}`;
      const emailResult = await sendPasswordResetEmail({ to: user.email, resetUrl });
      if (!emailResult.success) {
        console.error("[forgot-password] Email send failed:", emailResult.error);
      };

      res.json({ message: "If an account exists with that email, a reset link has been sent." });
    } catch (error) {
      console.error("Forgot password error:", error);
      res.status(500).json({ message: "Failed to process request" });
    }
  });

  // Reset password with token
  app.post("/api/reset-password", async (req, res) => {
    try {
      const { token, password } = req.body;
      if (!token || !password) {
        return res.status(400).json({ message: "Token and password are required" });
      }

      if (password.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters" });
      }

      // Validate token
      const tokenData = resetTokens.get(token);
      if (!tokenData || tokenData.expires < Date.now()) {
        resetTokens.delete(token);
        return res.status(400).json({ message: "Invalid or expired reset link. Please request a new one." });
      }

      // Find user and update password
      const [user] = await db.select().from(users).where(eq(users.email, tokenData.email));
      if (!user) {
        return res.status(400).json({ message: "User not found" });
      }

      const hashedPassword = await hashPassword(password);
      await db.update(users).set({ passwordHash: hashedPassword }).where(eq(users.id, user.id));

      // Remove used token
      resetTokens.delete(token);

      res.json({ message: "Password has been reset successfully" });
    } catch (error) {
      console.error("Reset password error:", error);
      res.status(500).json({ message: "Failed to reset password" });
    }
  });
  // Admin change own password
  app.post("/api/admin/auth/change-password", async (req: Request, res: Response) => {
    if (!req.session.isAdminAuthenticated) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Current and new password are required" });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ message: "New password must be at least 8 characters" });
    }
    try {
      const [user] = await db.select().from(users).where(eq(users.id, req.session.adminUserId!)).limit(1);
      if (!user || !user.passwordHash) {
        return res.status(404).json({ message: "User not found" });
      }
      if (!verifyPassword(currentPassword, user.passwordHash)) {
        return res.status(401).json({ message: "Current password is incorrect" });
      }
      const newHash = hashPassword(newPassword);
      await db.update(users).set({ passwordHash: newHash }).where(eq(users.id, user.id));
      await auditLog(req, "user.password_change_self",
        { type: "users", id: user.id },
        { payload: { changed: true } });
      res.json({ message: "Password changed successfully" });
    } catch (error) {
      console.error("Admin change password error:", error);
      res.status(500).json({ message: "Failed to change password" });
    }
  });

  // Reset password for a user (superadmin only, or admin for non-admin users)
  app.post("/api/admin/users/:userId/reset-password", async (req: Request, res: Response) => {
    if (!req.session.isAdminAuthenticated || !req.session.adminRole) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { userId } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    try {
      const [targetUser] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!targetUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Superadmin can reset anyone, admin can only reset non-admin users
      if (req.session.adminRole === "admin") {
        if (targetUser.role === "admin" || targetUser.role === "superadmin") {
          return res.status(403).json({ message: "Insufficient permissions to reset this user's password" });
        }
      }

      const passwordHash = hashPassword(newPassword);
      await db
        .update(users)
        .set({ passwordHash, updatedAt: new Date() })
        .where(eq(users.id, userId));

      await auditLog(req, "user.password_reset",
        { type: "users", id: userId },
        { payload: { reset: true, targetRole: targetUser.role } });

      res.json({ success: true, message: "Password reset successfully" });
    } catch (error) {
      console.error("Password reset error:", error);
      res.status(500).json({ message: "Failed to reset password" });
    }
  });

  // ============ ADMIN API ============

  // Get all emails
  app.get("/api/admin/emails", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const emails = await storage.getEmails();
      res.json(emails);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch emails" });
    }
  });

  // Get all emails with their generated images
  app.get("/api/admin/emails-with-images", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const emailsWithImages = await storage.getEmailsWithImages();
      res.json(emailsWithImages);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch emails with images" });
    }
  });

  // Update user (admin)
  app.put("/api/admin/users/:userId", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const { firstName, lastName, email, credits } = req.body;
      const [before] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      if (!before) return res.status(404).json({ message: "User not found" });
      await storage.updateUser(userId, { firstName, lastName, email, credits });
      await auditLog(req, "user.update",
        { type: "users", id: userId },
        { before: { firstName: before.firstName, lastName: before.lastName, email: before.email, credits: before.credits },
          after:  { firstName, lastName, email, credits } });
      res.json({ success: true, message: "User updated successfully" });
    } catch (error) {
      console.error("Failed to update user:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });


  // Delete a user (hard delete)
  app.delete("/api/admin/users/:userId", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const [before] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      if (!before) return res.status(404).json({ message: "User not found" });
      await storage.deleteUser(userId);
      await auditLog(req, "user.delete",
        { type: "users", id: userId },
        { before: { email: before.email, firstName: before.firstName, lastName: before.lastName, role: before.role, credits: before.credits, createdAt: before.createdAt } });
      res.json({ success: true, message: "User deleted successfully" });
    } catch (error) {
      console.error("Failed to delete user:", error);
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  // Get all renders — merges main-app renders (generated_images) and partner widget renders (partner_renders)
  app.get("/api/admin/renders", requireAdminAuth, async (_req: Request, res: Response) => {
    try {
      const limit = parseInt(_req.query.limit as string) || 100;
      const appRows = await storage.getAllRenders(limit);
      const appRenders = appRows.map((r) => ({
        id: r.id,
        source: "app" as const,
        partnerName: null as string | null,
        emailSubmissionId: r.emailSubmissionId,
        colorId: r.colorId,
        colorName: r.colorName,
        createdAt: r.createdAt,
        email: r.email,
        options: r.options,
        city: r.city,
        country: r.country,
        imageUrl: `/api/admin/renders/${r.id}/image`,
      }));

      const partnerResult = await db.execute(
        sql`SELECT pr.id, pr.customer_email, pr.color_id, pr.color_name, pr.created_at,
                   pr.city, pr.country,
                   p.business_name
            FROM partner_renders pr
            LEFT JOIN partners p ON p.id = pr.partner_id
            ORDER BY pr.created_at DESC
            LIMIT ${limit}`
      );
      const partnerRenders = (partnerResult.rows as any[]).map((r) => ({
        id: Number(r.id),
        source: "partner" as const,
        partnerName: (r.business_name as string | null) ?? null,
        emailSubmissionId: null as number | null,
        colorId: (r.color_id as number | null) ?? null,
        colorName: (r.color_name as string | null) ?? null,
        createdAt: r.created_at as string | null,
        email: (r.customer_email as string | null) ?? null,
        options: null,
        city: (r.city as string | null) ?? null,
        country: (r.country as string | null) ?? null,
        imageUrl: `/api/widget/renders/${r.id}/image`,
      }));

      const merged = [...appRenders, ...partnerRenders].sort((a, b) => {
        const at = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bt = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bt - at;
      }).slice(0, limit);

      res.json(merged);
    } catch (error) {
      console.error("Failed to fetch renders:", error);
      res.status(500).json({ message: "Failed to fetch renders" });
    }
  });

  // Get a single render image by ID
  app.get("/api/admin/renders/:id/image", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const imageId = parseInt(req.params.id);
      const imageData = await storage.getRenderedImage(imageId);
      if (!imageData) {
        return res.status(404).json({ message: "Image not found" });
      }
      // imageData is a base64 data URL like "data:image/jpeg;base64,..."
      const matches = imageData.match(/^data:([^;]+);base64,(.+)$/);
      if (matches) {
        const mimeType = matches[1];
        const base64Data = matches[2];
        const buffer = Buffer.from(base64Data, "base64");
        res.set("Content-Type", mimeType);
        res.set("Cache-Control", "public, max-age=3600");
        res.send(buffer);
      } else {
        res.status(500).json({ message: "Invalid image data format" });
      }
    } catch (error) {
      console.error("Failed to fetch render image:", error);
      res.status(500).json({ message: "Failed to fetch render image" });
    }
  });

  // Get render stats — sums main-app renders and partner widget renders
  app.get("/api/admin/renders/stats", requireAdminAuth, async (_req: Request, res: Response) => {
    try {
      const appStats = await storage.getRenderStats();
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const partnerTotalResult = await db.execute(sql`SELECT COUNT(*)::int AS c FROM partner_renders`);
      const partnerTodayResult = await db.execute(
        sql`SELECT COUNT(*)::int AS c FROM partner_renders WHERE created_at >= ${today.toISOString()}`
      );
      const partnerTotal = Number((partnerTotalResult.rows?.[0] as any)?.c ?? 0);
      const partnerToday = Number((partnerTodayResult.rows?.[0] as any)?.c ?? 0);
      res.json({
        total: (appStats.total ?? 0) + partnerTotal,
        today: (appStats.today ?? 0) + partnerToday,
      });
    } catch (error) {
      console.error("Failed to fetch render stats:", error);
      res.status(500).json({ message: "Failed to fetch render stats" });
    }
  });

    // Get usage stats
  app.get("/api/admin/usage", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const timeRange = (req.query.timeRange as string) || "week";
      const stats = await storage.getUsageStats(timeRange);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch usage stats" });
    }
  });

  // Get all users
  app.get("/api/admin/users", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Update user role (superadmin only)
  app.patch("/api/admin/users/:userId/role", requireAdminAuth, async (req: Request, res: Response) => {
    if (req.session.adminRole !== "superadmin") {
      return res.status(403).json({ message: "Only superadmin can change user roles" });
    }
    const { userId } = req.params;
    const { role } = req.body;
    const validRoles = ["user", "admin", "superadmin"];
    if (!role || !validRoles.includes(role)) {
      return res.status(400).json({ message: "Invalid role. Must be: user, admin, or superadmin" });
    }
    // Prevent changing own role
    if (userId === req.session.adminUserId) {
      return res.status(400).json({ message: "Cannot change your own role" });
    }
    try {
      const [before] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      if (!before) return res.status(404).json({ message: "User not found" });
      const [updatedUser] = await db
        .update(users)
        .set({ role })
        .where(eq(users.id, userId))
        .returning();
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      await auditLog(req, "user.role_change",
        { type: "users", id: userId },
        { before: { role: before.role }, after: { role } });
      res.json({ message: "Role updated", user: { id: updatedUser.id, email: updatedUser.email, role: updatedUser.role } });
    } catch (error) {
      console.error("Update role error:", error);
      res.status(500).json({ message: "Failed to update role" });
    }
  });

  // Get user stats
  app.get("/api/admin/users/stats", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const stats = await storage.getUserStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user stats" });
    }
  });

  // Admin: Add credits to a user account

  // Admin create user
  app.post("/api/admin/users", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const { email, password, firstName, lastName } = req.body;
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }
      const existingUsers = await db.select().from(users).where(eq(users.email, email)).limit(1);
      if (existingUsers.length > 0) {
        return res.status(409).json({ message: "A user with this email already exists" });
      }
      const passwordHash = hashPassword(password);
      const [newUser] = await db.insert(users).values({
        email,
        passwordHash,
        firstName: firstName || null,
        lastName: lastName || null,
      }).returning();
      await auditLog(req, "user.create",
        { type: "users", id: newUser.id },
        { payload: { email: newUser.email, firstName: newUser.firstName, lastName: newUser.lastName } });
      res.status(201).json({ user: { id: newUser.id, email: newUser.email, firstName: newUser.firstName, lastName: newUser.lastName } });
    } catch (error) {
      console.error("Admin create user error:", error);
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  app.post("/api/admin/users/:userId/add-credits", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      
      const parseResult = addCreditsSchema.safeParse(req.body);
      if (!parseResult.success) {
        const errorMessage = parseResult.error.errors[0]?.message || "Invalid request";
        return res.status(400).json({ message: errorMessage });
      }

      const { credits } = parseResult.data;

              const result = await pool.query(
                          'UPDATE users SET credits = credits + $1 WHERE id = $2 RETURNING credits',
                          [credits, userId]
                        );
    
            if (result.rowCount === 0) {
                        return res.status(404).json({ message: "User not found" });
            }

              await auditLog(req, "user.add_credits",
                { type: "users", id: userId },
                { payload: { added: credits, newBalance: result.rows[0]?.credits ?? null } });

              res.json({
                          success: true,
                          message: `Added ${credits} credits to user account`,
                          newBalance: result.rows[0]?.credits || 0
                
            });
    } catch (error) {
      console.error("Failed to add credits:", error);
      res.status(500).json({ message: "Failed to add credits" });
    }
  });

  // ============ ADMIN AMBIENT EVENT POLL ============
  // Lightweight counter of new payments + new renders since a supplied
  // timestamp. Backs the layout-level audio-notification hook so the admin
  // panel can play a sound when a payment lands or a render completes —
  // designed to stay cheap enough to poll every 30 seconds in lockstep
  // with the existing admin-renders refetch.
  //
  // Query: ?since=<ISO timestamp>. Missing or invalid values fall back to
  // "1 hour ago" to keep the response shape stable even on bad client
  // input. The hook always echoes the latest timestamp it received so the
  // fallback should not normally fire after the first poll.
  app.get("/api/admin/events/recent", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const sinceParam = typeof req.query.since === "string" ? req.query.since : "";
      const parsed = sinceParam ? new Date(sinceParam) : null;
      const since =
        parsed && !isNaN(parsed.getTime())
          ? parsed
          : new Date(Date.now() - 60 * 60 * 1000);

      // One round-trip, three tables. GREATEST ignores NULL in Postgres so
      // when one render table is empty since `since` the response still
      // returns the other table's MAX (or null when both are empty).
      const result = await db.execute(sql`
        SELECT
          (SELECT COUNT(*)::int FROM credit_purchases WHERE created_at > ${since.toISOString()}) AS new_payments,
          (SELECT COUNT(*)::int FROM generated_images WHERE created_at > ${since.toISOString()})
            + (SELECT COUNT(*)::int FROM partner_renders WHERE created_at > ${since.toISOString()}) AS new_renders,
          (SELECT MAX(created_at) FROM credit_purchases WHERE created_at > ${since.toISOString()}) AS latest_payment_at,
          GREATEST(
            (SELECT MAX(created_at) FROM generated_images WHERE created_at > ${since.toISOString()}),
            (SELECT MAX(created_at) FROM partner_renders WHERE created_at > ${since.toISOString()})
          ) AS latest_render_at
      `);

      const row = (result.rows?.[0] ?? {}) as {
        new_payments: number | string | null;
        new_renders: number | string | null;
        latest_payment_at: Date | string | null;
        latest_render_at: Date | string | null;
      };

      const toIso = (v: Date | string | null) => {
        if (!v) return null;
        const d = v instanceof Date ? v : new Date(v);
        return isNaN(d.getTime()) ? null : d.toISOString();
      };

      res.json({
        newPayments: Number(row.new_payments) || 0,
        newRenders: Number(row.new_renders) || 0,
        latestPaymentAt: toIso(row.latest_payment_at),
        latestRenderAt: toIso(row.latest_render_at),
      });
    } catch (error) {
      console.error("[admin/events/recent]", error);
      res.status(500).json({ message: "Failed to fetch recent events" });
    }
  });

  // Get all credit purchases
  app.get("/api/admin/payments", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const payments = await storage.getAllCreditPurchases();
      res.json(payments);
    } catch (error) {
      console.error("[GET /api/admin/payments]", error);
      res.status(500).json({ message: "Failed to fetch payments" });
    }
  });

  // Get payment stats
  app.get("/api/admin/payments/stats", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const stats = await storage.getPaymentStats();
      res.json(stats);
    } catch (error) {
      console.error("[GET /api/admin/payments/stats]", error);
      res.status(500).json({ message: "Failed to fetch payment stats" });
    }
  });

  // Get rate limits
  app.get("/api/admin/rate-limits", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const limits = await storage.getRateLimitSettings();
      res.json(limits);
    } catch (error) {
      console.error("[GET /api/admin/rate-limits]", error);
      res.status(500).json({ message: "Failed to fetch rate limits" });
    }
  });

  // Update rate limits
  app.put("/api/admin/rate-limits", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const validation = rateLimitSettingsSchema.safeParse(req.body);
      if (!validation.success) {
        return res
          .status(400)
          .json({ message: validation.error.errors[0].message });
      }
      const before = await storage.getRateLimitSettings();
      await storage.updateRateLimitSettings(validation.data);
      invalidateRateLimitCache();
      await auditLog(req, "rate_limits.update",
        { type: "rate_limits", id: null },
        { before, after: validation.data });
      res.json(validation.data);
    } catch (error) {
      console.error("[PUT /api/admin/rate-limits]", error);
      res.status(500).json({ message: "Failed to update rate limits" });
    }
  });

  // =========== Influencer endpoints ===========

  // Get current user's influencer application status
  app.get("/api/influencer/status", async (req, res) => {
    try {
      if (!req.isAuthenticated || !req.isAuthenticated() || !req.user) {
        return res.json({ hasApplication: false, status: null });
      }
      const userId = (req.user as any).id;
      const result = await db.execute(
        sql`SELECT id, status, created_at, admin_notes FROM influencer_applications WHERE user_id = ${userId} ORDER BY created_at DESC LIMIT 1`
      );
      if (result.rows.length === 0) {
        return res.json({ hasApplication: false, status: null });
      }
      const app = result.rows[0];
      res.json({
        hasApplication: true,
        status: app.status,
        createdAt: app.created_at,
        adminNotes: app.admin_notes,
      });
    } catch (error) {
      console.error("Error fetching influencer status:", error);
      res.status(500).json({ message: "Failed to fetch influencer status" });
    }
  });

  // Submit influencer application (authenticated users only)
  app.post("/api/influencer/apply", async (req, res) => {
    try {
      if (!req.isAuthenticated || !req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: "You must be signed in to apply" });
      }
      const userId = (req.user as any).id;

      // Check if user already has a pending or approved application
      const existing = await db.execute(
        sql`SELECT id, status FROM influencer_applications WHERE user_id = ${userId} AND status IN ('pending', 'approved') LIMIT 1`
      );
      if (existing.rows.length > 0) {
        const s = existing.rows[0].status;
        return res.status(400).json({
          message: s === "approved"
            ? "You are already an approved ambassador!"
            : "You already have a pending application. We'll get back to you soon!",
        });
      }

      const parsed = influencerApplicationFormSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message || "Invalid form data" });
      }

      const { instagramUrl, tiktokUrl, youtubeUrl, otherSocialUrl, motivation } = parsed.data;

      await db.execute(sql`
        INSERT INTO influencer_applications (user_id, instagram_url, tiktok_url, youtube_url, other_social_url, motivation)
        VALUES (${userId}, ${instagramUrl}, ${tiktokUrl || null}, ${youtubeUrl || null}, ${otherSocialUrl || null}, ${motivation})
      `);

      
      // Send email notification to admin
      const userResult = await db.execute(sql`SELECT email, first_name, last_name FROM users WHERE id = ${userId} LIMIT 1`);
      const applicant = userResult.rows[0] as any;
      const applicantName = [applicant?.first_name, applicant?.last_name].filter(Boolean).join(" ") || "Unknown";
      const applicantEmail = applicant?.email || "unknown";

      // Fire-and-forget: don't block the response
      sendAmbassadorApplicationEmail({
        applicantName,
        applicantEmail,
        instagramUrl,
        tiktokUrl: tiktokUrl || null,
        youtubeUrl: youtubeUrl || null,
        otherSocialUrl: otherSocialUrl || null,
        motivation,
      }).catch(err => console.error("[Ambassador] Email notification failed:", err));

      res.json({ message: "Application submitted successfully! We will review it and contact you." });
    } catch (error) {
      console.error("Error submitting influencer application:", error);
      res.status(500).json({ message: "Failed to submit application" });
    }
  });

  // Withdraw/reset ambassador application (authenticated users only)
  app.post("/api/influencer/withdraw", async (req, res) => {
    try {
      if (!req.isAuthenticated || !req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: "You must be signed in" });
      }
      const userId = (req.user as any).id;
      // Delete any pending application for this user
      const result = await db.execute(
        sql`DELETE FROM influencer_applications WHERE user_id = ${userId} AND status = 'pending' RETURNING id`
      );
      if (result.rows.length === 0) {
        return res.status(400).json({ message: "No pending application found to withdraw" });
      }
      res.json({ message: "Application withdrawn successfully. You can now submit a new application." });
    } catch (error) {
      console.error("Error withdrawing influencer application:", error);
      res.status(500).json({ message: "Failed to withdraw application" });
    }
  });

  // PR #74a — ambassador dashboard. Returns the current user's referral
  // handle, lifetime stats (total/pending/paid in cents), and the last
  // 10 commissions with the referred customer's first name. 401 if not
  // authenticated, 403 if the user is not currently an ambassador.
  // Snake_case response shape matches the existing admin endpoints.
  app.get("/api/ambassador/dashboard", async (req, res) => {
    try {
      if (!req.isAuthenticated || !req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const userId = (req.user as any).id as string;

      const userRowRes = await db.execute(sql`
        SELECT is_ambassador, referral_handle FROM users WHERE id = ${userId} LIMIT 1
      `);
      const userRow = userRowRes.rows[0] as any;
      if (!userRow || userRow.is_ambassador !== true) {
        return res.status(403).json({ message: "Not an ambassador" });
      }

      const statsRes = await db.execute(sql`
        SELECT
          COALESCE(SUM(amount_cents), 0)::int AS total_cents,
          COALESCE(SUM(amount_cents) FILTER (WHERE status = 'pending'), 0)::int AS pending_cents,
          COALESCE(SUM(amount_cents) FILTER (WHERE status = 'paid'), 0)::int AS paid_cents
        FROM commission_ledger
        WHERE referrer_user_id = ${userId}
      `);
      const stats = statsRes.rows[0] as any;

      const recentRes = await db.execute(sql`
        SELECT cl.id, cl.amount_cents, cl.status, cl.created_at, cl.paid_at,
               u.first_name AS referred_first_name
        FROM commission_ledger cl
        JOIN users u ON u.id = cl.referred_user_id
        WHERE cl.referrer_user_id = ${userId}
        ORDER BY cl.created_at DESC
        LIMIT 10
      `);

      res.json({
        referral_handle: userRow.referral_handle ?? null,
        stats: {
          total_cents: Number(stats?.total_cents ?? 0),
          pending_cents: Number(stats?.pending_cents ?? 0),
          paid_cents: Number(stats?.paid_cents ?? 0),
        },
        recent_commissions: recentRes.rows,
      });
    } catch (error) {
      console.error("[GET /api/ambassador/dashboard]", error);
      res.status(500).json({ message: "Failed to load ambassador dashboard" });
    }
  });

  // Admin: List all influencer applications
  app.get("/api/admin/influencer-applications", requireAdminAuth, async (req, res) => {
    try {
      const result = await db.execute(sql`
        SELECT ia.*, u.email, u.first_name, u.last_name, u.referral_handle, u.is_ambassador
        FROM influencer_applications ia
        LEFT JOIN users u ON u.id = ia.user_id
        ORDER BY ia.created_at DESC
      `);
      res.json(result.rows);
    } catch (error) {
      console.error("Error fetching influencer applications:", error);
      res.status(500).json({ message: "Failed to fetch applications" });
    }
  });

  // Admin: Update influencer application status
  app.patch("/api/admin/influencer-applications/:id", requireAdminAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { status, adminNotes, referralHandle } = req.body;
      if (!["pending", "approved", "rejected"].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }

      // PR #70 — handle is required when approving. Validate before any
      // DB write so a bad handle does not leave the application in a
      // half-updated state.
      let normalizedHandle: string | null = null;
      if (status === "approved") {
        try {
          normalizedHandle = validateAndNormalizeHandle(referralHandle);
        } catch (err: any) {
          return res.status(400).json({ message: err.message || "Invalid referral handle" });
        }
      }

      const beforeRes = await db.execute(sql`SELECT status, admin_notes, user_id FROM influencer_applications WHERE id = ${parseInt(id)}`);
      if (!beforeRes.rows.length) return res.status(404).json({ message: "Application not found" });
      const prev = beforeRes.rows[0] as any;
      const targetUserId = prev.user_id as string;

      // Read current is_ambassador and referral_handle for the audit-before snapshot.
      const userBeforeRes = await db.execute(sql`SELECT is_ambassador, referral_handle FROM users WHERE id = ${targetUserId}`);
      const userPrev = (userBeforeRes.rows?.[0] as any) ?? {};
      const userPrevIsAmbassador = userPrev.is_ambassador ?? false;
      const userPrevHandle = userPrev.referral_handle ?? null;

      await db.execute(sql`
        UPDATE influencer_applications
        SET status = ${status}, admin_notes = ${adminNotes || null}, updated_at = NOW()
        WHERE id = ${parseInt(id)}
      `);

      // Side effect: keep users.is_ambassador in sync with the application
      // status. Approved sets true; rejected resets false (covers re-rejection
      // after a prior approval). Pending leaves the flag untouched.
      // On approve, also write the validated referral_handle.
      let userNextIsAmbassador = userPrevIsAmbassador;
      let userNextHandle = userPrevHandle;
      if (status === "approved") {
        try {
          await db.execute(sql`UPDATE users SET is_ambassador = true, referral_handle = ${normalizedHandle} WHERE id = ${targetUserId}`);
        } catch (err: any) {
          if (err?.code === "23505") {
            return res.status(409).json({ message: "Handle already taken. Pick a different one." });
          }
          throw err;
        }
        userNextIsAmbassador = true;
        userNextHandle = normalizedHandle;
      } else if (status === "rejected") {
        await db.execute(sql`UPDATE users SET is_ambassador = false WHERE id = ${targetUserId}`);
        userNextIsAmbassador = false;
      }

      await auditLog(req, "influencer_application.update",
        { type: "influencer_applications", id: parseInt(id) },
        { before: { status: prev.status, adminNotes: prev.admin_notes, is_ambassador: userPrevIsAmbassador, referral_handle: userPrevHandle },
          after:  { status, adminNotes: adminNotes || null, is_ambassador: userNextIsAmbassador, referral_handle: userNextHandle } });
      res.json({ message: "Application updated" });
    } catch (error) {
      console.error("Error updating influencer application:", error);
      res.status(500).json({ message: "Failed to update application" });
    }
  });

  // Admin: Set or clear a user's referral handle directly (backfill +
  // edit case). Separate from the application PATCH so audit semantics
  // stay clean — the application endpoint logs an
  // influencer_application.update event; this one logs a
  // user.referral_handle.change event.
  app.patch("/api/admin/users/:userId/referral-handle", requireAdminAuth, async (req, res) => {
    try {
      const { userId } = req.params;
      const { referralHandle } = req.body;

      let normalizedHandle: string | null = null;
      if (referralHandle !== null && referralHandle !== undefined && referralHandle !== "") {
        try {
          normalizedHandle = validateAndNormalizeHandle(referralHandle);
        } catch (err: any) {
          return res.status(400).json({ message: err.message || "Invalid referral handle" });
        }
      }

      const beforeRes = await db.execute(sql`SELECT referral_handle FROM users WHERE id = ${userId}`);
      if (!beforeRes.rows.length) return res.status(404).json({ message: "User not found" });
      const prevHandle = (beforeRes.rows[0] as any)?.referral_handle ?? null;

      try {
        await db.execute(sql`UPDATE users SET referral_handle = ${normalizedHandle} WHERE id = ${userId}`);
      } catch (err: any) {
        if (err?.code === "23505") {
          return res.status(409).json({ message: "Handle already taken. Pick a different one." });
        }
        throw err;
      }

      await auditLog(req, "user.referral_handle.change",
        { type: "users", id: userId },
        { before: { referral_handle: prevHandle },
          after:  { referral_handle: normalizedHandle } });
      res.json({ message: "Handle updated", referralHandle: normalizedHandle });
    } catch (error) {
      console.error("[PATCH /api/admin/users/:userId/referral-handle]", error);
      res.status(500).json({ message: "Failed to update handle" });
    }
  });

  // PR #74b — admin payouts. Three endpoints over commission_ledger.
  // List (paginated + status filter), aggregate stats, and mark-paid
  // status transition with audit log + optional payment reference in
  // the audit payload only.

  // GET /api/admin/commission-ledger?status=pending|paid|all&page=N&pageSize=50
  app.get("/api/admin/commission-ledger", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const validStatuses = ["pending", "paid", "all"] as const;
      type LedgerStatus = typeof validStatuses[number];
      const rawStatus = req.query.status as string | undefined;
      const status: LedgerStatus = validStatuses.includes(rawStatus as LedgerStatus)
        ? (rawStatus as LedgerStatus)
        : "pending";
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize as string) || 50));
      const offset = (page - 1) * pageSize;

      const whereClause = status === "all" ? sql`` : sql`WHERE cl.status = ${status}`;

      const rowsRes = await db.execute(sql`
        SELECT cl.id, cl.amount_cents, cl.rate_percent, cl.status, cl.paid_at,
               cl.created_at, cl.referrer_user_id, cl.referred_user_id,
               cl.source_purchase_id,
               ref.email AS referred_email, ref.first_name AS referred_first_name,
               ref.last_name AS referred_last_name,
               amb.email AS ambassador_email, amb.first_name AS ambassador_first_name,
               amb.last_name AS ambassador_last_name, amb.referral_handle
        FROM commission_ledger cl
        LEFT JOIN users ref ON ref.id = cl.referred_user_id
        LEFT JOIN users amb ON amb.id = cl.referrer_user_id
        ${whereClause}
        ORDER BY cl.created_at DESC
        LIMIT ${pageSize} OFFSET ${offset}
      `);

      const countRes = await db.execute(sql`
        SELECT COUNT(*)::int AS total FROM commission_ledger cl ${whereClause}
      `);
      const total = Number((countRes.rows[0] as any)?.total ?? 0);

      res.json({ commissions: rowsRes.rows, total });
    } catch (err) {
      console.error("[GET /api/admin/commission-ledger]", err);
      res.status(500).json({ message: "Failed to fetch commission ledger" });
    }
  });

  // GET /api/admin/commission-ledger/stats
  app.get("/api/admin/commission-ledger/stats", requireAdminAuth, async (_req: Request, res: Response) => {
    try {
      const result = await db.execute(sql`
        SELECT
          COALESCE(SUM(amount_cents) FILTER (WHERE status = 'pending'), 0)::int AS total_pending_cents,
          COALESCE(SUM(amount_cents) FILTER (WHERE status = 'paid'), 0)::int AS total_paid_cents,
          COUNT(*) FILTER (WHERE status = 'pending')::int AS pending_count,
          COUNT(*) FILTER (WHERE status = 'paid')::int AS paid_count
        FROM commission_ledger
      `);
      const row = result.rows[0] as any;
      res.json({
        total_pending_cents: Number(row?.total_pending_cents ?? 0),
        total_paid_cents: Number(row?.total_paid_cents ?? 0),
        pending_count: Number(row?.pending_count ?? 0),
        paid_count: Number(row?.paid_count ?? 0),
      });
    } catch (err) {
      console.error("[GET /api/admin/commission-ledger/stats]", err);
      res.status(500).json({ message: "Failed to fetch commission stats" });
    }
  });

  // PATCH /api/admin/commission-ledger/:id/mark-paid
  app.patch("/api/admin/commission-ledger/:id/mark-paid", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ message: "Invalid id" });
      }

      // Validate optional payment_reference. Stored only in the audit log
      // payload; commission_ledger has no payment_reference column for v1.
      const rawRef = req.body?.paymentReference;
      let paymentReference: string | null = null;
      if (rawRef !== null && rawRef !== undefined && rawRef !== "") {
        if (typeof rawRef !== "string") {
          return res.status(400).json({ message: "paymentReference must be a string" });
        }
        const trimmed = rawRef.trim();
        if (trimmed.length > 200) {
          return res.status(400).json({ message: "paymentReference must be 200 characters or fewer" });
        }
        paymentReference = trimmed.length > 0 ? trimmed : null;
      }

      const beforeRes = await db.execute(sql`
        SELECT id, status, amount_cents, referrer_user_id, referred_user_id
        FROM commission_ledger WHERE id = ${id} LIMIT 1
      `);
      if (!beforeRes.rows.length) {
        return res.status(404).json({ message: "Commission not found" });
      }
      const prev = beforeRes.rows[0] as any;
      if (prev.status !== "pending") {
        return res.status(400).json({
          message: `Commission is already ${prev.status}; can only mark pending commissions as paid`,
        });
      }

      const updatedRes = await db.execute(sql`
        UPDATE commission_ledger
        SET status = 'paid', paid_at = NOW()
        WHERE id = ${id}
        RETURNING id, status, paid_at
      `);
      const updated = updatedRes.rows[0] as any;

      await auditLog(req, "commission_ledger.marked_paid",
        { type: "commission_ledger", id },
        { payload: {
            ledger_id: id,
            amount_cents: Number(prev.amount_cents),
            referrer_user_id: prev.referrer_user_id,
            referred_user_id: prev.referred_user_id,
            payment_reference: paymentReference,
        } });

      res.json({
        id: updated.id,
        status: updated.status,
        paid_at: updated.paid_at,
      });
    } catch (err) {
      console.error("[PATCH /api/admin/commission-ledger/:id/mark-paid]", err);
      res.status(500).json({ message: "Failed to mark commission paid" });
    }
  });

  // Admin audit log — paginated fetch with filters. Read-only.
  app.get("/api/admin/audit-log", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const pageSize = Math.min(200, Math.max(1, parseInt(req.query.pageSize as string) || 50));
      const offset = (page - 1) * pageSize;
      const { dateFrom, dateTo, actor, action, entityType } = req.query as Record<string, string | undefined>;

      const conditions: any[] = [];
      if (dateFrom) conditions.push(sql`created_at >= ${dateFrom}`);
      if (dateTo) conditions.push(sql`created_at <= ${dateTo}`);
      if (actor) conditions.push(sql`user_email = ${actor}`);
      if (action) conditions.push(sql`action = ${action}`);
      if (entityType) conditions.push(sql`entity_type = ${entityType}`);
      const whereClause = conditions.length
        ? sql`WHERE ${sql.join(conditions, sql` AND `)}`
        : sql``;

      const rowsResult = await db.execute(sql`
        SELECT id, user_id, user_email, actor_role, action, entity_type, entity_id,
               changes, ip_address, user_agent, created_at
        FROM admin_audit_log
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT ${pageSize} OFFSET ${offset}
      `);
      const countResult = await db.execute(sql`
        SELECT COUNT(*)::int AS total FROM admin_audit_log ${whereClause}
      `);
      const total = (countResult.rows[0] as any).total;
      res.json({ rows: rowsResult.rows, total, page, pageSize });
    } catch (err) {
      console.error("[GET /api/admin/audit-log]", err);
      res.status(500).json({ message: "Failed to fetch audit log" });
    }
  });

  // Admin audit log filters — distinct values for dropdown population.
  app.get("/api/admin/audit-log/filters", requireAdminAuth, async (_req: Request, res: Response) => {
    try {
      const actorsRes = await db.execute(sql`
        SELECT DISTINCT user_email FROM admin_audit_log
        WHERE user_email IS NOT NULL ORDER BY user_email ASC
      `);
      const actionsRes = await db.execute(sql`
        SELECT DISTINCT action FROM admin_audit_log ORDER BY action ASC
      `);
      const typesRes = await db.execute(sql`
        SELECT DISTINCT entity_type FROM admin_audit_log
        WHERE entity_type IS NOT NULL ORDER BY entity_type ASC
      `);
      res.json({
        actors: actorsRes.rows.map((r: any) => r.user_email),
        actions: actionsRes.rows.map((r: any) => r.action),
        entityTypes: typesRes.rows.map((r: any) => r.entity_type),
      });
    } catch (err) {
      console.error("[GET /api/admin/audit-log/filters]", err);
      res.status(500).json({ message: "Failed to fetch audit log filters" });
    }
  });

  // ── Bug Reports: admin GET endpoints ────────────────────────────────────────

  // GET /api/admin/bug-reports?status=open|resolved|all&page=N&pageSize=50
  app.get("/api/admin/bug-reports", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const validStatuses = ["open", "resolved", "all"] as const;
      type BugStatus = typeof validStatuses[number];
      const rawStatus = req.query.status as string | undefined;
      const status: BugStatus = validStatuses.includes(rawStatus as BugStatus)
        ? (rawStatus as BugStatus)
        : "open";
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize as string) || 50));
      const result = await storage.listBugReports({ status, page, pageSize });
      res.json(result);
    } catch (err) {
      console.error("[GET /api/admin/bug-reports]", err);
      res.status(500).json({ message: "Failed to fetch bug reports" });
    }
  });

  // GET /api/admin/bug-reports/:id
  app.get("/api/admin/bug-reports/:id", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid id" });
      const report = await storage.getBugReportDetail(id);
      if (!report) return res.status(404).json({ message: "Bug report not found" });
      res.json(report);
    } catch (err) {
      console.error("[GET /api/admin/bug-reports/:id]", err);
      res.status(500).json({ message: "Failed to fetch bug report" });
    }
  });

  // GET /api/admin/bug-reports/:id/photo
  app.get("/api/admin/bug-reports/:id/photo", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid id" });
      const photo = await storage.getBugReportPhoto(id);
      if (!photo) return res.status(404).json({ message: "No photo for this bug report" });
      const buffer = Buffer.from(photo.photoData, "base64");
      res.set("Content-Type", photo.photoMimeType);
      res.set("Cache-Control", "private, no-store");
      res.send(buffer);
    } catch (err) {
      console.error("[GET /api/admin/bug-reports/:id/photo]", err);
      res.status(500).json({ message: "Failed to fetch bug report photo" });
    }
  });

  // PATCH /api/admin/bug-reports/:id/status
  app.patch("/api/admin/bug-reports/:id/status", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid id" });
      const { status } = req.body as { status?: string };
      if (status !== "open" && status !== "resolved") {
        return res.status(400).json({ message: "status must be 'open' or 'resolved'" });
      }
      const existing = await storage.getBugReportDetail(id);
      if (!existing) return res.status(404).json({ message: "Bug report not found" });
      const adminUserId = (req.session as any).adminUserId as string;
      const updated = await storage.updateBugReportStatus(id, status, adminUserId);
      if (!updated) return res.status(404).json({ message: "Bug report not found" });
      await auditLog(req, "bug_report.status_change",
        { type: "bug_reports", id },
        { payload: { oldStatus: existing.status, newStatus: status } });
      const detail = await storage.getBugReportDetail(id);
      res.json(detail);
    } catch (err) {
      console.error("[PATCH /api/admin/bug-reports/:id/status]", err);
      res.status(500).json({ message: "Failed to update bug report status" });
    }
  });

  // DELETE /api/admin/bug-reports/:id
  app.delete("/api/admin/bug-reports/:id", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid id" });
      const deleted = await storage.softDeleteBugReport(id);
      if (!deleted) return res.status(404).json({ message: "Bug report not found" });
      await auditLog(req, "bug_report.delete",
        { type: "bug_reports", id },
        { before: { description: deleted.description, category: deleted.category, surface: deleted.surface, status: deleted.status, createdAt: deleted.createdAt } });
      res.json({ success: true });
    } catch (err) {
      console.error("[DELETE /api/admin/bug-reports/:id]", err);
      res.status(500).json({ message: "Failed to delete bug report" });
    }
  });

  // Serve uploaded images (for testing purposes)
  app.use("/uploads", (req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    next();
  });

    registerAdminPackageRoutes(app, requireAdminAuth);
    registerPartnerRoutes(app, requireAdminAuth);
  // Admin: generate thumbnail for a single color
  app.post("/api/admin/colors/:id/generate-thumbnail", async (req: Request, res: Response) => {
    if (!req.session.isAdminAuthenticated) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    try {
      const { id } = req.params;
      const [color] = await db.select().from(wrapColors).where(eq(wrapColors.id, parseInt(id)));
      if (!color) return res.status(404).json({ error: "Color not found" });
      if (!color.imageUrl) return res.status(400).json({ error: "No image URL" });
      let imageBuffer: Buffer;
      if (color.imageUrl.startsWith("data:")) {
        const b64 = color.imageUrl.split(",")[1];
        imageBuffer = Buffer.from(b64, "base64");
      } else {
        const filePath = path.join(process.cwd(), "client", "public", color.imageUrl.replace(/^\//, ""));
        imageBuffer = fs.readFileSync(filePath);
      }
      const thumbnailBuffer = await sharp(imageBuffer)
        .resize(900, 900, { fit: "cover" })
        .extract({ left: 300, top: 300, width: 300, height: 300 })
        .jpeg({ quality: 80 })
        .toBuffer();
      const thumbnailUrl = "data:image/jpeg;base64," + thumbnailBuffer.toString("base64");
      await db.update(wrapColors).set({ thumbnailUrl }).where(eq(wrapColors.id, parseInt(id)));
      await auditLog(req, "color.thumbnail_regenerate",
        { type: "wrap_colors", id: parseInt(id) });
      return res.json({ success: true, id: parseInt(id) });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // Admin: force-regenerate ALL wrap_colors thumbnails as 300x300 JPEG @ quality 80
  app.post("/api/admin/colors/regenerate-thumbnails", async (req: Request, res: Response) => {
    if (!req.session.isAdminAuthenticated) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    try {
      const colors = await db.select().from(wrapColors);
      const toProcess = colors.filter((c: any) => !!c.imageUrl);
      let processed = 0;
      const errors: string[] = [];
      for (const color of toProcess) {
        try {
          let imageBuffer: Buffer;
          if (color.imageUrl!.startsWith("data:")) {
            const b64 = color.imageUrl!.split(",")[1];
            imageBuffer = Buffer.from(b64, "base64");
          } else {
            const filePath = path.join(process.cwd(), "client", "public", color.imageUrl!.replace(/^\//, ""));
            imageBuffer = fs.readFileSync(filePath);
          }
          const thumbnailBuffer = await sharp(imageBuffer)
            .resize(300, 300, { fit: "cover" })
            .jpeg({ quality: 80 })
            .toBuffer();
          const thumbnailUrl = "data:image/jpeg;base64," + thumbnailBuffer.toString("base64");
          await db.update(wrapColors).set({ thumbnailUrl }).where(eq(wrapColors.id, color.id));
          processed++;
        } catch (err: any) {
          errors.push(`${color.id} (${color.name}): ${err.message}`);
        }
      }
      await auditLog(req, "color.thumbnail_regenerate_all",
        { type: "wrap_colors", id: null },
        { payload: { processed, attempted: toProcess.length, errorCount: errors.length } });
      return res.json({ processed, total: toProcess.length, errors });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

return httpServer;
}

// Seed admin user info@wrap-up.app on startup
async function seedAdminUser() {
  try {
    const adminEmail = "info@wrap-up.app";
    const existingAdmin = await db.select().from(users).where(eq(users.email, adminEmail)).limit(1);
    if (existingAdmin.length === 0) {
      const adminPassword = process.env.ADMIN_PASSWORD;
      if (!adminPassword) {
        console.log("ADMIN_PASSWORD not set, skipping admin user seed");
        return;
      }
      const passwordHash = await hashPassword(adminPassword);
      await db.insert(users).values({
        email: adminEmail,
        passwordHash,
        firstName: "Admin",
        lastName: "WrapUp",
        role: "admin",
      });
      console.log("Admin user info@wrap-up.app created successfully");
    }
  } catch (error) {
    console.error("Error seeding admin user:", error);
  }
}

seedAdminUser();
