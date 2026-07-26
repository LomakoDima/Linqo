import * as React from "react";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(
      // rounded-md resolves to exactly half this box's width in this app's
      // token scale (--radius-md), which renders as a full circle rather
      // than a rounded square — a fixed radius keeps it reading as a
      // checkbox, not a radio button.
      "peer h-5 w-5 shrink-0 rounded-[6px] border border-input bg-background/50 backdrop-blur-sm shadow-sm cursor-pointer transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:border-primary/50 hover:bg-primary/5 hover:shadow-md active:scale-[0.98] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/10 focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:border-primary data-[state=checked]:text-primary-foreground data-[state=checked]:shadow-md data-[state=checked]:shadow-primary/30 data-[state=checked]:animate-checkbox-box-pop flex items-center justify-center",
      className,
    )}
    {...props}
  >
    <CheckboxPrimitive.Indicator
      className={cn("animate-check-pop flex items-center justify-center text-current")}
    >
      <Check className="h-3.5 w-3.5 stroke-[3px]" />
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
));
Checkbox.displayName = CheckboxPrimitive.Root.displayName;

export { Checkbox };
