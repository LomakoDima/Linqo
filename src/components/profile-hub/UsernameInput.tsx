import { useEffect, useId, useRef, useState } from "react";
import { Check, X, Loader2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { APP_DOMAIN } from "@/lib/constants";
import { isSlugAvailable } from "@/lib/publish";

type Status = "idle" | "checking" | "available" | "taken";

// Advisory live validation only — the real gate stays server-side at
// publish time (profiles.ts's ownership check), so a "taken" state here
// never blocks typing or navigating away. Debounced 400ms; short-circuits
// instantly when the typed slug is the one this account already owns.
export function UsernameInput({
  slug,
  myOwnedSlug,
  onChange,
}: {
  slug: string;
  myOwnedSlug: string | null;
  onChange: (slug: string) => void;
}) {
  const [status, setStatus] = useState<Status>("idle");
  const requestIdRef = useRef(0);
  const inputId = useId();
  const statusId = useId();

  useEffect(() => {
    const requestId = ++requestIdRef.current;
    if (!slug) {
      setStatus("idle");
      return;
    }
    if (slug === myOwnedSlug) {
      setStatus("available");
      return;
    }
    setStatus("checking");
    const timer = setTimeout(() => {
      isSlugAvailable(slug, myOwnedSlug).then((available) => {
        if (requestIdRef.current !== requestId) return;
        setStatus(available ? "available" : "taken");
      });
    }, 400);
    return () => clearTimeout(timer);
  }, [slug, myOwnedSlug]);

  return (
    <div>
      <Label htmlFor={inputId} className="mb-2 block">
        Page address
      </Label>
      <div className="flex items-center gap-0 rounded-lg border border-input bg-background pl-3 transition-colors focus-within:ring-1 focus-within:ring-ring">
        <span className="shrink-0 select-none text-sm text-muted-foreground">{APP_DOMAIN}/</span>
        <Input
          id={inputId}
          aria-describedby={statusId}
          aria-invalid={status === "taken"}
          value={slug}
          onChange={(e) => onChange(e.target.value.replace(/[^a-zA-Z0-9_-]/g, "").toLowerCase())}
          className="border-0 px-1.5 shadow-none focus-visible:ring-0"
          placeholder="yourname"
        />
        <span className="flex shrink-0 items-center pr-3">
          {status === "checking" && (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          )}
          {status === "available" && <Check className="h-4 w-4 text-success" />}
          {status === "taken" && <X className="h-4 w-4 text-destructive" />}
        </span>
      </div>
      <p id={statusId} role="status" className="mt-1.5 min-h-4 text-xs">
        {status === "taken" ? (
          <span className="text-destructive">Already taken — try another one.</span>
        ) : status === "available" && slug !== myOwnedSlug ? (
          <span className="text-success">Available</span>
        ) : null}
      </p>
    </div>
  );
}
