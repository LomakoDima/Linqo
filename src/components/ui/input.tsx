import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-lg border border-input bg-background/50 backdrop-blur-sm px-3.5 py-2 text-sm placeholder:text-muted-foreground/60 transition-all duration-200 hover:border-muted-foreground/35 hover:bg-background/80 focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/10 focus-visible:bg-background focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
