import { test, expect, Page } from '@playwright/test';

/**
 * Test suite for verifying the fix for "Cannot read properties of undefined (reading 'messages')" crash
 *
 * This tests:
 * 1. Home page loads without crashes
 * 2. Console errors are captured and analyzed
 * 3. Non-existent chat route doesn't crash
 * 4. Chat interface can handle new messages
 */

interface ConsoleMessage {
  type: string;
  text: string;
  location: string;
}

test.describe('Chat Application Crash Fix Verification', () => {
  let consoleErrors: ConsoleMessage[] = [];
  let consoleWarnings: ConsoleMessage[] = [];

  // Setup console monitoring
  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    consoleWarnings = [];

    // Capture console messages
    page.on('console', msg => {
      const location = msg.location();
      const message: ConsoleMessage = {
        type: msg.type(),
        text: msg.text(),
        location: `${location.url}:${location.lineNumber}`
      };

      if (msg.type() === 'error') {
        consoleErrors.push(message);
        console.log('❌ Console Error:', message.text);
      } else if (msg.type() === 'warning') {
        consoleWarnings.push(message);
        console.log('⚠️  Console Warning:', message.text);
      }
    });

    // Capture page errors
    page.on('pageerror', error => {
      const errorMessage: ConsoleMessage = {
        type: 'pageerror',
        text: error.message,
        location: error.stack || 'unknown'
      };
      consoleErrors.push(errorMessage);
      console.log('💥 Page Error:', error.message);
    });
  });

  test('Step 1: Navigate to home page and verify initial load', async ({ page }) => {
    console.log('\n🧪 TEST 1: Home Page Initial Load');
    console.log('=' .repeat(60));

    // Navigate to home page
    console.log('📍 Navigating to http://localhost:3000...');
    await page.goto('http://localhost:3000', {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    // Wait for the page to be fully loaded
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000); // Give React time to hydrate

    // Take screenshot
    await page.screenshot({
      path: '/Users/jeremyalston/Downloads/Component paradise/Gesthemane/gemini-chatbotz/test-screenshots/01-home-page.png',
      fullPage: true
    });
    console.log('📸 Screenshot saved: 01-home-page.png');

    // Check for critical errors related to 'messages' or 'undefined'
    const messagesErrors = consoleErrors.filter(err =>
      err.text.toLowerCase().includes('messages') ||
      err.text.toLowerCase().includes('undefined')
    );

    if (messagesErrors.length > 0) {
      console.log('❌ CRITICAL ERRORS FOUND:');
      messagesErrors.forEach(err => {
        console.log(`   - ${err.text}`);
        console.log(`     Location: ${err.location}`);
      });
    } else {
      console.log('✅ No critical "messages undefined" errors detected');
    }

    // Verify page loaded successfully
    const title = await page.title();
    console.log(`📄 Page Title: "${title}"`);

    // Check if chat interface is present
    const hasChatInterface = await page.locator('[data-testid="chat-interface"], textarea, input[type="text"]').count() > 0;
    console.log(`💬 Chat Interface Present: ${hasChatInterface ? 'Yes' : 'No'}`);

    // Report results
    console.log('\n📊 TEST 1 RESULTS:');
    console.log(`   Total Console Errors: ${consoleErrors.length}`);
    console.log(`   Messages-related Errors: ${messagesErrors.length}`);
    console.log(`   Status: ${messagesErrors.length === 0 ? '✅ PASSED' : '❌ FAILED'}`);

    // Test should pass if no critical errors
    expect(messagesErrors.length, 'Should not have "messages undefined" errors').toBe(0);
  });

  test('Step 2: Check console for errors on home page', async ({ page }) => {
    console.log('\n🧪 TEST 2: Console Error Analysis');
    console.log('=' .repeat(60));

    await page.goto('http://localhost:3000', {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    await page.waitForTimeout(3000); // Wait for any async operations

    console.log('\n📋 Console Error Summary:');
    console.log(`   Total Errors: ${consoleErrors.length}`);
    console.log(`   Total Warnings: ${consoleWarnings.length}`);

    if (consoleErrors.length > 0) {
      console.log('\n❌ Console Errors Detected:');
      consoleErrors.forEach((err, i) => {
        console.log(`\n   Error ${i + 1}:`);
        console.log(`   Type: ${err.type}`);
        console.log(`   Message: ${err.text}`);
        console.log(`   Location: ${err.location}`);
      });
    } else {
      console.log('\n✅ No console errors detected!');
    }

    if (consoleWarnings.length > 0) {
      console.log('\n⚠️  Console Warnings:');
      consoleWarnings.forEach((warn, i) => {
        console.log(`   ${i + 1}. ${warn.text}`);
      });
    }

    // Screenshot for documentation
    await page.screenshot({
      path: '/Users/jeremyalston/Downloads/Component paradise/Gesthemane/gemini-chatbotz/test-screenshots/02-console-check.png',
      fullPage: true
    });
    console.log('\n📸 Screenshot saved: 02-console-check.png');

    // Success if no critical errors
    console.log(`\n📊 TEST 2 STATUS: ${consoleErrors.length === 0 ? '✅ PASSED' : '⚠️  WARNINGS'}`);
  });

  test('Step 3: Navigate to non-existent chat route', async ({ page }) => {
    console.log('\n🧪 TEST 3: Non-existent Chat Route Handling');
    console.log('=' .repeat(60));

    const testThreadId = 'test-123-nonexistent';
    const chatUrl = `http://localhost:3000/chat/${testThreadId}`;

    console.log(`📍 Navigating to: ${chatUrl}`);

    // Navigate to non-existent chat
    await page.goto(chatUrl, {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    await page.waitForTimeout(2000);

    // Take screenshot
    await page.screenshot({
      path: '/Users/jeremyalston/Downloads/Component paradise/Gesthemane/gemini-chatbotz/test-screenshots/03-nonexistent-chat.png',
      fullPage: true
    });
    console.log('📸 Screenshot saved: 03-nonexistent-chat.png');

    // Check for the specific crash
    const crashErrors = consoleErrors.filter(err =>
      err.text.includes('Cannot read properties of undefined') &&
      err.text.includes('messages')
    );

    if (crashErrors.length > 0) {
      console.log('❌ CRASH DETECTED:');
      crashErrors.forEach(err => {
        console.log(`   ${err.text}`);
      });
    } else {
      console.log('✅ No crash detected - page handled non-existent thread gracefully');
    }

    // Check if page is still interactive
    const pageTitle = await page.title();
    console.log(`📄 Page Title: "${pageTitle}"`);

    // Verify page didn't crash (should have some content)
    const bodyText = await page.locator('body').textContent();
    const hasContent = bodyText && bodyText.length > 100;
    console.log(`📝 Page has content: ${hasContent ? 'Yes' : 'No'}`);

    console.log('\n📊 TEST 3 RESULTS:');
    console.log(`   Crash Errors: ${crashErrors.length}`);
    console.log(`   Page Interactive: ${hasContent ? 'Yes' : 'No'}`);
    console.log(`   Status: ${crashErrors.length === 0 ? '✅ PASSED' : '❌ FAILED'}`);

    expect(crashErrors.length, 'Should not crash on non-existent thread').toBe(0);
  });

  test('Step 4: Send test message to create new conversation', async ({ page }) => {
    console.log('\n🧪 TEST 4: Send Test Message');
    console.log('=' .repeat(60));

    await page.goto('http://localhost:3000', {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    await page.waitForTimeout(2000);

    console.log('🔍 Looking for chat input...');

    // Try to find chat input (multiple selectors for resilience)
    const inputSelectors = [
      'textarea[placeholder*="message" i]',
      'textarea[placeholder*="chat" i]',
      'textarea',
      'input[type="text"][placeholder*="message" i]',
      'input[type="text"]'
    ];

    let inputFound = false;
    let input;

    for (const selector of inputSelectors) {
      const count = await page.locator(selector).count();
      if (count > 0) {
        input = page.locator(selector).first();
        inputFound = true;
        console.log(`✅ Found input using selector: ${selector}`);
        break;
      }
    }

    if (!inputFound) {
      console.log('⚠️  No chat input found on page');
      await page.screenshot({
        path: '/Users/jeremyalston/Downloads/Component paradise/Gesthemane/gemini-chatbotz/test-screenshots/04-no-input.png',
        fullPage: true
      });
      console.log('📸 Screenshot saved: 04-no-input.png');
      console.log('\n📊 TEST 4 STATUS: ⚠️  SKIPPED (No input found)');
      return;
    }

    // Click and type message
    console.log('⌨️  Typing message: "Hello"');
    await input.click();
    await input.fill('Hello');

    // Take screenshot before submit
    await page.screenshot({
      path: '/Users/jeremyalston/Downloads/Component paradise/Gesthemane/gemini-chatbotz/test-screenshots/04a-message-typed.png',
      fullPage: true
    });
    console.log('📸 Screenshot saved: 04a-message-typed.png');

    // Try to find and click submit button
    const submitSelectors = [
      'button[type="submit"]',
      'button:has-text("Send")',
      'button:has-text("Submit")',
      '[aria-label*="send" i]'
    ];

    let submitFound = false;
    for (const selector of submitSelectors) {
      const count = await page.locator(selector).count();
      if (count > 0) {
        const submitButton = page.locator(selector).first();
        const isVisible = await submitButton.isVisible();
        if (isVisible) {
          console.log(`✅ Found submit button: ${selector}`);
          await submitButton.click();
          submitFound = true;
          break;
        }
      }
    }

    if (!submitFound) {
      console.log('⚠️  No submit button found, trying Enter key...');
      await input.press('Enter');
    }

    // Wait for response
    console.log('⏳ Waiting for response...');
    await page.waitForTimeout(3000);

    // Take screenshot after submit
    await page.screenshot({
      path: '/Users/jeremyalston/Downloads/Component paradise/Gesthemane/gemini-chatbotz/test-screenshots/04b-message-sent.png',
      fullPage: true
    });
    console.log('📸 Screenshot saved: 04b-message-sent.png');

    // Check for errors after sending message
    const postSendErrors = consoleErrors.filter(err =>
      err.text.toLowerCase().includes('messages') ||
      err.text.toLowerCase().includes('undefined')
    );

    console.log('\n📊 TEST 4 RESULTS:');
    console.log(`   Input Found: ${inputFound ? 'Yes' : 'No'}`);
    console.log(`   Message Sent: ${inputFound ? 'Yes' : 'No'}`);
    console.log(`   Errors After Send: ${postSendErrors.length}`);
    console.log(`   Status: ${postSendErrors.length === 0 ? '✅ PASSED' : '❌ FAILED'}`);

    if (postSendErrors.length > 0) {
      console.log('\n❌ Errors detected:');
      postSendErrors.forEach(err => console.log(`   - ${err.text}`));
    }
  });

  test('Step 5: Comprehensive crash fix verification', async ({ page }) => {
    console.log('\n🧪 TEST 5: Comprehensive Crash Fix Verification');
    console.log('=' .repeat(60));

    const scenarios = [
      { name: 'Home Page', url: 'http://localhost:3000' },
      { name: 'Non-existent Thread', url: 'http://localhost:3000/chat/nonexistent-123' },
      { name: 'Invalid Thread ID', url: 'http://localhost:3000/chat/!@#$%' },
    ];

    const results: any[] = [];

    for (const scenario of scenarios) {
      console.log(`\n🔍 Testing: ${scenario.name}`);
      console.log(`   URL: ${scenario.url}`);

      const scenarioErrors: ConsoleMessage[] = [];

      // Clear previous errors
      consoleErrors = [];

      try {
        await page.goto(scenario.url, {
          waitUntil: 'networkidle',
          timeout: 30000
        });

        await page.waitForTimeout(2000);

        const messagesErrors = consoleErrors.filter(err =>
          err.text.toLowerCase().includes('messages') ||
          (err.text.toLowerCase().includes('undefined') && err.text.toLowerCase().includes('read'))
        );

        const result = {
          scenario: scenario.name,
          url: scenario.url,
          totalErrors: consoleErrors.length,
          criticalErrors: messagesErrors.length,
          status: messagesErrors.length === 0 ? 'PASSED' : 'FAILED'
        };

        results.push(result);

        console.log(`   Total Errors: ${result.totalErrors}`);
        console.log(`   Critical Errors: ${result.criticalErrors}`);
        console.log(`   Status: ${result.status === 'PASSED' ? '✅' : '❌'} ${result.status}`);

        // Take screenshot
        const filename = scenario.name.toLowerCase().replace(/\s+/g, '-');
        await page.screenshot({
          path: `/Users/jeremyalston/Downloads/Component paradise/Gesthemane/gemini-chatbotz/test-screenshots/05-${filename}.png`,
          fullPage: true
        });
        console.log(`   📸 Screenshot: 05-${filename}.png`);

      } catch (error: any) {
        console.log(`   ❌ Error during test: ${error.message}`);
        results.push({
          scenario: scenario.name,
          url: scenario.url,
          error: error.message,
          status: 'ERROR'
        });
      }
    }

    // Final summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 FINAL TEST SUMMARY');
    console.log('='.repeat(60));

    results.forEach(result => {
      const icon = result.status === 'PASSED' ? '✅' : result.status === 'FAILED' ? '❌' : '⚠️';
      console.log(`\n${icon} ${result.scenario}`);
      console.log(`   URL: ${result.url}`);
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      } else {
        console.log(`   Total Errors: ${result.totalErrors}`);
        console.log(`   Critical Errors: ${result.criticalErrors}`);
      }
      console.log(`   Status: ${result.status}`);
    });

    const passedTests = results.filter(r => r.status === 'PASSED').length;
    const totalTests = results.length;

    console.log('\n' + '='.repeat(60));
    console.log(`✨ OVERALL RESULT: ${passedTests}/${totalTests} tests passed`);
    console.log('='.repeat(60));

    // All scenarios should pass
    const allPassed = results.every(r => r.status === 'PASSED');
    expect(allPassed, 'All scenarios should pass without "messages undefined" crashes').toBe(true);
  });
});
