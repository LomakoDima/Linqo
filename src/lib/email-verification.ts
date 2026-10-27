const RECEIPT_KEY = "linqo_email_confirmation";
export function rememberVerification(email: string, sent: boolean) {
  try {
    sessionStorage.setItem(
      RECEIPT_KEY,
      JSON.stringify({ email: email.trim().toLowerCase(), sent }),
    );
  } catch {
    /* The request form also works without storage. */
  }
}
export function pendingVerification(): { email: string; sent: boolean } {
  try {
    const value = JSON.parse(sessionStorage.getItem(RECEIPT_KEY) ?? "null");
    if (typeof value?.email === "string" && value.email.length <= 254)
      return { email: value.email, sent: value.sent === true };
  } catch {
    /* Ignore a stale local hint. */
  }
  return { email: "", sent: false };
}
export function clearVerificationHint() {
  try {
    sessionStorage.removeItem(RECEIPT_KEY);
  } catch {
    /* Optional hint only. */
  }
}
