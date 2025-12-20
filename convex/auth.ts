import { createClient, type GenericCtx } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import { components } from "./_generated/api";
import { DataModel } from "./_generated/dataModel";
import { query, internalAction } from "./_generated/server";
import { betterAuth } from "better-auth";
import authConfig from "./auth.config";

// SITE_URL must be set in Convex dashboard for Better Auth to work
const siteUrl = process.env.SITE_URL || "http://localhost:3000";

if (!process.env.BETTER_AUTH_SECRET && process.env.AUTH_SECRET) {
  process.env.BETTER_AUTH_SECRET = process.env.AUTH_SECRET;
}

// The component client exposes helper methods for Convex + Better Auth
export const authComponent = createClient<DataModel>(components.betterAuth);

const getJwksMaxAgeDays = () => {
  const raw = process.env.JWKS_MAX_AGE_DAYS;
  if (!raw) {
    return 30;
  }
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    return 30;
  }
  return Math.max(0, parsed);
};

export const createAuth = (ctx: GenericCtx<DataModel>) => {
  return betterAuth({
    baseURL: siteUrl,
    database: authComponent.adapter(ctx),
    // Allow requests from these origins (app hosts and Convex site)
    trustedOrigins: [
      "https://chat.opulentia.ai",
      "https://worldeater.im",
      "http://localhost:3000",
      "https://brilliant-ferret-250.convex.site",
    ],
    // Simple email/password auth without email verification for now
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
    },
    plugins: [
      // Convex compatibility plugin - now requires authConfig for v0.10.x
      // jwksRotateOnTokenGenerationError handles migration from EdDSA to RS256
      convex({ authConfig, jwksRotateOnTokenGenerationError: true }),
    ],
  });
};

// Convenience query to fetch the current user
export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    return authComponent.getAuthUser(ctx);
  },
});

// Internal action to rotate JWKS keys (fixes EdDSA to RS256 migration)
export const rotateKeys = internalAction({
  args: {},
  handler: async (ctx) => {
    const auth = createAuth(ctx);
    return auth.api.rotateKeys();
  },
});

// Rotate JWKS only when the latest key is older than the configured max age.
export const ensureFreshJwks = internalAction({
  args: {},
  handler: async (ctx) => {
    const maxAgeDays = getJwksMaxAgeDays();
    const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;
    const result = await ctx.runQuery(components.betterAuth.adapter.findMany, {
      model: "jwks",
      sortBy: {
        field: "createdAt",
        direction: "desc",
      },
      paginationOpts: {
        cursor: null,
        numItems: 1,
      },
    });
    const latest = result.page?.[0] ?? null;

    if (!latest) {
      const auth = createAuth(ctx);
      await auth.api.rotateKeys();
      return { rotated: true, reason: "missing", maxAgeDays };
    }

    if (maxAgeDays <= 0) {
      return { rotated: false, reason: "disabled", maxAgeDays };
    }

    const ageMs = Date.now() - latest.createdAt;
    if (ageMs >= maxAgeMs) {
      const auth = createAuth(ctx);
      await auth.api.rotateKeys();
      return { rotated: true, reason: "stale", maxAgeDays };
    }

    return { rotated: false, reason: "fresh", maxAgeDays };
  },
});
