// Integration point for the project's future self-hosted CV/audio classifier.
// A valid file is NOT evidence that the depicted content is acceptable.
export type MediaVerdict = { status: "unreviewed" | "allowed" | "blocked"; reason?: string };
export type MediaInspector = (input: {
  bytes: Uint8Array;
  mime: string;
  kind: "image" | "audio";
}) => Promise<MediaVerdict>;
let inspector: MediaInspector = async () => ({ status: "unreviewed" });

export function configureMediaInspector(value: MediaInspector): void {
  inspector = value;
}
export async function inspectMedia(input: Parameters<MediaInspector>[0]): Promise<MediaVerdict> {
  const verdict = await inspector(input);
  if (!["allowed", "blocked", "unreviewed"].includes(verdict?.status))
    throw new Error("Invalid media inspection result");
  if (verdict.status === "blocked")
    throw Object.assign(new Error("This media was rejected by content inspection"), {
      status: 422,
    });
  // Local-only mode explicitly accepts UNREVIEWED media after technical checks.
  // Do not relabel this result as approved or claim visual moderation is active.
  return verdict;
}
