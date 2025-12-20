"use client";

import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react";
import { ConvexReactClient } from "convex/react";
import { ReactNode } from "react";

import { authClient } from "@/lib/auth-client";

const convexUrl =
  process.env.NEXT_PUBLIC_CONVEX_URL || "https://brilliant-ferret-250.convex.cloud";
const convex = new ConvexReactClient(convexUrl, { expectAuth: true });

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  return (
    <ConvexBetterAuthProvider client={convex} authClient={authClient}>
      {children}
    </ConvexBetterAuthProvider>
  );
}
