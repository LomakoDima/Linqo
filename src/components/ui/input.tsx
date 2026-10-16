import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-ui border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground/70 transition-[border-color,box-shadow] duration-150 hover:border-foreground/40 focus-visible:border-foreground focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none aria-[invalid=true]:border-destructive aria-[invalid=true]:ring-destructive/20 disabled:cursor-not-allowed disabled:opacity-50",
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
