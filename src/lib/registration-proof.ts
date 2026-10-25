export async function registrationProof(challenge: {
  nonce: string;
  difficulty: number;
  minAgeMs: number;
}): Promise<string> {
  if (typeof Worker === "undefined")
    throw new Error("This browser cannot run the registration check. Try a current browser.");
  const started = Date.now();
  const worker = new Worker(new URL("./registration-worker.ts", import.meta.url), {
    type: "module",
  });
  try {
    const proof = await new Promise<string>((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error("Registration check timed out. Please try again.")),
        30_000,
      );
      worker.onmessage = (event: MessageEvent<{ proof?: string; error?: string }>) => {
        clearTimeout(timer);
        if (event.data.proof) resolve(event.data.proof);
        else reject(new Error(event.data.error ?? "Registration check failed"));
      };
      worker.onerror = () => {
        clearTimeout(timer);
        reject(new Error("Registration check failed. Please try again."));
      };
      worker.postMessage({ nonce: challenge.nonce, difficulty: challenge.difficulty });
    });
    const delay = Math.max(0, Math.min(5000, challenge.minAgeMs) - (Date.now() - started) + 100);
    if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
    return proof;
  } finally {
    worker.terminate();
  }
}
