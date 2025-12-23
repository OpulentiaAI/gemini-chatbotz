/**
 * Comprehensive Chat Application Browser Test
 * Tests authentication flow, chat interface, and message functionality
 */

import { Stagehand } from "@browserbasehq/stagehand";
import { z } from "zod";
import fs from "fs";
import path from "path";

const BASE_URL = "http://localhost:3000";
const SCREENSHOTS_DIR = path.join(process.cwd(), "test-screenshots");

// Ensure screenshots directory exists
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

// Test configuration
const TEST_USER = {
  name: "Browser Test",
  email: "browsertest@example.com",
  password: "TestPassword123!",
};

async function captureScreenshot(stagehand, name) {
  const screenshotPath = path.join(SCREENSHOTS_DIR, `${name}.png`);
  await stagehand.page.screenshot({ path: screenshotPath, fullPage: true });
  console.log(`📸 Screenshot saved: ${screenshotPath}`);
  return screenshotPath;
}

async function checkConsoleErrors(page) {
  const errors = [];
  const warnings = [];

  page.on("console", (msg) => {
    const type = msg.type();
    const text = msg.text();

    if (type === "error") {
      errors.push(text);
      console.log(`❌ Console Error: ${text}`);
    } else if (type === "warning") {
      warnings.push(text);
      console.log(`⚠️  Console Warning: ${text}`);
    }
  });

  page.on("pageerror", (error) => {
    errors.push(error.message);
    console.log(`💥 Page Error: ${error.message}`);
  });

  page.on("response", (response) => {
    if (response.status() >= 500) {
      errors.push(`HTTP ${response.status()} error on ${response.url()}`);
      console.log(`🚨 Server Error: ${response.status()} - ${response.url()}`);
    }
  });

  return { errors, warnings };
}

