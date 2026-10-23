import { Check, ChevronDown } from "lucide-react";
import { computeProfileCompletion } from "@/lib/profile-completion";
import type { Profile } from "@/lib/link-store";

export function CompletionCard({ profile }: { profile: Profile }) {
  const { items } = computeProfileCompletion(profile);
  const completed = items.filter((item) => item.done).length;
  return (
    <details className="group border-t border-border text-sm">
      <summary className="flex cursor-pointer list-none items-center gap-2 rounded-ui py-3 text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
        <span>Profile checklist</span>
        <span className="ml-auto tabular-nums">
          {completed}/{items.length}
        </span>
        <ChevronDown className="h-4 w-4 transition-transform duration-150 group-open:rotate-180" />
      </summary>
      <ul className="flex flex-wrap gap-x-5 gap-y-2 pb-3">
        {items.map((item) => (
          <li
            key={item.key}
            className={`flex items-center gap-1.5 ${item.done ? "text-foreground" : "text-muted-foreground"}`}
          >
            {item.done ? (
              <Check aria-label="Complete" className="h-3.5 w-3.5" />
            ) : (
              <span aria-label="Missing" className="h-3 w-3 rounded-full border border-border" />
            )}
            {item.label}
          </li>
        ))}
      </ul>
    </details>
  );
}
