import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const gradientHeadingVariants = cva(
  "bg-clip-text text-transparent bg-gradient-to-b tracking-tight",
  {
    variants: {
      variant: {
        default: "from-foreground to-foreground/70",
        pink: "from-pink-500 to-violet-500",
        light: "from-foreground/80 to-foreground/60",
        dark: "from-black to-neutral-700 dark:from-white dark:to-neutral-400",
        chocolate: "from-chocolate-600 to-chocolate-800 dark:from-chocolate-300 dark:to-chocolate-500",
      },
      size: {
        default: "text-2xl md:text-3xl",
        xxs: "text-base",
        xs: "text-lg",
        sm: "text-xl md:text-2xl",
        md: "text-2xl md:text-3xl",
        lg: "text-3xl md:text-4xl",
        xl: "text-4xl md:text-5xl lg:text-6xl",
        xxl: "text-5xl md:text-6xl lg:text-7xl",
      },
      weight: {
        default: "font-semibold",
        thin: "font-thin",
        base: "font-base",
        semi: "font-semibold",
        bold: "font-bold",
        black: "font-black",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      weight: "default",
    },
  }
);

export interface GradientHeadingProps
  extends React.HTMLAttributes<HTMLHeadingElement>,
    VariantProps<typeof gradientHeadingVariants> {
  as?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "p" | "span";
}

const GradientHeading = React.forwardRef<HTMLHeadingElement, GradientHeadingProps>(
  ({ className, variant, size, weight, as: Comp = "h1", ...props }, ref) => {
    return (
      <Comp
        ref={ref}
        className={cn(gradientHeadingVariants({ variant, size, weight, className }))}
        {...props}
      />
    );
  }
);

GradientHeading.displayName = "GradientHeading";

export { GradientHeading, gradientHeadingVariants };
