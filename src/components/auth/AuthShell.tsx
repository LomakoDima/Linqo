import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { BrandMark } from "@/components/brand/BrandMark";
import { ThemeToggle } from "@/components/ThemeToggle";

// Shared frame for every account-entry screen (sign in / sign up / reset).
// One column on phones and tablets; with an `aside`, a second ink-coloured
// column shows the real product from lg up — it never stacks under the form
// on small screens, where the form is the whole point of the page.
export function AuthShell({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="min-h-dvh bg-background text-foreground lg:grid lg:grid-cols-12">
      <div
        className={`flex min-h-dvh flex-col px-4 py-4 sm:px-8 ${
          aside ? "lg:col-span-6 xl:col-span-5" : "lg:col-span-12"
        }`}
      >
        <header className="flex h-10 items-center justify-between">
          <BrandMark />
          <ThemeToggle />
        </header>
        <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">
          {children}
        </main>
        <footer>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 rounded-ui text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> Back to linqo
          </Link>
        </footer>
      </div>
      {aside && (
        <aside className="hidden items-center justify-center overflow-hidden bg-[oklch(0.17_0.008_60)] p-10 dark:border-l dark:border-border dark:bg-[oklch(0.2_0.01_60)] text-[oklch(0.95_0.008_85)] lg:col-span-6 lg:flex xl:col-span-7">
          {aside}
        </aside>
      )}
    </div>
  );
}
