import { nextJsHandler } from "@convex-dev/better-auth/nextjs";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.SITE_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

// Prefer explicit Convex site URL; fall back to Convex cloud URL but rewrite to `.site`
const rawConvexUrl =
  process.env.NEXT_PUBLIC_CONVEX_SITE_URL ||
  process.env.CONVEX_SITE_URL ||
  process.env.NEXT_PUBLIC_CONVEX_URL;

const convexSiteUrl = rawConvexUrl?.includes(".convex.cloud")
  ? rawConvexUrl.replace(".convex.cloud", ".convex.site")
  : rawConvexUrl;

if (!convexSiteUrl) {
  // Fail fast with a clear message rather than looping to the app host
  throw new Error(
    "Missing Convex site URL. Set NEXT_PUBLIC_CONVEX_SITE_URL or CONVEX_SITE_URL to your Convex deployment (e.g. https://brilliant-ferret-250.convex.site)."
  );
}

const handler = nextJsHandler({
  convexSiteUrl,
});

export const GET = handler.GET;
export const POST = handler.POST;
