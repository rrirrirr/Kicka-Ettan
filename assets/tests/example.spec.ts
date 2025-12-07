import { test, expect } from '@playwright/test';

test('has title', async ({ page }) => {
    await page.goto('/');

    // Expect a title "to contain" a substring.
    await expect(page).toHaveTitle(/Kicka Ettan/);
});

test.describe('Navigation', () => {
    test('can navigate to demo page', async ({ page }) => {
        await page.goto('/');
        await page.getByRole('link', { name: 'Demo' }).click();
        await expect(page).toHaveURL(/.*demo/);
    });
});
