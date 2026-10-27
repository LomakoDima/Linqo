import "dotenv/config";
import process from "node:process";
import { randomUUID } from "node:crypto";
import { mailTransport, emailConfiguration } from "../backend/email";

const to = process.argv[2]?.trim();
if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
  console.error("Usage: npm run mail:test -- your-test-recipient@example.com");
  process.exitCode = 1;
} else {
  try {
    emailConfiguration();
    await mailTransport.deliver({
      to,
      subject: "Linqo email delivery test",
      text: "Your Linqo email transport is configured. This is a delivery test, not an account confirmation.",
      html: "<p>Your Linqo email transport is configured.</p><p>This is a delivery test, not an account confirmation.</p>",
      idempotencyKey: `mail-test/${randomUUID()}`,
    });
    console.log(
      "Resend accepted the test email. Check the recipient's inbox/spam folder and the Resend delivery log.",
    );
  } catch {
    console.error(
      "Email test failed. Check the API key, verified sender domain, provider quota and Resend delivery logs. Credentials were not printed.",
    );
    process.exitCode = 1;
  }
}
