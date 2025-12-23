import { test, expect } from '@playwright/test';

test.describe('Sign-up and sign-in functionality test', () => {
  test('should create account and sign in without client errors', async ({ page, browser }) => {
    // Set viewport
    await page.setViewportSize({ width: 1280, height: 720 });

    const baseUrl = 'http://localhost:3002';
    const timestamp = Date.now();
    const email = `codex+${timestamp}@example.com`;
    const password = 'P@ssw0rd!12345';

    // Listen for console errors
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
        console.log('BROWSER ERROR:', msg.text());
      }
    });

    // Listen for page errors
    const pageErrors: Error[] = [];
    page.on('pageerror', error => {
      pageErrors.push(error);
      console.log('PAGE ERROR:', error.message);
      console.log('STACK:', error.stack);
    });

    console.log('Navigating to register page...');
    await page.goto(`${baseUrl}/register`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: 'test-screenshots/01-register-page.png', fullPage: true });

    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', password);
    await page.getByRole('button', { name: /sign up/i }).click();

    const userButton = page.getByRole('button', { name: email });
    await expect(userButton).toBeVisible({ timeout: 15000 });
    await page.screenshot({ path: 'test-screenshots/02-after-signup.png', fullPage: true });

    const loginContext = await browser.newContext();
    const loginPage = await loginContext.newPage();

    console.log('Navigating to login page...');
    await loginPage.goto(`${baseUrl}/login`, { waitUntil: 'networkidle' });
    await loginPage.waitForTimeout(1500);
    await loginPage.screenshot({ path: 'test-screenshots/03-login-page.png', fullPage: true });

    await loginPage.fill('input[name="email"]', email);
    await loginPage.fill('input[name="password"]', password);
    await loginPage.getByRole('button', { name: /sign in/i }).click();

    const loginUserButton = loginPage.getByRole('button', { name: email });
    await expect(loginUserButton).toBeVisible({ timeout: 15000 });
    await loginPage.screenshot({ path: 'test-screenshots/04-after-login.png', fullPage: true });

    await loginContext.close();

    // Log any console errors
    if (consoleErrors.length > 0) {
      console.log('\n=== CONSOLE ERRORS ===');
      consoleErrors.forEach((error, i) => {
        console.log(`${i + 1}. ${error}`);
      });
    }

    // Log any page errors
    if (pageErrors.length > 0) {
      console.log('\n=== PAGE ERRORS ===');
      pageErrors.forEach((error, i) => {
        console.log(`${i + 1}. ${error.message}`);
        console.log(`   Stack: ${error.stack}`);
      });
    }

    expect(consoleErrors).toHaveLength(0);
    expect(pageErrors).toHaveLength(0);
  });
});
