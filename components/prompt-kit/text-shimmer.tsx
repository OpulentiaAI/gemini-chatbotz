"use client";

import type { ElementType, HTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils";

export type TextShimmerProps = {
  as?: ElementType;
  duration?: number;
  spread?: number;
  children: ReactNode;
} & HTMLAttributes<HTMLElement>;

export function TextShimmer({
  as = "span",
  className,
  duration = 4,
  spread = 20,
  children,
  ...props
}: TextShimmerProps) {
  const dynamicSpread = Math.min(Math.max(spread, 5), 45);
  const Component = as as ElementType;

  return (
    <Component
      className={cn(
        "bg-size-[200%_auto] bg-clip-text font-medium text-transparent",
        "animate-[shimmer_4s_infinite_linear]",
        className
      )}
      style={{
        backgroundImage: `linear-gradient(to right, hsl(var(--muted-foreground)) ${50 - dynamicSpread}%, hsl(var(--foreground)) 50%, hsl(var(--muted-foreground)) ${50 + dynamicSpread}%)`,
        animationDuration: `${duration}s`,
      }}
      {...props}
    >
      {children}
    </Component>
  );
}
