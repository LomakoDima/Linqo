import crypto from "node:crypto";

// Hand-rolled OAuth 2.0 authorization-code flow for Google + GitHub — no
// client library. `arctic`, the obvious lightweight choice for this, was
// deprecated by its own author in July 2026 (he's pointing everyone at
// copy-pasted snippets instead of depending on the package), and this app's
// own session system already went the same "own the code, no framework"
// route — a few `fetch` calls to well-documented, stable provider endpoints
// is less risk than a dependency its maintainer just told people to stop
// using.

export type OAuthProvider = "google" | "github";

export type OAuthProfile = { providerUserId: string; email: string; name: string };

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not set — add it to .env before using this sign-in method`);
  }
  return value;
}

function apiBaseUrl(): string {
  return process.env.API_BASE_URL ?? `http://localhost:${process.env.PORT ?? 3001}`;
}

function randomToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString("hex");
}

function base64url(input: Buffer): string {
  return input.toString("base64url");
}

// --- Google (PKCE + OpenID Connect userinfo) ---

export function buildGoogleAuthUrl(): { url: string; state: string; codeVerifier: string } {
  const clientId = requireEnv("GOOGLE_CLIENT_ID");
  const state = randomToken();
  const codeVerifier = base64url(crypto.randomBytes(32));
  const codeChallenge = base64url(crypto.createHash("sha256").update(codeVerifier).digest());

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `${apiBaseUrl()}/api/auth/google/callback`,
    response_type: "code",
    scope: "openid email profile",
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });
  return { url: `https://accounts.google.com/o/oauth2/v2/auth?${params}`, state, codeVerifier };
}

export async function exchangeGoogleCode(
  code: string,
  codeVerifier: string,
): Promise<OAuthProfile> {
  const clientId = requireEnv("GOOGLE_CLIENT_ID");
  const clientSecret = requireEnv("GOOGLE_CLIENT_SECRET");

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      code_verifier: codeVerifier,
      grant_type: "authorization_code",
      redirect_uri: `${apiBaseUrl()}/api/auth/google/callback`,
    }),
  });
  if (!tokenRes.ok) throw new Error("Google rejected the sign-in request");
  const { access_token } = (await tokenRes.json()) as { access_token: string };

  const userRes = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { Authorization: `Bearer ${access_token}` },
  });
  if (!userRes.ok) throw new Error("Couldn't read the Google profile");
  const user = (await userRes.json()) as { sub: string; email?: string; name?: string };
  if (!user.email) throw new Error("Your Google account has no email to sign in with");

  return { providerUserId: user.sub, email: user.email, name: user.name ?? user.email };
}

// --- GitHub ---

export function buildGithubAuthUrl(): { url: string; state: string } {
  const clientId = requireEnv("GITHUB_CLIENT_ID");
  const state = randomToken();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `${apiBaseUrl()}/api/auth/github/callback`,
    scope: "read:user user:email",
    state,
  });
  return { url: `https://github.com/login/oauth/authorize?${params}`, state };
}

export async function exchangeGithubCode(code: string): Promise<OAuthProfile> {
  const clientId = requireEnv("GITHUB_CLIENT_ID");
  const clientSecret = requireEnv("GITHUB_CLIENT_SECRET");

  const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: `${apiBaseUrl()}/api/auth/github/callback`,
    }),
  });
  if (!tokenRes.ok) throw new Error("GitHub rejected the sign-in request");
  const tokenBody = (await tokenRes.json()) as {
    access_token?: string;
    error_description?: string;
  };
  if (!tokenBody.access_token) {
    throw new Error(tokenBody.error_description ?? "GitHub rejected the sign-in request");
  }

  const headers = {
    Authorization: `Bearer ${tokenBody.access_token}`,
    // GitHub's API 4xx's any request with no User-Agent.
    "User-Agent": "linqo-app",
  };

  const userRes = await fetch("https://api.github.com/user", { headers });
  if (!userRes.ok) throw new Error("Couldn't read the GitHub profile");
  const user = (await userRes.json()) as {
    id: number;
    login: string;
    name: string | null;
    email: string | null;
  };

  // A private-by-default primary email means `user.email` is null — the
  // verified primary has to come from the emails endpoint instead.
  let email = user.email;
  if (!email) {
    const emailsRes = await fetch("https://api.github.com/user/emails", { headers });
    if (emailsRes.ok) {
      const emails = (await emailsRes.json()) as {
        email: string;
        primary: boolean;
        verified: boolean;
      }[];
      email = emails.find((e) => e.primary && e.verified)?.email ?? null;
    }
  }
  if (!email) throw new Error("Your GitHub account has no verified email to sign in with");

  return { providerUserId: String(user.id), email, name: user.name ?? user.login };
}
