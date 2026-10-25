import { createStart, createMiddleware } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import { createCspNonce, documentSecurityHeaders } from "./lib/security-headers";

import { renderErrorPage } from "./lib/error-page";

const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

const securityMiddleware = createMiddleware().server(({ next }) => {
  const cspNonce = createCspNonce();
  const headers = documentSecurityHeaders(
    cspNonce,
    import.meta.env.VITE_API_URL ?? "http://localhost:3001",
    import.meta.env.DEV,
  );
  for (const [name, value] of Object.entries(headers)) setResponseHeader(name, value);
  return next({ context: { cspNonce } });
});

export const startInstance = createStart(() => ({
  requestMiddleware: [securityMiddleware, errorMiddleware],
}));
