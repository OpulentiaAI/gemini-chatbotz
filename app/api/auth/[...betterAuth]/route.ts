import { nextJsHandler } from "@convex-dev/better-auth/nextjs";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.SITE_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

const handler = nextJsHandler({
  convexSiteUrl:
    process.env.NEXT_PUBLIC_CONVEX_SITE_URL ||
    process.env.CONVEX_SITE_URL ||
    siteUrl,
});

export const GET = handler.GET;
export const POST = handler.POST;
