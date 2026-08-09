import { useSyncExternalStore } from "react";
import { subscribe, getSnapshot } from "./store";
import { Toast } from "./Toast";

// Mounted once at the app root (see routes/__root.tsx). New toasts append to
// the end of the list — with flex-col in a bottom-anchored stack that means
// the newest lands closest to the corner and pushes older ones up, never the
// other way around.
export function ToastViewport() {
  const items = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  return (
    <ol
      aria-live="polite"
      aria-label="Notifications"
      className="pointer-events-none fixed bottom-4 right-4 z-[100] flex flex-col gap-2"
    >
      {items.map((item) => (
        <Toast key={item.id} item={item} />
      ))}
    </ol>
  );
}
