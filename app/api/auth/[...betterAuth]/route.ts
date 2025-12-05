import { nextJsHandler } from "@convex-dev/better-auth/nextjs";

const handler = nextJsHandler({
  convexSiteUrl:
    process.env.NEXT_PUBLIC_CONVEX_SITE_URL || process.env.SITE_URL,
});

export const GET = handler.GET;
export const POST = handler.POST;
