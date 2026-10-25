// Shared by every client for the backend/ API (publish.ts, auth-client.ts) —
// each of them throws an Error carrying the server's own {error} message so
// callers can show it directly instead of a generic "request failed".
export async function readJsonOrThrow(res: Response): Promise<unknown> {
  const body = await res.json().catch(() => null);
  if (res.ok) return body;
  const message =
    body && typeof body === "object" && "error" in body && typeof body.error === "string"
      ? body.error
      : `Request failed (${res.status})`;
  const issue = Array.isArray(body?.issues) ? body.issues[0] : null;
  const detail =
    issue && typeof issue.path === "string" && typeof issue.message === "string"
      ? ` (${issue.path}: ${issue.message})`
      : "";
  const retryAfter =
    typeof body?.retryAfter === "number" ? body.retryAfter : Number(res.headers.get("Retry-After"));
  const retry =
    res.status === 429 && Number.isFinite(retryAfter) && retryAfter > 0
      ? ` Try again in ${retryAfter < 60 ? `${Math.ceil(retryAfter)} seconds` : `${Math.ceil(retryAfter / 60)} minutes`}.`
      : "";
  throw Object.assign(new Error(message + detail + retry), {
    status: res.status,
    code: body?.code,
    retryAfter,
  });
}
