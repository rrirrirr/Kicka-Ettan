import { test, expect } from '@playwright/test';

test.describe('Game Flow', () => {
    test('can create a new game', async ({ page }) => {
        // Mock the API call
        await page.route('**/api/games', async route => {
            const json = { game_id: 'test-game-123' };
            await route.fulfill({ json });
        });

        await page.goto('/');

        // Click the create game button
        // Using strict locators is better
        await page.getByRole('button', { name: 'create game' }).click();

        // Expect to be redirected to the game room
        await expect(page).toHaveURL(/.*\/game\/test-game-123/);

        // Wait for connection/loading state or game room UI
        // Since we are mocking only the creation, the game room might fail to connect socket, 
        // but we verify the routing works.
        // We can check for a URL change which implies success.
    });

    test('can toggle settings', async ({ page }) => {
        await page.goto('/');

        // Open settings
        await page.getByRole('button', { name: 'settings' }).click();

        // Check if settings dialog is visible
        // The dialog title is "settings"
        await expect(page.getByRole('dialog')).toBeVisible();
        await expect(page.getByText('Measurements')).toBeVisible();
    });
});
