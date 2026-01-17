"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { TextShimmer } from "@/components/prompt-kit/text-shimmer";
import { Loader } from "@/components/prompt-kit/loader";

export function ThinkingMessage({ className }: { className?: string }) {
  return (
    <motion.div
      className={cn(
        "flex items-center gap-3 px-4 py-3 max-w-[600px]",
        className
      )}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
    >
      <Loader variant="wave" size="sm" className="text-chocolate-500" />
      <TextShimmer className="text-sm">Thinking...</TextShimmer>
    </motion.div>
  );
}

export function StreamingIndicator({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <TextShimmer className="text-xs font-normal" duration={2}>
        Streaming
      </TextShimmer>
      <motion.span
        className="inline-block w-2 h-4 bg-chocolate-500 rounded-sm"
        animate={{ opacity: [1, 0] }}
        transition={{
          duration: 0.8,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
    </span>
  );
}
