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
  throw new Error(message);
}
