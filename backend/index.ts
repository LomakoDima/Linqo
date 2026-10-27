import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { initDb } from "./db";
import { profilesRouter } from "./routes/profiles";
import { musicRouter } from "./routes/music";
import { imagesRouter } from "./routes/images";
import { authRouter } from "./routes/auth";
import { meRouter } from "./routes/me";
import { errorHandler } from "./http-errors";
import { apiRateLimit, trustedProxies } from "./abuse";
import { emailConfiguration, verificationPageUrl } from "./email";

const app = express();
const PORT = Number(process.env.PORT ?? 3001);
try {
  emailConfiguration();
  verificationPageUrl();
} catch {
  console.warn(
    "Email delivery is not configured. Accounts can register, but email confirmation and recovery need delivery settings; run npm run mail:check.",
  );
}
app.set("trust proxy", trustedProxies(process.env.TRUSTED_PROXIES));

// No CORS_ORIGIN set → trust any localhost port in dev, since Vite hops
// ports when one's already taken. Set CORS_ORIGIN (comma-separated) once
// there's a real frontend origin to lock this down to. credentials:true is
// required for the session cookie to travel cross-port, which only works
// with an explicit/reflected origin — never "*" — so this can't relax to a
// wildcard even in dev.
const configuredOrigins = process.env.CORS_ORIGIN?.split(",").map((s) => s.trim());
app.use(
  cors({
    origin: configuredOrigins ?? /^http:\/\/localhost:\d+$/,
    credentials: true,
    exposedHeaders: ["Retry-After", "RateLimit-Limit", "RateLimit-Remaining", "RateLimit-Reset"],
  }),
);
app.use(cookieParser());
app.disable("x-powered-by");
app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'",
  );
  next();
});

// Body-parser's own limit is set above the profile route's real 400KB rule
// so that rule — not a raw "payload too large" from here — is what a client
// actually sees for an oversized profile.
app.use("/api", apiRateLimit);
app.use(express.json({ limit: "600kb" }));

app.get("/api/health", (_req, res) => res.json({ ok: true }));
app.use("/api/auth", authRouter);
app.use("/api/me", meRouter);
app.use("/api/profiles", profilesRouter);
app.use("/api/music", musicRouter);
app.use("/api/images", imagesRouter);

app.use(errorHandler);

initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`API server listening on http://localhost:${PORT}`);
    });
  })
  .catch((err: unknown) => {
    console.error("Failed to initialize database:", err);
    process.exit(1);
  });
