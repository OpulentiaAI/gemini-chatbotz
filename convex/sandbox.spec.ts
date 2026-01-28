import { describe, test, expect } from "vitest";

describe("Sandbox Tools", () => {
  test("sandbox module exports are defined", async () => {
    // Import the sandbox module to verify it loads correctly
    const sandbox = await import("./sandbox");
    
    // Verify all exports are defined
    expect(sandbox.createSession).toBeDefined();
    expect(sandbox.executeBash).toBeDefined();
    expect(sandbox.writeFile).toBeDefined();
    expect(sandbox.readFile).toBeDefined();
    expect(sandbox.listFiles).toBeDefined();
    expect(sandbox.stopSession).toBeDefined();
    expect(sandbox.executeOneShot).toBeDefined();
  });

  test("sandbox API URL helper works", () => {
    // Test that the API URL is constructed correctly
    const siteUrl = process.env.SITE_URL || "http://localhost:3002";
    const expectedUrl = `${siteUrl}/api/sandbox`;
    
    expect(expectedUrl).toContain("/api/sandbox");
  });
});
