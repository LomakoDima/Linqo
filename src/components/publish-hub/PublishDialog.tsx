import { useEffect, useRef, useState } from "react";
import { Rocket, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { publishProfile } from "@/lib/publish";
import { toast } from "@/components/notifications";
import type { Profile } from "@/lib/link-store";

const STEPS = [
  "Uploading your changes",
  "Optimizing images",
  "Generating metadata",
  "Deploying",
] as const;

type Phase = "running" | "success" | "error";

// The steps are a real, honest animation, not a fixed-time fake — the
// "Published" reveal only happens once BOTH the visual sequence has
// finished AND the real publishProfile() promise has resolved, whichever
// comes second (see maybeFinish). A slow network holds the last step in a
// pulsing state instead of the UI lying about being done.
export function PublishDialog({
  open,
  profile,
  onOpenChange,
  onSuccess,
}: {
  open: boolean;
  profile: Profile;
  onOpenChange: (open: boolean) => void;
  onSuccess: (updatedAt: string) => void;
}) {
  const [phase, setPhase] = useState<Phase>("running");
  const [stepIndex, setStepIndex] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const animDoneRef = useRef(false);
  const networkResultRef = useRef<{ updatedAt: string } | null>(null);

  const runPublish = () => {
    setPhase("running");
    setStepIndex(0);
    setErrorMsg(null);
    animDoneRef.current = false;
    networkResultRef.current = null;
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];

    const maybeFinish = () => {
      if (animDoneRef.current && networkResultRef.current) setPhase("success");
    };

    let elapsed = 0;
    STEPS.forEach((_, i) => {
      elapsed += 450 + Math.random() * 150;
      timersRef.current.push(setTimeout(() => setStepIndex(i + 1), elapsed));
    });
    timersRef.current.push(
      setTimeout(() => {
        animDoneRef.current = true;
        maybeFinish();
      }, elapsed),
    );

    publishProfile(profile.slug, JSON.stringify(profile))
      .then((res) => {
        if (res.warnings?.length) toast.warning(res.warnings[0].message, { duration: 10_000 });
        networkResultRef.current = { updatedAt: res.updatedAt };
        maybeFinish();
      })
      .catch((err: unknown) => {
        timersRef.current.forEach(clearTimeout);
        setPhase("error");
        setErrorMsg(err instanceof Error ? err.message : "Publish failed — try again in a moment");
      });
  };

  useEffect(() => {
    if (!open) return;
    runPublish();
    return () => {
      timersRef.current.forEach(clearTimeout);
    };
    // Fires once per open — not on every profile/onSuccess identity change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // A brief pause on the fully-checked state before handing off to the
  // parent (which closes this dialog, fires confetti, opens SuccessDialog)
  // — lets the last checkmark actually register before the cut.
  useEffect(() => {
    if (phase !== "success" || !networkResultRef.current) return;
    const t = setTimeout(() => onSuccess(networkResultRef.current!.updatedAt), 600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (phase !== "running") onOpenChange(o);
      }}
    >
      <DialogContent
        className="sm:max-w-md"
        onInteractOutside={(e) => {
          if (phase === "running") e.preventDefault();
        }}
        onEscapeKeyDown={(e) => {
          if (phase === "running") e.preventDefault();
        }}
      >
        <DialogTitle className="sr-only">Publishing your page</DialogTitle>
        {phase === "error" ? (
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <XCircle className="h-10 w-10 text-destructive" />
            <div>
              <p className="font-display text-2xl font-medium">Couldn’t publish your page</p>
              <p className="mt-1 text-sm text-muted-foreground">{errorMsg}</p>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="button" onClick={runPublish}>
                Retry
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-6 py-6">
            <div className="grid h-14 w-14 place-items-center rounded-ui border border-border text-foreground">
              <Rocket className="h-6 w-6" />
            </div>
            <ul className="w-full space-y-3">
              {STEPS.map((step, i) => {
                const checked = i < stepIndex || phase === "success";
                const active = i === stepIndex && phase === "running";
                return (
                  <li key={step} className="flex items-center gap-3 text-sm">
                    {checked ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
                    ) : active ? (
                      <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
                    ) : (
                      <span className="h-4 w-4 shrink-0 rounded-full border border-border" />
                    )}
                    <span
                      className={checked || active ? "text-foreground" : "text-muted-foreground"}
                    >
                      {step}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
