import { Sparkles, Check, AlertTriangle } from "lucide-react";
import { SectionCard } from "@/components/ui/section-card";
import { Progress } from "@/components/ui/progress";
import { computeProfileCompletion } from "@/lib/profile-completion";
import type { Profile } from "@/lib/link-store";

// The itemized breakdown behind the hero's inline "%" pill — one shared
// computeProfileCompletion() call, no duplicated logic between the two.
export function CompletionCard({ profile }: { profile: Profile }) {
  const { items, percent } = computeProfileCompletion(profile);
  const complete = percent === 100;

  return (
    <SectionCard
      icon={Sparkles}
      title="Profile Completion"
      description={complete ? "Your profile is all set." : `${percent}% complete`}
      defaultOpen={!complete}
    >
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">Progress</span>
          <span className="tabular-nums text-muted-foreground">{percent}%</span>
        </div>
        <Progress value={percent} />
      </div>

      {complete ? (
        <p className="flex items-center gap-2 rounded-lg bg-emerald-500/10 px-3 py-2.5 text-sm font-medium text-emerald-600">
          <Sparkles className="h-4 w-4 shrink-0" /> Your profile looks amazing.
        </p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.key} className="flex items-center gap-2.5 text-sm">
              {item.done ? (
                <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-emerald-500/15 text-emerald-600">
                  <Check className="h-3 w-3" />
                </span>
              ) : (
                <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-amber-500/15 text-amber-600">
                  <AlertTriangle className="h-3 w-3" />
                </span>
              )}
              <span className={item.done ? "text-foreground" : "text-muted-foreground"}>
                {item.label}
                {!item.done && " missing"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}
