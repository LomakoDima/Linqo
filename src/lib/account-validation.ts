import { z } from "zod";
import { hasUnsafeControls } from "./content-safety";
import { localTextViolation } from "./content-policy";
import { containsCodeContent } from "./code-content";

export const accountNameSchema = z
  .string()
  .trim()
  .min(1)
  .max(100)
  .refine(
    (v) =>
      v.length <= 100 && !hasUnsafeControls(v) && !localTextViolation(v) && !containsCodeContent(v),
    "Choose a different display name",
  );
export const accountEmailSchema = z.string().max(254).email();
export const onboardingSchema = z
  .object({
    purpose: z.enum(["creator", "business", "personal", "community"]).optional(),
    vibe: z.enum(["dark", "sunset", "light", "candy"]).optional(),
    linkCount: z.enum(["few", "some", "many"]).optional(),
  })
  .strict();

// bcrypt only considers the first 72 bytes. Do not normalize or filter secrets.
export function validNewPassword(password: string): boolean {
  return password.length >= 8 && new TextEncoder().encode(password).length <= 72;
}
