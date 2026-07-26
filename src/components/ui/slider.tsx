import * as React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";

import { cn } from "@/lib/utils";

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    className={cn(
      "relative flex w-full touch-none select-none items-center cursor-pointer",
      className,
    )}
    {...props}
  >
    <SliderPrimitive.Track className="relative h-2 w-full grow overflow-hidden rounded-full bg-primary/10 shadow-[inset_0_1px_2px_rgba(0,0,0,0.12)]">
      <SliderPrimitive.Range className="absolute h-full rounded-full bg-gradient-to-r from-primary/70 to-primary" />
    </SliderPrimitive.Track>
    <SliderPrimitive.Thumb className="block h-5 w-5 rounded-full border-2 border-primary bg-background shadow-md ring-4 ring-primary/10 cursor-grab active:cursor-grabbing transition-all duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] hover:scale-110 hover:ring-primary/20 active:scale-105 active:ring-primary/25 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/25 disabled:pointer-events-none disabled:opacity-50" />
  </SliderPrimitive.Root>
));
Slider.displayName = SliderPrimitive.Root.displayName;

export { Slider };
