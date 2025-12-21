"use client";

import { usePaginatedQuery } from "convex-helpers/react";
import { useMemo } from "react";
import type { FunctionReference, FunctionArgs } from "convex/server";

type UIMessagesQuery = FunctionReference<
  "query",
  "public",
  { threadId: string; paginationOpts: any; streamArgs?: any },
  any
>;

interface UIMessagesOptions {
  initialNumItems: number;
  stream?: boolean;
  skipStreamIds?: string[];
}

interface UIMessagesResult {
  results: any[];
  status: "LoadingFirstPage" | "LoadingMore" | "CanLoadMore" | "Exhausted";
  loadMore: (numItems: number) => void;
  isLoading: boolean;
}

/**
 * A safe wrapper around useUIMessages that handles the case when 
 * the underlying usePaginatedQuery returns undefined.
 * 
 * This is a workaround for a bug in @convex-dev/agent where
 * paginated.results is accessed before checking if paginated is defined.
 */
export function useSafeUIMessages<Q extends UIMessagesQuery>(
  query: Q,
  args: FunctionArgs<Q> | "skip",
  options: UIMessagesOptions
): UIMessagesResult {
  const skip = args === "skip";
  
  // Use the paginated query directly with safe defaults
  const paginated = usePaginatedQuery(
    query,
    skip ? "skip" : args,
    { initialNumItems: options.initialNumItems }
  );

  // Safely extract results with defaults
  const results = useMemo(() => {
    if (!paginated) return [];
    if (!paginated.results) return [];
    return paginated.results;
  }, [paginated]);

  const status = paginated?.status ?? "LoadingFirstPage";
  const loadMore = paginated?.loadMore ?? (() => {});
  const isLoading = paginated?.isLoading ?? true;

  return {
    results,
    status,
    loadMore,
    isLoading,
  };
}
