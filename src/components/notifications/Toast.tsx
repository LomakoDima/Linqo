import { useState } from "react";
import { CheckCircle2, XCircle, Info, AlertTriangle, X, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  expireToast,
  pauseToast,
  removeToast,
  resumeToast,
  type ToastItem,
  type ToastVariant,
} from "./store";

const VARIANT_ICON: Record<ToastVariant, LucideIcon> = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
  warning: AlertTriangle,
};

const VARIANT_ICON_CLASS: Record<ToastVariant, string> = {
  success: "text-success",
  error: "text-destructive",
  info: "text-foreground",
  warning: "text-chart-4",
};

const VARIANT_BAR_CLASS: Record<ToastVariant, string> = {
  success: "bg-success",
  error: "bg-destructive",
  info: "bg-foreground/40",
  warning: "bg-chart-4",
};

export function Toast({ item }: { item: ToastItem }) {
  const [paused, setPaused] = useState(false);
  const Icon = VARIANT_ICON[item.variant];

  const pause = () => {
    pauseToast(item.id);
    setPaused(true);
  };
  const resume = () => {
    resumeToast(item.id);
    setPaused(false);
  };

  return (
    <li
      role="status"
      onMouseEnter={pause}
      onMouseLeave={resume}
      onFocus={pause}
      onBlur={resume}
      onAnimationEnd={() => {
        if (item.exiting) removeToast(item.id);
      }}
      className={cn(
        "pointer-events-auto relative flex w-80 max-w-[calc(100vw-2rem)] items-start gap-3 overflow-hidden rounded-xl border border-border bg-card p-4 pr-9 shadow-lg",
        item.exiting ? "animate-toast-out" : "animate-toast-in",
      )}
    >
      <Icon
        className={cn("mt-0.5 h-5 w-5 shrink-0", VARIANT_ICON_CLASS[item.variant])}
        aria-hidden
      />
      <p className="text-sm leading-snug text-foreground">{item.message}</p>
      <button
        type="button"
        onClick={() => expireToast(item.id)}
        aria-label="Dismiss notification"
        className="absolute right-2 top-2 cursor-pointer rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground"
      >
        <X className="h-3.5 w-3.5" />
      </button>
      {!item.exiting && (
        <span
          aria-hidden
          className={cn(
            "absolute inset-x-0 bottom-0 h-0.5 animate-toast-progress",
            VARIANT_BAR_CLASS[item.variant],
          )}
          style={{
            animationDuration: `${item.duration}ms`,
            animationPlayState: paused ? "paused" : "running",
          }}
        />
      )}
    </li>
  );
}
