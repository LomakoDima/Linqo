import type { ReactNode } from "react";

// Every builder panel follows the same heading rhythm as the template library.
export function BuilderSectionHeader({
  label,
  title,
  children,
}: {
  label: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0 max-w-2xl">
      <p className="eyebrow">{label}</p>
      <h2 className="font-display mt-3 break-words text-3xl font-medium leading-tight sm:text-4xl">
        {title}
      </h2>
      <p className="mt-3 text-muted-foreground">{children}</p>
    </div>
  );
}