async function runTests() {
  console.log("🚀 Starting Chat Application Browser Tests\n");

  const stagehand = new Stagehand({
    env: "LOCAL",
    verbose: 1,
    debugDom: true,
    headless: false, // Set to true for CI/CD
  });

  const testResults = {
    homePageLoad: { success: false, errors: [] },
    consoleErrors: { errors: [], warnings: [] },
    loginPageLoad: { success: false, errors: [] },
    userRegistration: { success: false, errors: [] },
    authFlow: { success: false, errors: [] },
    chatInterfaceVisible: { success: false, errors: [] },
    messageSend: { success: false, errors: [] },
    messageDisplay: { success: false, errors: [] },
    screenshots: [],
  };

  try {
    await stagehand.init();
    console.log("✅ Stagehand initialized\n");

    // Set up console error monitoring
    const errorMonitoring = checkConsoleErrors(stagehand.page);

    // ========================================
    // TEST 1: Home Page Load
    // ========================================
    console.log("📋 TEST 1: Home Page Load");
    console.log("─────────────────────────");

    try {
      await stagehand.page.goto(BASE_URL, {
        waitUntil: "networkidle",
        timeout: 30000
      });

      // Wait for page to be fully loaded
      await stagehand.page.waitForTimeout(2000);

      const screenshot1 = await captureScreenshot(stagehand, "01-home-page-load");
      testResults.screenshots.push(screenshot1);
      testResults.homePageLoad.success = true;
      console.log("✅ Home page loaded successfully\n");
    } catch (error) {
      testResults.homePageLoad.errors.push(error.message);
      console.log(`❌ Home page load failed: ${error.message}\n`);
    }

    // ========================================
    // TEST 2: Check Console Errors
    // ========================================
    console.log("📋 TEST 2: Console Errors Check");
    console.log("─────────────────────────────");

    await stagehand.page.waitForTimeout(3000); // Wait to capture any async errors

    const { errors, warnings } = await errorMonitoring;
    testResults.consoleErrors = { errors, warnings };

    if (errors.length === 0) {
      console.log("✅ No console errors detected\n");
    } else {
      console.log(`❌ Found ${errors.length} console error(s)\n`);
    }

    // ========================================
    // TEST 3: Navigate to Login Page
    // ========================================
    console.log("📋 TEST 3: Navigate to Login Page");
    console.log("───────────────────────────────");

    try {
      // Look for login link or navigate directly
      const loginUrl = `${BASE_URL}/login`;
      await stagehand.page.goto(loginUrl, {
        waitUntil: "networkidle",
        timeout: 30000
      });

      await stagehand.page.waitForTimeout(2000);

      const screenshot2 = await captureScreenshot(stagehand, "02-login-page");
      testResults.screenshots.push(screenshot2);
      testResults.loginPageLoad.success = true;
      console.log("✅ Login page loaded successfully\n");
    } catch (error) {
      testResults.loginPageLoad.errors.push(error.message);
      console.log(`❌ Login page load failed: ${error.message}\n`);
    }

    // ========================================
    // TEST 4: User Registration
    // ========================================
    console.log("📋 TEST 4: User Registration");
    console.log("──────────────────────────");

    try {
      // Look for "Sign up" or "Register" link
      await stagehand.act({
        action: "click on the link to register or sign up for a new account"
      });

      await stagehand.page.waitForTimeout(2000);

      const screenshot3 = await captureScreenshot(stagehand, "03-register-page");
      testResults.screenshots.push(screenshot3);

      // Fill in registration form
      console.log("📝 Filling registration form...");

      await stagehand.act({
        action: `type "${TEST_USER.name}" in the name field`
      });

      await stagehand.act({
        action: `type "${TEST_USER.email}" in the email field`
      });

      await stagehand.act({
        action: `type "${TEST_USER.password}" in the password field`
      });

      const screenshot4 = await captureScreenshot(stagehand, "04-registration-form-filled");
      testResults.screenshots.push(screenshot4);

      // Submit registration
      await stagehand.act({
        action: "click the sign up or register button to create the account"
      });

      await stagehand.page.waitForTimeout(3000);

      const screenshot5 = await captureScreenshot(stagehand, "05-after-registration");
      testResults.screenshots.push(screenshot5);

      testResults.userRegistration.success = true;
      console.log("✅ User registration completed\n");
    } catch (error) {
      testResults.userRegistration.errors.push(error.message);
      console.log(`❌ User registration failed: ${error.message}\n`);

      // Try to continue with login if registration failed (user might already exist)
      console.log("⚠️  Attempting to login with existing credentials...\n");
    }

    // ========================================
    // TEST 5: Verify Auth Flow & Chat Interface
    // ========================================
    console.log("📋 TEST 5: Verify Auth Flow & Chat Interface");
    console.log("──────────────────────────────────────────");

    try {
      // Navigate to home page
      await stagehand.page.goto(BASE_URL, {
        waitUntil: "networkidle",
        timeout: 30000
      });

      await stagehand.page.waitForTimeout(3000);

      const screenshot6 = await captureScreenshot(stagehand, "06-logged-in-home");
      testResults.screenshots.push(screenshot6);

      // Check if chat interface is visible
      const chatInterfaceVisible = await stagehand.observe({
        instruction: "Check if there is a chat interface with a text input for sending messages",
        schema: z.object({
          chatVisible: z.boolean().describe("Whether a chat interface is visible"),
          hasTextInput: z.boolean().describe("Whether there is a text input field"),
          hasSubmitButton: z.boolean().describe("Whether there is a submit or send button"),
        }),
      });

      console.log("Chat interface check:", chatInterfaceVisible);

      if (chatInterfaceVisible.chatVisible) {
        testResults.chatInterfaceVisible.success = true;
        testResults.authFlow.success = true;
        console.log("✅ Chat interface is visible after login\n");
      } else {
        testResults.chatInterfaceVisible.errors.push("Chat interface not visible");
        console.log("❌ Chat interface not visible\n");
      }
    } catch (error) {
      testResults.chatInterfaceVisible.errors.push(error.message);
      testResults.authFlow.errors.push(error.message);
      console.log(`❌ Auth flow verification failed: ${error.message}\n`);
    }

    // ========================================
    // TEST 6: Send Test Message
    // ========================================
    console.log("📋 TEST 6: Send Test Message");
    console.log("──────────────────────────");

    const testMessage = "Hello, this is a test message";

    try {
      // Type message in chat input
      await stagehand.act({
        action: `type "${testMessage}" in the message input field`
      });

      await stagehand.page.waitForTimeout(1000);

      const screenshot7 = await captureScreenshot(stagehand, "07-message-typed");
      testResults.screenshots.push(screenshot7);

      // Submit message
      await stagehand.act({
        action: "click the send button or press enter to send the message"
      });

      await stagehand.page.waitForTimeout(3000);

      const screenshot8 = await captureScreenshot(stagehand, "08-message-sent");
      testResults.screenshots.push(screenshot8);

      testResults.messageSend.success = true;
      console.log("✅ Test message sent successfully\n");
    } catch (error) {
      testResults.messageSend.errors.push(error.message);
      console.log(`❌ Message send failed: ${error.message}\n`);
    }

    // ========================================
    // TEST 7: Verify Message Display
    // ========================================
    console.log("📋 TEST 7: Verify Message Display");
    console.log("────────────────────────────────");

    try {
      // Check if message appears in conversation
      const messageCheck = await stagehand.observe({
        instruction: `Check if the message "${testMessage}" appears in the conversation history`,
        schema: z.object({
          messageVisible: z.boolean().describe("Whether the test message is visible"),
          messageCount: z.number().describe("Number of messages visible in the conversation"),
        }),
      });

      console.log("Message display check:", messageCheck);

      if (messageCheck.messageVisible) {
        testResults.messageDisplay.success = true;
        console.log("✅ Message appears in conversation\n");
      } else {
        testResults.messageDisplay.errors.push("Message not visible in conversation");
        console.log("❌ Message not visible in conversation\n");
      }

      const screenshot9 = await captureScreenshot(stagehand, "09-final-state");
      testResults.screenshots.push(screenshot9);
    } catch (error) {
      testResults.messageDisplay.errors.push(error.message);
      console.log(`❌ Message display verification failed: ${error.message}\n`);
    }

  } catch (error) {
    console.error("💥 Fatal error during tests:", error);
  } finally {
    await stagehand.close();
    console.log("🏁 Stagehand closed\n");
  }

  // ========================================
  // Generate Test Report
  // ========================================
  console.log("\n" + "=".repeat(60));
  console.log("📊 TEST RESULTS SUMMARY");
  console.log("=".repeat(60) + "\n");

  const allTestsPassed =
    testResults.homePageLoad.success &&
    testResults.loginPageLoad.success &&
    testResults.userRegistration.success &&
    testResults.authFlow.success &&
    testResults.chatInterfaceVisible.success &&
    testResults.messageSend.success &&
    testResults.messageDisplay.success &&
    testResults.consoleErrors.errors.length === 0;

  console.log("Home Page Load:", testResults.homePageLoad.success ? "✅ PASS" : "❌ FAIL");
  console.log("Console Errors:", testResults.consoleErrors.errors.length === 0 ? "✅ PASS" : `❌ FAIL (${testResults.consoleErrors.errors.length} errors)`);
  console.log("Login Page Load:", testResults.loginPageLoad.success ? "✅ PASS" : "❌ FAIL");
  console.log("User Registration:", testResults.userRegistration.success ? "✅ PASS" : "❌ FAIL");
  console.log("Auth Flow:", testResults.authFlow.success ? "✅ PASS" : "❌ FAIL");
  console.log("Chat Interface Visible:", testResults.chatInterfaceVisible.success ? "✅ PASS" : "❌ FAIL");
  console.log("Message Send:", testResults.messageSend.success ? "✅ PASS" : "❌ FAIL");
  console.log("Message Display:", testResults.messageDisplay.success ? "✅ PASS" : "❌ FAIL");

  console.log("\n" + "─".repeat(60));
  console.log("Overall Status:", allTestsPassed ? "✅ ALL TESTS PASSED" : "❌ SOME TESTS FAILED");
  console.log("─".repeat(60) + "\n");

  if (testResults.consoleErrors.errors.length > 0) {
    console.log("🚨 Console Errors Found:");
    testResults.consoleErrors.errors.forEach((error, i) => {
      console.log(`   ${i + 1}. ${error}`);
    });
    console.log();
  }

  if (testResults.consoleErrors.warnings.length > 0) {
    console.log("⚠️  Console Warnings Found:");
    testResults.consoleErrors.warnings.forEach((warning, i) => {
      console.log(`   ${i + 1}. ${warning}`);
    });
    console.log();
  }

  console.log(`📸 Screenshots saved to: ${SCREENSHOTS_DIR}`);
  console.log(`   Total screenshots: ${testResults.screenshots.length}\n`);

  // Save JSON report
  const reportPath = path.join(SCREENSHOTS_DIR, "test-report.json");
  fs.writeFileSync(reportPath, JSON.stringify(testResults, null, 2));
  console.log(`📄 Full report saved to: ${reportPath}\n`);

  return testResults;
}

// Run the tests
runTests()
  .then((results) => {
    console.log("✅ Test suite completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Test suite failed:", error);
    process.exit(1);
  });
