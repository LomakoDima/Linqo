import { randomUUID } from "node:crypto";

export class EmailDeliveryError extends Error {
  readonly status = 503;
  constructor(public code = "EMAIL_DELIVERY_FAILED") {
    super(
      code === "EMAIL_NOT_CONFIGURED"
        ? "Email delivery isn't configured yet. Please try again later."
        : "We couldn't send the email. Please try again shortly.",
    );
  }
}
export function emailConfiguration() {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM?.trim();
  if (!apiKey || !from || !/^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(from))
    throw new EmailDeliveryError("EMAIL_NOT_CONFIGURED");
  if (process.env.NODE_ENV === "production" && from.toLowerCase().endsWith("@resend.dev"))
    throw new EmailDeliveryError("EMAIL_NOT_CONFIGURED");
  return { apiKey, from };
}
export function verificationPageUrl(): URL {
  const value = process.env.FRONTEND_URL;
  if (!value) throw new EmailDeliveryError("EMAIL_NOT_CONFIGURED");
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new EmailDeliveryError("EMAIL_NOT_CONFIGURED");
  }
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    (process.env.NODE_ENV === "production" && url.protocol !== "https:")
  )
    throw new EmailDeliveryError("EMAIL_NOT_CONFIGURED");
  return new URL("/verify-email", url);
}
export type TransactionalEmail = {
  to: string;
  subject: string;
  text: string;
  html: string;
  idempotencyKey: string;
};
export const mailTransport = {
  async deliver(message: TransactionalEmail): Promise<void> {
    const { apiKey, from } = emailConfiguration();
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        signal: AbortSignal.timeout(12_000),
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "Idempotency-Key": message.idempotencyKey,
        },
        body: JSON.stringify({
          from: `Linqo <${from}>`,
          to: [message.to],
          subject: message.subject,
          text: message.text,
          html: message.html,
        }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok || typeof body?.id !== "string") throw new EmailDeliveryError();
    } catch {
      throw new EmailDeliveryError();
    }
  },
};
const escapeHtml = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!,
  );
const template = (title: string, content: string) =>
  `<!doctype html><html lang="en"><body style="margin:0;padding:32px 16px;background:#f6f4ee;color:#24211e;font-family:Arial,sans-serif"><main style="max-width:480px;margin:auto;padding:32px;background:#fffdf9;border:1px solid #ded9d0;border-radius:8px"><p style="margin:0 0 24px;font-family:Georgia,serif;font-size:24px">Linqo</p><h1 style="font-family:Georgia,serif;font-weight:normal;font-size:26px">${title}</h1>${content}<p style="margin-top:28px;font-size:12px;color:#716b63">If you didn't request this, you can ignore this email.</p></main></body></html>`;
export async function sendVerificationEmail(
  to: string,
  url: string,
  tokenHash: string,
  emailChange: boolean,
): Promise<void> {
  const title = emailChange ? "Confirm your new email" : "Confirm your email";
  await mailTransport.deliver({
    to,
    subject: `${title} — Linqo`,
    idempotencyKey: `email-verification/${tokenHash}`,
    text: `${title} by opening this link:\n\n${url}\n\nThe link expires in 30 minutes and can only be used once.\n\nIf you didn't request this, ignore this email.`,
    html: template(
      title,
      `<p style="line-height:1.6">${emailChange ? "Confirm this address to finish changing your Linqo email. Your current address stays active until then." : "Confirm this address to finish setting up your account."}</p><p style="margin:28px 0"><a href="${escapeHtml(url)}" style="display:inline-block;padding:12px 20px;background:#24211e;color:#fffdf9;text-decoration:none;border-radius:6px">Confirm email</a></p><p style="font-size:13px;color:#716b63">This link expires in 30 minutes and can only be used once.</p>`,
    ),
  });
}
export async function sendPasswordResetEmail(
  to: string,
  code: string,
  requestId: string = randomUUID(),
): Promise<void> {
  await mailTransport.deliver({
    to,
    subject: "Your Linqo reset code",
    idempotencyKey: `password-reset/${requestId}`,
    text: `Your password reset code is ${code}. It expires in 10 minutes.\n\nIf you didn't request this, ignore this email.`,
    html: template(
      "Reset your password",
      `<p>Use this code to reset your password:</p><p style="font-family:monospace;font-size:32px;letter-spacing:8px">${escapeHtml(code)}</p><p style="font-size:13px;color:#716b63">The code expires in 10 minutes.</p>`,
    ),
  });
}
