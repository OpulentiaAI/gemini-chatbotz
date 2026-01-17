"use client";

import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";
import { TextShimmer } from "@/components/prompt-kit/text-shimmer";

export type LoaderVariant =
  | "circular"
  | "classic"
  | "pulse"
  | "pulse-dot"
  | "dots"
  | "typing"
  | "wave"
  | "bars"
  | "terminal"
  | "text-blink"
  | "text-shimmer"
  | "loading-dots";

export type LoaderSize = "sm" | "md" | "lg";

type LoaderSizeConfig = {
  spinner: number;
  dot: number;
  barWidth: number;
  barHeight: number;
  gap: number;
  textClassName: string;
};

const SIZE_MAP: Record<LoaderSize, LoaderSizeConfig> = {
  sm: {
    spinner: 12,
    dot: 4,
    barWidth: 2,
    barHeight: 10,
    gap: 4,
    textClassName: "text-xs",
  },
  md: {
    spinner: 16,
    dot: 5,
    barWidth: 2,
    barHeight: 14,
    gap: 5,
    textClassName: "text-sm",
  },
  lg: {
    spinner: 20,
    dot: 6,
    barWidth: 3,
    barHeight: 18,
    gap: 6,
    textClassName: "text-base",
  },
};

export type LoaderProps = HTMLAttributes<HTMLDivElement> & {
  variant?: LoaderVariant;
  size?: LoaderSize;
  text?: string;
};

const getLabel = (text?: string) => text ?? "Loading...";

const Dots = ({
  count,
  dotSize,
  gap,
}: {
  count: number;
  dotSize: number;
  gap: number;
}) => (
  <span className="inline-flex items-center" style={{ gap }}>
    {Array.from({ length: count }).map((_, index) => (
      <span
        key={`dot-${index}`}
        className="inline-block rounded-full bg-current"
        style={{
          width: dotSize,
          height: dotSize,
          animation: "loader-dot 1s ease-in-out infinite",
          animationDelay: `${index * 0.15}s`,
        }}
      />
    ))}
  </span>
);

const Wave = ({
  count,
  barWidth,
  barHeight,
  gap,
}: {
  count: number;
  barWidth: number;
  barHeight: number;
  gap: number;
}) => (
  <span className="inline-flex items-end" style={{ gap }}>
    {Array.from({ length: count }).map((_, index) => (
      <span
        key={`wave-${index}`}
        className="inline-block rounded-full bg-current"
        style={{
          width: barWidth,
          height: barHeight,
          animation: "loader-wave 1s ease-in-out infinite",
          animationDelay: `${index * 0.12}s`,
          transformOrigin: "bottom",
        }}
      />
    ))}
  </span>
);

export const Loader = ({
  variant = "circular",
  size = "md",
  text,
  className,
  ...props
}: LoaderProps) => {
  const config = SIZE_MAP[size];
  const label = getLabel(text);
  const textClasses = cn("text-muted-foreground", config.textClassName);

  const renderContent = () => {
    switch (variant) {
      case "wave":
      case "bars":
        return (
          <div className="inline-flex items-center gap-2">
            <Wave
              count={5}
              barWidth={config.barWidth}
              barHeight={config.barHeight}
              gap={config.gap}
            />
            {text ? <span className={textClasses}>{label}</span> : null}
          </div>
        );
      case "dots":
      case "typing":
      case "pulse-dot":
        return (
          <div className="inline-flex items-center gap-2">
            <Dots count={3} dotSize={config.dot} gap={config.gap} />
            {text ? <span className={textClasses}>{label}</span> : null}
          </div>
        );
      case "pulse":
        return (
          <div className="inline-flex items-center gap-2">
            <span
              className="inline-block rounded-full bg-current"
              style={{
                width: config.dot,
                height: config.dot,
                animation: "loader-pulse 1.2s ease-in-out infinite",
              }}
            />
            {text ? <span className={textClasses}>{label}</span> : null}
          </div>
        );
      case "terminal":
        return (
          <div className="inline-flex items-center gap-2">
            <span
              className="inline-block rounded-sm bg-current"
              style={{
                width: Math.max(config.barWidth * 2, 4),
                height: Math.max(config.barHeight - 2, 8),
                animation: "loader-blink 1s steps(2, end) infinite",
              }}
            />
            {text ? <span className={textClasses}>{label}</span> : null}
          </div>
        );
      case "text-shimmer":
        return <TextShimmer className={textClasses}>{label}</TextShimmer>;
      case "text-blink":
        return (
          <span
            className={cn(textClasses, "animate-[loader-blink_1s_steps(2,end)_infinite]")}
          >
            {label}
          </span>
        );
      case "loading-dots":
        return (
          <span className={cn(textClasses, "inline-flex items-center")}>
            {label}
            <span className="ml-1 inline-flex items-center">
              <Dots count={3} dotSize={config.dot} gap={config.gap} />
            </span>
          </span>
        );
      case "circular":
      case "classic":
      default:
        return (
          <div className="inline-flex items-center gap-2">
            <span
              className="inline-block rounded-full border-2 border-current border-t-transparent animate-spin"
              style={{
                width: config.spinner,
                height: config.spinner,
              }}
            />
            {text ? <span className={textClasses}>{label}</span> : null}
          </div>
        );
    }
  };

  return (
    <div className={cn("inline-flex items-center", className)} {...props}>
      {renderContent()}
    </div>
  );
};
