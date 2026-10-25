import { sha256 } from "@noble/hashes/sha2.js";

export function solveRegistrationProof(nonce: string, difficulty: number): string {
  if (
    !/^[a-f0-9]{64}$/.test(nonce) ||
    !Number.isInteger(difficulty) ||
    difficulty < 16 ||
    difficulty > 20
  )
    throw new Error("Invalid registration check");
  const encoder = new TextEncoder();
  for (let proof = 0; proof < 16_777_216; proof++) {
    const hash = sha256(encoder.encode(`${nonce}:${proof}`));
    let valid = true;
    for (let bit = 0; bit < difficulty; bit++)
      if (hash[bit >> 3] & (128 >> (bit % 8))) {
        valid = false;
        break;
      }
    if (valid) return String(proof);
  }
  throw new Error("Registration check took too long. Please try again.");
}
