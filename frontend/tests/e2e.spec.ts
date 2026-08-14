import { test, expect } from '@playwright/test';

test.describe('Hingu Tailors Production SPA Stability & Navigation Suite', () => {
  let consoleErrors: string[] = [];
  let failedRequests: string[] = [];
  let unexpectedDownloads = 0;

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    failedRequests = [];
    unexpectedDownloads = 0;

    // Monitor for console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        const text = msg.text();
        // Exclude intentional 401 unauthenticated check logs or third-party camera permissions warnings in headless CI
        if (!text.includes('Camera access error') && !text.includes('favicon.ico')) {
          consoleErrors.push(text);
        }
      }
    });

    // Monitor for failed network requests
    page.on('requestfailed', request => {
      failedRequests.push(`${request.method()} ${request.url()} - ${request.failure()?.errorText}`);
    });

    // Monitor for unexpected browser downloads (the root cause of our previous regression!)
    page.on('download', download => {
      unexpectedDownloads++;
      console.error(`UNEXPECTED DOWNLOAD DETECTED: ${download.url()}`);
    });

    // Go to homepage/login
    await page.goto('/login');
  });

  test.afterEach(() => {
    expect(unexpectedDownloads, 'Zero unexpected browser file downloads should occur').toBe(0);
    expect(consoleErrors, 'Zero severe runtime console errors should occur').toEqual([]);
  });

  test('Complete SPA Workflow: Login -> Modules -> Scanner Diagnostics -> Navigation Stress -> Logout', async ({ page }) => {
    // 1. LOGIN MODULE
    await expect(page.locator('h2', { hasText: 'Welcome back' })).toBeVisible();
    await page.selectOption('select', 'manager');
    await page.fill('input[type="email"]', 'manager@hingu.com');
    await page.fill('input[type="password"]', 'securepass123');
    await page.click('button:has-text("Sign in")');
    await expect(page).toHaveURL('/');

    // Record initial document window ID to verify true SPA transitions without page reloads
    await page.evaluate(() => {
      (window as any).__SPA_NAVIGATION_MARKER__ = 'PERMANENT_SHELL_ID';
    });

    // 2. DASHBOARD MODULE
    await expect(page.locator('h1', { hasText: /Dashboard/i })).toBeVisible();
    const spaMarkerDashboard = await page.evaluate(() => (window as any).__SPA_NAVIGATION_MARKER__);
    expect(spaMarkerDashboard).toBe('PERMANENT_SHELL_ID');

    // 3. CUSTOMERS MODULE
    await page.click('aside nav a:has-text("Customers")');
    await expect(page).toHaveURL('/customers');
    await expect(page.locator('h1', { hasText: /Customers/i })).toBeVisible();

    // 4. CUSTOMER REGISTRATION DIALOG
    const addCustomerBtn = page.locator('button:has-text("Add Customer")');
    if (await addCustomerBtn.isVisible()) {
      await addCustomerBtn.click();
      await expect(page.locator('div[role="dialog"]')).toBeVisible();
      await page.keyboard.press('Escape'); // Close dialog without submitting
    }

    // 5. MEASUREMENTS MODULE
    await page.click('aside nav a:has-text("Measurements")');
    await expect(page).toHaveURL('/measurements');

    // 6. INVENTORY (STOCK) MODULE
    await page.click('aside nav a:has-text("Stock")');
    await expect(page).toHaveURL('/stock');

    // 7. SCANNER DIAGNOSTICS MODULE & STRESS TESTING
    await page.click('aside nav a:has-text("Scanner Diagnostics")');
    await expect(page).toHaveURL('/scanner-diagnostics');
    await expect(page.locator('h1', { hasText: /Scanner & QR Diagnostics/i })).toBeVisible();

    // Execute Optical Barcode Verification button
    const verifyCode128Btn = page.locator('button:has-text("Verify Code128")');
    if (await verifyCode128Btn.isVisible()) {
      await verifyCode128Btn.click();
      await expect(page.locator('div:has-text("PASS")').first()).toBeVisible();
    }

    // 8. 5x REPEATED SPA SWITCHING STRESS TEST (Scanner -> Employees -> Reports -> System Logs -> Dashboard -> Scanner)
    const routesToCycle = [
      { name: 'Employees', url: '/employees' },
      { name: 'Reports', url: '/reports' },
      { name: 'System Logs', url: '/system-logs' },
      { name: 'Settings', url: '/settings' },
      { name: 'Dashboard', url: '/' },
      { name: 'Scanner Diagnostics', url: '/scanner-diagnostics' }
    ];

    for (let cycle = 1; cycle <= 5; cycle++) {
      for (const targetRoute of routesToCycle) {
        await page.click(`aside nav a:has-text("${targetRoute.name}")`);
        await expect(page).toHaveURL(targetRoute.url);
        // Verify SPA marker remains intact (Zero hard page reloads!)
        const currentMarker = await page.evaluate(() => (window as any).__SPA_NAVIGATION_MARKER__);
        expect(currentMarker, `Hard browser reload detected during cycle ${cycle} to ${targetRoute.name}`).toBe('PERMANENT_SHELL_ID');
      }
    }

    // 9. ORDERS MODULE
    await page.click('aside nav a:has-text("Orders")');
    await expect(page).toHaveURL('/orders');

    // 10. TAILOR WORKSTATION MODULE
    await page.click('aside nav a:has-text("Tailor Workstation")');
    await expect(page).toHaveURL('/tailor-workload');

    // 11. LOGOUT
    await page.click('button:has-text("Logout")');
    await expect(page).toHaveURL('/login');
    await expect(page.locator('h2', { hasText: 'Welcome back' })).toBeVisible();
  });
});
