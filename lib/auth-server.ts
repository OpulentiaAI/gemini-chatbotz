import { convexBetterAuthNextJs } from "@convex-dev/better-auth/nextjs";

if (!process.env.BETTER_AUTH_SECRET && process.env.AUTH_SECRET) {
  process.env.BETTER_AUTH_SECRET = process.env.AUTH_SECRET;
}

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL || process.env.CONVEX_URL;

// Prefer explicit Convex site URL; fall back to Convex cloud URL but rewrite to `.site`.
const rawConvexSiteUrl =
  process.env.NEXT_PUBLIC_CONVEX_SITE_URL || process.env.CONVEX_SITE_URL || convexUrl;

if (!convexUrl) {
  throw new Error("Missing Convex URL. Set NEXT_PUBLIC_CONVEX_URL or CONVEX_URL.");
}

if (!rawConvexSiteUrl) {
  throw new Error(
    "Missing Convex site URL. Set NEXT_PUBLIC_CONVEX_SITE_URL, CONVEX_SITE_URL, or NEXT_PUBLIC_CONVEX_URL."
  );
}

const convexSiteUrl = rawConvexSiteUrl.includes(".convex.cloud")
  ? rawConvexSiteUrl.replace(".convex.cloud", ".convex.site")
  : rawConvexSiteUrl;

export const {
  handler,
  getToken,
  isAuthenticated,
  fetchAuthQuery,
  fetchAuthMutation,
  fetchAuthAction,
} = convexBetterAuthNextJs({
  convexUrl,
  convexSiteUrl,
});
