import { chromium } from 'playwright';
import { writeFileSync } from 'fs';

async function testChat() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  const page = await context.newPage();

  const results = {
    pageLoaded: false,
    chatInputAccessible: false,
    responseReceived: false,
    errors: [],
    observations: []
  };

  try {
    console.log('1. Navigating to production URL...');
    await page.goto('https://gemini-chatbotz-agent-space-7f0053b9.vercel.app', {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    results.pageLoaded = true;
    results.observations.push('Page loaded successfully');

    // Take initial screenshot
    await page.screenshot({
      path: '/Users/jeremyalston/Downloads/Component paradise/Gesthemane/gemini-chatbotz/screenshot-1-initial.png',
      fullPage: true
    });
    console.log('✓ Screenshot 1: Initial page captured');

    // Wait a moment for any dynamic content
    await page.waitForTimeout(2000);

    console.log('2. Looking for chat input field...');

    // Try multiple selectors to find the input
    const inputSelectors = [
      'textarea[placeholder*="message"]',
      'textarea[placeholder*="Message"]',
      'input[type="text"]',
      'textarea',
      '[contenteditable="true"]',
      'input[placeholder*="message"]'
    ];

    let input = null;
    let usedSelector = null;

    for (const selector of inputSelectors) {
      try {
        const element = await page.waitForSelector(selector, { timeout: 5000 });
        if (element) {
          input = element;
          usedSelector = selector;
          console.log(`✓ Found input with selector: ${selector}`);
          break;
        }
      } catch (e) {
        // Try next selector
      }
    }

    if (!input) {
      results.errors.push('Could not find chat input field');
      results.observations.push('Checked selectors: ' + inputSelectors.join(', '));

      // Take screenshot of what we see
      await page.screenshot({
        path: '/Users/jeremyalston/Downloads/Component paradise/Gesthemane/gemini-chatbotz/screenshot-error-no-input.png',
        fullPage: true
      });

      // Log page content for debugging
      const bodyText = await page.evaluate(() => document.body.innerText);
      console.log('Page content:', bodyText.substring(0, 500));

    } else {
      results.chatInputAccessible = true;
      results.observations.push(`Chat input found using selector: ${usedSelector}`);

      console.log('3. Typing message...');
      await input.fill('Hello, can you help me book a flight?');
      await page.waitForTimeout(500);

      // Take screenshot after typing
      await page.screenshot({
        path: '/Users/jeremyalston/Downloads/Component paradise/Gesthemane/gemini-chatbotz/screenshot-2-typed.png',
        fullPage: true
      });
      console.log('✓ Screenshot 2: Message typed');

      console.log('4. Submitting message...');

      // Try to find and click submit button
      const submitSelectors = [
        'button[type="submit"]',
        'button[aria-label*="Send"]',
        'button[aria-label*="send"]',
        'button:has-text("Send")',
        'button:has-text("send")',
        '[role="button"]:has-text("Send")'
      ];

      let submitted = false;
      for (const selector of submitSelectors) {
        try {
          const button = await page.waitForSelector(selector, { timeout: 3000 });
          if (button) {
            await button.click();
            submitted = true;
            console.log(`✓ Clicked submit button: ${selector}`);
            break;
          }
        } catch (e) {
          // Try next selector or Enter key
        }
      }

      // If no button found, try pressing Enter
      if (!submitted) {
        console.log('No submit button found, trying Enter key...');
        await input.press('Enter');
        submitted = true;
      }

      console.log('5. Waiting 10 seconds for AI response...');
      await page.waitForTimeout(10000);

      // Look for response indicators
      const responseSelectors = [
        '[data-role="assistant"]',
        '[role="article"]',
        '.message',
        '[class*="message"]',
        '[class*="response"]',
        '[class*="assistant"]'
      ];

      let foundResponse = false;
      for (const selector of responseSelectors) {
        const elements = await page.$$(selector);
        if (elements.length > 0) {
          console.log(`✓ Found ${elements.length} elements matching: ${selector}`);
          foundResponse = true;
          results.responseReceived = true;
          results.observations.push(`Response elements found: ${selector} (${elements.length} elements)`);
          break;
        }
      }

      // Check for error messages
      const errorSelectors = [
        '[role="alert"]',
        '.error',
        '[class*="error"]',
        '[class*="Error"]'
      ];

      for (const selector of errorSelectors) {
        const elements = await page.$$(selector);
        if (elements.length > 0) {
          for (const el of elements) {
            const text = await el.textContent();
            if (text && text.trim()) {
              results.errors.push(`Error element found: ${text.trim()}`);
            }
          }
        }
      }

      // Take final screenshot
      await page.screenshot({
        path: '/Users/jeremyalston/Downloads/Component paradise/Gesthemane/gemini-chatbotz/screenshot-3-response.png',
        fullPage: true
      });
      console.log('✓ Screenshot 3: After waiting for response');

      // Get final page content
      const finalContent = await page.evaluate(() => document.body.innerText);
      results.observations.push(`Page content length: ${finalContent.length} characters`);
    }

    // Check console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        results.errors.push(`Console error: ${msg.text()}`);
      }
    });

  } catch (error) {
    results.errors.push(`Test error: ${error.message}`);
    console.error('Error during test:', error);

    // Take error screenshot
    try {
      await page.screenshot({
        path: '/Users/jeremyalston/Downloads/Component paradise/Gesthemane/gemini-chatbotz/screenshot-error.png',
        fullPage: true
      });
    } catch (e) {
      // Ignore screenshot errors
    }
  } finally {
    await browser.close();
  }

  // Write results to file
  writeFileSync(
    '/Users/jeremyalston/Downloads/Component paradise/Gesthemane/gemini-chatbotz/test-results.json',
    JSON.stringify(results, null, 2)
  );

  console.log('\n=== TEST RESULTS ===');
  console.log(JSON.stringify(results, null, 2));

  return results;
}

testChat().catch(console.error);
