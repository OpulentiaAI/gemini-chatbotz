import { createAuthClient } from "better-auth/react";
import { convexClient } from "@convex-dev/better-auth/client/plugins";

export const authClient = createAuthClient({
  plugins: [convexClient()],
});

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const ensureConvexToken = async ({
  retries = 2,
  delayMs = 250,
}: {
  retries?: number;
  delayMs?: number;
} = {}) => {
  let lastError: unknown = null;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await authClient.convex.token();
      const token = response?.data?.token;
      if (token) {
        return token;
      }
    } catch (error) {
      lastError = error;
    }

    if (attempt < retries) {
      await sleep(delayMs);
    }
  }

  if (lastError instanceof Error) {
    throw lastError;
  }

  throw new Error("Failed to fetch Convex token.");
};
