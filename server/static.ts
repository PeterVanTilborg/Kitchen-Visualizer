import express, { type Express } from "express";
import fs from "fs";
import path from "path";

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  // Serve widget.js with no-cache headers so partners always get the latest version
  app.get("/widget.js", (_req, res) => {
    res.set("Cache-Control", "no-cache, no-store, must-revalidate");
    res.set("Pragma", "no-cache");
    res.set("Expires", "0");
    res.sendFile(path.resolve(distPath, "widget.js"));
  });

  // Serve the share-composite watermark with Access-Control-Allow-Origin: *
  // so the cross-origin <img crossOrigin="anonymous"> load from the widget
  // (embedded on partner domains) does not taint the canvas. Public static
  // asset, no credentials, so wildcard is correct. Must be registered BEFORE
  // express.static so it wins for this one filename — the bare static
  // middleware does not set CORS headers and would otherwise serve the file
  // without them.
  app.get("/wrapup-ai-watermark.png", (_req, res) => {
    res.set("Access-Control-Allow-Origin", "*");
    res.sendFile(path.resolve(distPath, "wrapup-ai-watermark.png"));
  });

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
