import "dotenv/config";
import process from "node:process";
import { emailConfiguration, verificationPageUrl } from "../backend/email";

try {
  emailConfiguration();
  const url = verificationPageUrl();
  console.log(`Email configuration: Resend, confirmation origin ${url.origin}.`);
  if (process.env.RESEND_FROM?.trim().toLowerCase().endsWith("@resend.dev"))
    console.warn(
      "Test sender: Resend only allows delivery to the email address of your Resend account. Use a verified domain for other recipients.",
    );
  console.log(
    "Configuration format checked. No messages were sent; delivery and API-key permissions are not verified by this check.",
  );
} catch {
  const missing = ["RESEND_API_KEY", "RESEND_FROM", "FRONTEND_URL"].filter(
    (key) => !process.env[key]?.trim(),
  );
  console.error(
    missing.length
      ? `Missing email settings: ${missing.join(", ")}.`
      : "Invalid email settings. Use a plain sender address and an absolute frontend URL (HTTPS in production). Production cannot use a resend.dev sender.",
  );
  process.exitCode = 1;
}
