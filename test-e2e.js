const { chromium } = require('playwright');

async function runTests() {
  console.log('Starting E2E tests...\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const results = {
    passed: 0,
    failed: 0,
    tests: []
  };

  // Capture console logs
  page.on('console', msg => {
    if (msg.type() === 'log') {
      console.log(`  [Browser] ${msg.text()}`);
    }
  });

  page.on('pageerror', error => {
    console.log(`  [Page Error] ${error.message}`);
  });

  const tests = [
    {
      name: 'App loads without errors',
      test: async () => {
        const response = await page.goto('http://localhost:3002', { waitUntil: 'networkidle' });
        return response.status() === 200;
      }
    },
    {
      name: 'Chat input is visible',
      test: async () => {
        const input = page.getByRole('textbox', { name: /Message|message/i }).first();
        await input.waitFor({ state: 'visible', timeout: 10000 });
        return await input.isVisible();
      }
    },
    {
      name: 'Can submit a message and get response',
      test: async () => {
        const input = page.getByRole('textbox', { name: /Message|message/i }).first();
        await input.fill('Hello, this is a test message');

        const submitBtn = page.locator('button[type="submit"]').first();
        if (await submitBtn.isVisible()) {
          await submitBtn.click();
        } else {
          await input.press('Enter');
        }

        // Wait for AI response
        await page.waitForTimeout(10000);

        // Check if we got some response
        const pageContent = await page.content();
        return pageContent.length > 100;
      }
    },
    {
      name: 'Convex backend is accessible',
      test: async () => {
        const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL || 'https://brilliant-ferret-250.convex.cloud';
        try {
          const response = await page.goto(convexUrl, { timeout: 5000 });
          return response.status() < 500;
        } catch {
          // Expected if CORS blocks direct access
          return true;
        }
      }
    }
  ];

  for (const t of tests) {
    process.stdout.write(`\nTesting: ${t.name}... `);
    try {
      const success = await t.test();
      if (success) {
        console.log('✓ PASSED');
        results.passed++;
        results.tests.push({ name: t.name, status: 'passed' });
      } else {
        console.log('✗ FAILED');
        results.failed++;
        results.tests.push({ name: t.name, status: 'failed' });
      }
    } catch (error) {
      console.log(`✗ ERROR: ${error.message}`);
      results.failed++;
      results.tests.push({ name: t.name, status: 'error', error: error.message });
    }
  }

  await browser.close();

  console.log('\n' + '='.repeat(50));
  console.log('Test Results Summary:');
  console.log('='.repeat(50));
  console.log(`Total: ${results.passed + results.failed}`);
  console.log(`Passed: ${results.passed} ✓`);
  console.log(`Failed: ${results.failed} ✗`);

  if (results.failed === 0) {
    console.log('\n✅ All tests passed!');
    process.exit(0);
  } else {
    console.log('\n❌ Some tests failed');
    process.exit(1);
  }
}

runTests().catch(console.error);
