import { solveRegistrationProof } from "./registration-pow";

self.onmessage = (event: MessageEvent<{ nonce: string; difficulty: number }>) => {
  try {
    self.postMessage({ proof: solveRegistrationProof(event.data.nonce, event.data.difficulty) });
  } catch (error) {
    self.postMessage({
      error: error instanceof Error ? error.message : "Registration check failed",
    });
  }
};
