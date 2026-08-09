import { useEffect, useState } from "react";
import { Cookie } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "linqo_cookie_notice_dismissed";

// Deliberately a single "Got it", not an Accept/Decline pair: the only
// cookie this app sets today is the httpOnly session cookie that signing
// in requires — there's no tracking or ads cookie to actually opt out of,
// so offering a "Decline" choice that does nothing would be dishonest UI.
export function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    if (!window.localStorage.getItem(STORAGE_KEY)) setVisible(true);
  }, []);

  function dismiss() {
    window.localStorage.setItem(STORAGE_KEY, "1");
    setExiting(true);
  }

  if (!visible) return null;

  return (
    <div
      role="status"
      onAnimationEnd={() => {
        if (exiting) setVisible(false);
      }}
      className={cn(
        "fixed bottom-4 right-4 z-50 w-[calc(100vw-2rem)] max-w-sm rounded-2xl border border-border bg-background/40 p-4 shadow-xl shadow-primary/10 backdrop-blur-2xl sm:bottom-6 sm:right-6",
        exiting ? "animate-cookie-bar-out" : "animate-cookie-bar-in",
      )}
    >
      <div className="flex items-start gap-3">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground">
          <Cookie className="h-4.5 w-4.5" />
        </div>
        <p className="text-sm text-muted-foreground">
          We use one cookie to keep you signed in — that&rsquo;s it. No tracking, no ads, no third
          parties.
        </p>
      </div>
      <Button onClick={dismiss} size="sm" className="mt-3 w-full">
        Got it
      </Button>
    </div>
  );
}
