import express, { type Request, Response, NextFunction } from "express";
import cookieParser from "cookie-parser";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { setupAuth, registerAuthRoutes } from "./auth";
import { registerAccountRoutes } from "./account";
import { WebhookHandlers } from "./webhookHandlers";
import { handlePartnerWebhook } from "./partnerRoutes";
import { runMigrations } from "./migrate";
import { ensureGeoLite2Db } from "../scripts/download-geolite2";
import { refCaptureMiddleware } from "./refCapture";

const app = express();
const httpServer = createServer(app);

// Trust Railway's reverse proxy so secure cookies work behind HTTPS
app.set("trust proxy", 1);

declare module "express-session" {
  interface SessionData {
    isAdminAuthenticated?: boolean;
    adminUserId?: string;
    adminRole?: string;
    adminEmail?: string;
  }
}

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}

(async () => {
  try {
    // Run DB migrations (adds new columns safely if they don't exist)
    await runMigrations();

    // Item 0b — ensure GeoLite2-City.mmdb is downloaded before serving renders.
    // Synchronous-await: ~3s on first boot, instant on subsequent boots (mtime
    // skip). On failure, boot proceeds; geo lookups return NULL until next
    // restart (D1 contract — render flow always proceeds).
    try {
      const result = await ensureGeoLite2Db();
      console.log(
        "[boot] GeoLite2-City.mmdb " +
          (result.downloaded ? "downloaded to" : "already present at") +
          " " + result.path,
      );
    } catch (err: any) {
      // err.name only — never err.message (could echo file paths) or env values.
      console.warn(
        "[boot] GeoLite2 download failed: " +
          (err?.name ?? "unknown") +
          " — geo lookups will return NULL until next restart",
      );
    }

    // Setup auth (sessions + passport) BEFORE other routes
    setupAuth(app);

    // Register Stripe webhook BEFORE express.json() (needs raw body)
    app.post(
      "/api/stripe/webhook",
      express.raw({ type: "application/json" }),
      async (req, res) => {
        const signature = req.headers["stripe-signature"];
        if (!signature) {
          return res.status(400).json({ error: "Missing stripe-signature" });
        }
        try {
          const sig = Array.isArray(signature) ? signature[0] : signature;
          if (!Buffer.isBuffer(req.body)) {
            return res.status(500).json({ error: "Webhook processing error" });
          }
          await WebhookHandlers.processWebhook(req, req.body as Buffer, sig);
          res.status(200).json({ received: true });
        } catch (error: any) {
          console.error("Webhook error:", error.message);
          res.status(400).json({ error: "Webhook processing error" });
        }
      }
    );

    // Register partner Stripe webhook BEFORE express.json() middleware
app.post(
  "/api/partner/stripe/webhook",
  express.raw({ type: "application/json" }),
  handlePartnerWebhook
);

// JSON middleware for all other routes
    app.use(
      express.json({
        verify: (req: any, _res, buf) => {
          req.rawBody = buf;
        },
      })
    );
    app.use(express.urlencoded({ extended: false }));

    // Cookie parsing — populates req.cookies for endpoints that read
    // browser-set cookies (e.g. wup_consumer_token for the consumer
    // first-render gate). res.cookie() is a built-in on the response
    // object and does not require this middleware.
    app.use(cookieParser());

    // Serve color swatches as static files from the public folder
    app.use("/colors", express.static("client/public/colors"));

    // CLONE — serve kitchen finish swatches so the picker can display them.
    app.use("/swatches", express.static("client/public/swatches"));

    // PR #71 — capture ?ref=<handle> on landing pages and persist as a
    // 30-day HttpOnly cookie for anonymous visitors. Must run after
    // setupAuth (req.isAuthenticated) and after cookieParser (req.cookies)
    // — both prerequisites are met at this point.
    app.use(refCaptureMiddleware);

    // Register auth routes
    registerAuthRoutes(app);

    // Register account/profile routes
    registerAccountRoutes(app);

    // Logging middleware
    app.use((req, res, next) => {
      const start = Date.now();
      const path = req.path;
      let capturedJsonResponse: Record<string, any> | undefined = undefined;

      const originalResJson = res.json;
      res.json = function (bodyJson, ...args) {
        capturedJsonResponse = bodyJson;
        return originalResJson.apply(res, [bodyJson, ...args]);
      };

      res.on("finish", () => {
        const duration = Date.now() - start;
        if (path.startsWith("/api")) {
          let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
          if (capturedJsonResponse) {
            logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
          }
          log(logLine);
        }
      });

      next();
    });

    const server = await registerRoutes(httpServer, app);

    // Error handler â return JSON instead of raw HTML
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      console.error("Express error:", err);
      res.status(status).json({ message });
    });

    serveStatic(app);

    const port = parseInt(process.env.PORT || "5000", 10);
    server.listen(
      {
        port,
        host: "0.0.0.0",
      },
      () => {
        log(`serving on port ${port}`);
      },
    );
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
})();
