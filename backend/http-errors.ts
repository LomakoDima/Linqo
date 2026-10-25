import type { ErrorRequestHandler } from "express";
import multer from "multer";
import { AbuseError } from "./abuse-error";

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof AbuseError) {
    if (err.retryAfter > 0) res.setHeader("Retry-After", String(err.retryAfter));
    res.setHeader("RateLimit-Remaining", "0");
    res.setHeader("Cache-Control", "no-store");
    res.status(err.status).json({ error: err.message, code: err.code, retryAfter: err.retryAfter });
    return;
  }
  if (err instanceof multer.MulterError) {
    res.status(err.code === "LIMIT_FILE_SIZE" ? 413 : 400).json({
      error:
        err.code === "LIMIT_FILE_SIZE"
          ? "File is too large (images: 10 MB, audio: 20 MB)"
          : "Upload one supported file at a time",
    });
    return;
  }
  if (err?.type === "entity.too.large") {
    res.status(413).json({ error: "Request is too large" });
    return;
  }
  if (err?.type === "entity.parse.failed") {
    res.status(400).json({ error: "Invalid JSON request" });
    return;
  }
  if (Number.isInteger(err?.status) && err.status >= 400 && err.status < 500) {
    res.status(err.status).json({ error: err.message });
    return;
  }
  // Never log uploaded bytes, profile text, passwords or request bodies.
  console.error("API request failed", { code: err?.code ?? "internal" });
  res.status(500).json({ error: "Internal server error" });
};
