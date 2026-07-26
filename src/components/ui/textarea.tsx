import * as React from "react";

import { cn } from "@/lib/utils";

const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<"textarea">>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[80px] w-full rounded-lg border border-input bg-background/50 backdrop-blur-sm px-3.5 py-2.5 text-sm placeholder:text-muted-foreground/60 transition-all duration-200 hover:border-muted-foreground/35 hover:bg-background/80 focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/10 focus-visible:bg-background focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Textarea.displayName = "Textarea";

export { Textarea };
