import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Rocket } from "lucide-react";
import { AnimatedWordmark } from "@/components/AnimatedWordmark";
import { useAuth } from "@/lib/auth-context";
import { saveOnboardingAnswers } from "@/lib/auth-client";
import type { ThemeName } from "@/lib/link-store";

export const Route = createFileRoute("/onboarding")({
  head: () => ({ meta: [{ title: "Quick setup — Linqo" }] }),
  component: OnboardingPage,
});

const SUGGESTED_THEME_KEY = "linqo_suggested_theme";

type Question = {
  key: string;
  question: string;
  options: { label: string; value: string }[];
};

const QUESTIONS: Question[] = [
  {
    key: "purpose",
    question: "What are you building a page for?",
    options: [
      { label: "Creator or influencer", value: "creator" },
      { label: "Business or brand", value: "business" },
      { label: "Personal or portfolio", value: "personal" },
      { label: "Community or event", value: "community" },
    ],
  },
  {
    key: "vibe",
    question: "Pick a vibe for your page",
    options: [
      { label: "Bold & dark", value: "dark" },
      { label: "Warm & sunny", value: "sunset" },
      { label: "Calm & minimal", value: "light" },
      { label: "Playful & colorful", value: "candy" },
    ],
  },
  {
    key: "linkCount",
    question: "How many links will you add?",
    options: [
      { label: "Just one or two", value: "few" },
      { label: "A handful (3–6)", value: "some" },
      { label: "Lots (7+)", value: "many" },
    ],
  },
];

function OnboardingPage() {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/login" });
  }, [authLoading, user, navigate]);

  function finish(finalAnswers: Record<string, string>) {
    if (Object.keys(finalAnswers).length > 0) {
      void saveOnboardingAnswers(finalAnswers);
    }
    // The "vibe" question's option values are hand-picked ThemeName strings
    // (see QUESTIONS above) — safe to treat as one here.
    const vibe = finalAnswers.vibe as ThemeName | undefined;
    if (vibe) {
      sessionStorage.setItem(SUGGESTED_THEME_KEY, vibe);
    }
    navigate({ to: "/build" });
  }

  function choose(value: string) {
    const next = { ...answers, [QUESTIONS[step].key]: value };
    setAnswers(next);
    if (step === QUESTIONS.length - 1) {
      finish(next);
    } else {
      setStep(step + 1);
    }
  }

  if (authLoading || !user) return null;

  const current = QUESTIONS[step];

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background p-3 sm:p-6">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,black,transparent_80%)]"
        style={{
          backgroundImage: "radial-gradient(currentColor 1px, transparent 1px)",
          backgroundSize: "24px 24px",
          color: "var(--color-foreground)",
          opacity: 0.05,
        }}
      />

      <div className="relative z-10 w-full max-w-md animate-fade-in rounded-[28px] border border-border bg-card p-8 shadow-2xl sm:p-10">
        <div className="flex items-center justify-between">
          <div className="inline-flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
              <Rocket className="h-4 w-4" />
            </div>
            <AnimatedWordmark text="Linqo." className="text-lg font-semibold tracking-tight" />
          </div>
          <button
            type="button"
            onClick={() => finish(answers)}
            className="cursor-pointer text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Skip
          </button>
        </div>

        <div className="mt-6 flex items-center gap-1.5">
          {QUESTIONS.map((q, i) => (
            <span
              key={q.key}
              className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${
                i <= step ? "bg-primary" : "bg-muted"
              }`}
            />
          ))}
        </div>

        <div key={step} className="animate-swap-in mt-6">
          {step > 0 && (
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              className="-ml-1.5 mb-4 flex cursor-pointer items-center gap-1.5 rounded-md px-1.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back
            </button>
          )}
          <h1 className="text-xl font-semibold tracking-tight">{current.question}</h1>
          <div className="mt-5 flex flex-col gap-2.5">
            {current.options.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => choose(option.value)}
                className="w-full cursor-pointer rounded-xl border border-input bg-background/50 px-4 py-3 text-left text-sm font-medium shadow-sm backdrop-blur-sm transition-all duration-200 hover:border-primary/40 hover:bg-muted/50 active:scale-[0.98]"
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
