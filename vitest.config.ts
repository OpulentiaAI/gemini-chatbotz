import { defineConfig } from "vitest/config";
import playwright from "@playwright/test";

export default defineConfig({
  test: {
    include: ["convex/**/*.spec.ts", "tests/**/*.spec.ts"],
    globals: true,
  },
});
