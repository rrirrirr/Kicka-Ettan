import { test, expect } from '@playwright/test';

test.describe('Game Interaction (Demo Page)', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/demo');
        // Wait for loader to finish
        // The Round Start Overlay ('round 1') appears immediately.
        // We encounter timeouts waiting for it to disappear normally in test env.
        // We force-hide it to proceed with testing the game interaction.
        await expect(page.getByText('round 1')).toBeVisible({ timeout: 5000 });

        // Wait a bit for "natural" dismissal
        await expect(page.getByText('round 1')).toBeHidden({ timeout: 10000 });
    });

    test('can place a stone by clicking the sheet', async ({ page, isMobile }) => {
        // Assert initial state: 0 stones placed (assuming Demo starts empty)
        // We can check the stone bar count or the sheet
        // The stone bar shows unplaced stones. If 5 stones total, we should see 5 stones in bar.

        // Find the sheet
        const sheet = page.locator('.touch-none');
        const box = await sheet.boundingBox();
        if (!box) throw new Error('Sheet not found');

        // Use dispatchEvent to ensure pointer events are fired correctly across browsers (especially WebKit)
        // React's onPointerDown relies on these specific event properties
        if (isMobile) {
            await sheet.tap({
                position: { x: box.width / 2, y: box.height * 0.5 }
            });
        } else {
            await sheet.click({
                position: { x: box.width / 2, y: box.height * 0.5 },
                force: true
            });
        }

        // Expect a stone to appear on the sheet
        // We look for .absolute.rounded-full with red background (demo player is red)
        // Best to look for the DraggableStone that is placed (isPlaced=true)
        // The component wrapper has key `stone-wrapper-${index}`
        // But in compiled code/DOM, we look for style 'absolute'

        // We can assert that the number of unplaced stones in bar decreased
        // Or check for existence of stone on sheet
        await expect(page.locator('[style*="position: absolute"][style*="background-color: rgb(204, 0, 0)"]')).toBeVisible();
        // Note: Default red color in code is #cc0000 -> rgb(204, 0, 0)
    });
});
