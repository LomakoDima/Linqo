import { Resend } from "resend";

// No branded template — a one-line plain-text message is honest about what
// this is (a small app's password reset code), not a fake polished email.
export async function sendPasswordResetEmail(to: string, code: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not set — add it to .env to send reset emails");
  }
  const resend = new Resend(apiKey);
  const from = process.env.RESEND_FROM ?? "onboarding@resend.dev";

  const { error } = await resend.emails.send({
    from: `Linqo <${from}>`,
    to,
    subject: "Your Linqo reset code",
    text: `Your password reset code is ${code}. It expires in 10 minutes.\n\nIf you didn't request this, you can ignore this email.`,
  });
  if (error) throw new Error(error.message);
}
