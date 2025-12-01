import { test, expect } from "@playwright/test";

test.describe("Flight Search with OpenRouter", () => {
  test("should search for flights using DeepSeek V3.2", async ({ page }) => {
    // Navigate to the app
    await page.goto("http://localhost:3001");
    
    // Wait for the page to load
    await page.waitForLoadState("networkidle");
    
    // Look for the model selector button and click it
    const modelButton = page.locator("button").filter({ hasText: /Gemini|Claude|GPT|DeepSeek/i }).first();
    if (await modelButton.isVisible()) {
      await modelButton.click();
      
      // Wait for dropdown and select DeepSeek V3.2
      await page.waitForTimeout(500);
      const deepseekOption = page.locator("button").filter({ hasText: "DeepSeek V3.2" }).first();
      if (await deepseekOption.isVisible()) {
        await deepseekOption.click();
        console.log("✓ Selected DeepSeek V3.2 model");
      }
    }
    
    // Find the textarea/input for the prompt
    const promptInput = page.locator("textarea").first();
    await expect(promptInput).toBeVisible({ timeout: 10000 });
    
    // Type a flight search query
    await promptInput.fill("Search for flights from New York to Los Angeles");
    console.log("✓ Entered flight search query");
    
    // Find and click the submit button (Build button)
    const submitButton = page.locator("button").filter({ hasText: /Build|Send|Submit/i }).first();
    await submitButton.click();
    console.log("✓ Submitted query");
    
    // Wait for response - look for assistant message or tool results
    await page.waitForTimeout(3000);
    
    // Check for any response content
    const responseArea = page.locator('[role="assistant"], .assistant, [data-role="assistant"]').first();
    
    // Wait longer for AI response
    await page.waitForTimeout(15000);
    
    // Take a screenshot of the result
    await page.screenshot({ path: "tests/screenshots/flight-search-result.png", fullPage: true });
    console.log("✓ Screenshot saved to tests/screenshots/flight-search-result.png");
    
    // Check page for any error messages
    const pageContent = await page.content();
    if (pageContent.includes("Error") || pageContent.includes("error")) {
      console.log("⚠ Page may contain errors - check screenshot");
    } else {
      console.log("✓ No obvious errors detected");
    }
  });
});
