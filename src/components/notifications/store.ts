// Framework-agnostic toast store — plain module state + a subscribe/emit
// pair, so `toast.success(...)` works from anywhere (a catch block, a plain
// async function) and not just inside a component. ToastViewport.tsx is the
// only reader, via useSyncExternalStore.

export type ToastVariant = "success" | "error" | "info" | "warning";

export type ToastItem = {
  id: string;
  variant: ToastVariant;
  message: string;
  duration: number;
  // Set once the dismiss timer (or the user) starts closing this toast —
  // Toast.tsx plays the exit animation while this is true and only calls
  // removeToast() once that animation actually finishes, so every dismissal
  // (auto or manual) gets the same exit motion instead of auto-dismiss just
  // vanishing the item instantly.
  exiting: boolean;
};

const DEFAULT_DURATION: Record<ToastVariant, number> = {
  success: 4000,
  info: 4000,
  error: 6000,
  warning: 6000,
};

let items: ToastItem[] = [];
const listeners = new Set<() => void>();

// The dismiss timer per toast lives outside React state on purpose — pausing
// on hover has to clear/reschedule a real setTimeout, which isn't something
// a render-driven value can do on its own.
type TimerEntry = {
  remainingMs: number;
  resumedAt: number;
  timeoutId: ReturnType<typeof setTimeout>;
};
const timers = new Map<string, TimerEntry>();

function emit() {
  for (const listener of listeners) listener();
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getSnapshot(): ToastItem[] {
  return items;
}

function arm(id: string, remainingMs: number) {
  const timeoutId = setTimeout(() => expireToast(id), remainingMs);
  timers.set(id, { remainingMs, resumedAt: Date.now(), timeoutId });
}

let nextId = 0;

function push(variant: ToastVariant, message: string, duration?: number): string {
  const id = `toast-${Date.now()}-${nextId++}`;
  const resolvedDuration = duration ?? DEFAULT_DURATION[variant];
  items = [...items, { id, variant, message, duration: resolvedDuration, exiting: false }];
  arm(id, resolvedDuration);
  emit();
  return id;
}

// Starts the exit animation (called by the auto-dismiss timer, or by the
// user clicking the dismiss button) — does not remove the item yet.
export function expireToast(id: string): void {
  const entry = timers.get(id);
  if (entry) {
    clearTimeout(entry.timeoutId);
    timers.delete(id);
  }
  items = items.map((t) => (t.id === id ? { ...t, exiting: true } : t));
  emit();
}

// Actually removes the item — called once the exit animation finishes.
export function removeToast(id: string): void {
  items = items.filter((t) => t.id !== id);
  emit();
}

// Hovering (or focusing, for keyboard users) a toast pauses its own dismiss
// timer only — every other toast in the stack keeps counting down.
export function pauseToast(id: string): void {
  const entry = timers.get(id);
  if (!entry) return;
  clearTimeout(entry.timeoutId);
  timers.set(id, {
    ...entry,
    remainingMs: Math.max(0, entry.remainingMs - (Date.now() - entry.resumedAt)),
  });
}

export function resumeToast(id: string): void {
  const entry = timers.get(id);
  if (!entry) return;
  arm(id, entry.remainingMs);
}

function makeVariant(variant: ToastVariant) {
  return (message: string, opts?: { duration?: number }) => push(variant, message, opts?.duration);
}

// Same call shape every existing `toast.success(msg)` / `toast.error(msg)`
// site already uses — only the import path changes.
export const toast = {
  success: makeVariant("success"),
  error: makeVariant("error"),
  info: makeVariant("info"),
  warning: makeVariant("warning"),
};
