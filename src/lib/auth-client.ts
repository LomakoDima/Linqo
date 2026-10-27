import { readJsonOrThrow } from "@/lib/http";
import { registrationProof } from "./registration-proof";

const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:3001";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  hasPassword: boolean;
  pendingEmail?: string | null;
};
export type SignUpResult = {
  verificationRequired: true;
  email: string;
  emailSent: boolean;
  deliveryError?: string;
};

async function request(method: string, path: string, data?: unknown): Promise<unknown> {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    // The session lives in an httpOnly cookie set by the API's own origin
    // (a different port in dev) — every auth call needs this or the browser
    // just won't attach/accept it.
    credentials: "include",
    body: data === undefined ? undefined : JSON.stringify(data),
  });
  return readJsonOrThrow(res);
}

function postJson(path: string, data: unknown): Promise<unknown> {
  return request("POST", path, data);
}

export async function signUp(input: {
  name: string;
  email: string;
  password: string;
  website?: string;
}): Promise<SignUpResult> {
  const challenge = (await request("GET", "/api/auth/registration-challenge")) as {
    id: string;
    nonce: string;
    difficulty: number;
    minAgeMs: number;
  };
  const proof = await registrationProof(challenge);
  return (await postJson("/api/auth/signup", {
    ...input,
    challengeId: challenge.id,
    proof,
  })) as SignUpResult;
}

export async function resendVerification(email: string): Promise<void> {
  await postJson("/api/auth/resend-verification", { email });
}
export async function confirmEmail(token: string): Promise<{ ok: true; emailChange: boolean }> {
  return (await postJson("/api/auth/verify-email", { token })) as {
    ok: true;
    emailChange: boolean;
  };
}
export async function resendEmailChange(): Promise<void> {
  await postJson("/api/me/resend-email-verification", {});
}

export async function signIn(input: { email: string; password: string }): Promise<AuthUser> {
  const { user } = (await postJson("/api/auth/signin", input)) as { user: AuthUser };
  return user;
}

export async function signOut(): Promise<void> {
  await readJsonOrThrow(
    await fetch(`${API_URL}/api/auth/signout`, { method: "POST", credentials: "include" }),
  );
}

// Never throws — an unreachable API or a missing session both just mean
// "not signed in" to every caller (route guards, header, etc.).
export async function getMe(): Promise<AuthUser | null> {
  try {
    const res = await fetch(`${API_URL}/api/auth/me`, { credentials: "include" });
    if (!res.ok) return null;
    const { user } = (await res.json()) as { user: AuthUser | null };
    return user;
  } catch {
    return null;
  }
}

export async function updateProfile(input: {
  name?: string;
  email?: string;
  currentPassword?: string;
}): Promise<AuthUser> {
  const { user } = (await request("PATCH", "/api/me", input)) as { user: AuthUser };
  return user;
}

export async function changePassword(input: {
  currentPassword: string;
  newPassword: string;
}): Promise<void> {
  await request("PATCH", "/api/me/password", input);
}

export async function deleteAccount(): Promise<void> {
  await request("DELETE", "/api/me");
}

export async function saveOnboardingAnswers(answers: Record<string, string>): Promise<void> {
  await request("PATCH", "/api/me/onboarding", { answers });
}

export async function forgotPassword(email: string): Promise<void> {
  await postJson("/api/auth/forgot-password", { email });
}

export async function verifyResetCode(input: { email: string; code: string }): Promise<string> {
  const { resetToken } = (await postJson("/api/auth/verify-reset-code", input)) as {
    resetToken: string;
  };
  return resetToken;
}

export async function resetPassword(input: {
  resetToken: string;
  password: string;
}): Promise<void> {
  await postJson("/api/auth/reset-password", input);
}

// Not fetch calls — the browser has to actually leave the SPA for the OAuth
// redirect chain (start -> provider consent screen -> our callback) to work.
export function googleSignInUrl(): string {
  return `${API_URL}/api/auth/google`;
}

export function githubSignInUrl(): string {
  return `${API_URL}/api/auth/github`;
}
