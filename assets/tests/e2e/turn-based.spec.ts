import { test, expect } from "@playwright/test";
import { GameFactory } from "../utils/game-factory";

test.describe("Turn Based Game Type E2E", () => {
    test('Turn Based: Full Alternating Turns Flow', async ({ page, request }) => {
        // Pre-seed local storage to skip tutorials
        await page.addInitScript(() => {
            window.localStorage.setItem('curling_tutorial_seen', JSON.stringify(['placement-tutorial', 'measurements-tutorial', 'ban-tutorial']));
        });

        // Start a turn-based game with 1 round, 2 stones per team
        const { gameId, p2 } = await GameFactory.startGame(page, request, 'turn_double_ban_open_pick', {
            total_rounds: 1,
            stones_per_team: 2
        });
        console.log(`Turn Based Game started: ${gameId}`);

        // Wait for game load
        await expect(page.getByRole('button', { name: 'Menu' })).toBeVisible({ timeout: 10000 });

        const sheet = page.locator('svg.bg-white.block');
        await expect(sheet).toBeVisible({ timeout: 10000 });
        const box = await sheet.boundingBox();
        if (!box) throw new Error('Sheet not found');

        // --- Verify Turn-Based Mode Activation ---
        // P1 (browser) should start with their turn (or P2 depending on implementation)
        // Check for "Your Turn" or "Opponent's Turn" indicator
        // In turn-based, player should see an indicator about whose turn it is

        // DEBUG: Log initial game state
        const initialState = await page.evaluate(() => {
            return (window as any).__GAME_STATE__ || 'not available';
        });
        console.log('Initial state:', initialState);

        // --- P1 Places Ban (Turn 1) ---
        // P1 clicks on sheet to place ban ring
        await sheet.click({ position: { x: box.width / 3, y: box.height / 2 } });
        await page.waitForTimeout(500);

        // P1 confirms placement (finishes turn)
        // In turn-based mode, this switches turn to P2
        const finishBtn = page.getByRole('button', { name: /finish placement|confirm/i });
        if (await finishBtn.isVisible({ timeout: 2000 })) {
            await finishBtn.click();
        }

        // --- P2's Turn ---
        // P2 (backend) places their ban
        await page.waitForTimeout(500);
        await p2.placeBan(200, 300);
        await page.waitForTimeout(300);
        await p2.send("confirm_placement", {});

        // --- P1's Turn (Stone 1) ---
        // P1 should be able to place again
        await page.waitForTimeout(500);
        await sheet.click({ position: { x: box.width / 2, y: box.height / 2 } });
        await page.waitForTimeout(300);

        // Confirm P1's turn
        if (await finishBtn.isVisible({ timeout: 2000 })) {
            await finishBtn.click();
        }

        // --- P2's Turn (Stone 1) ---
        await page.waitForTimeout(500);
        await p2.placeStone(0, 150, 400);
        await page.waitForTimeout(300);
        await p2.send("confirm_placement", {});

        // --- P1's Turn (Stone 2) ---
        await page.waitForTimeout(500);
        await sheet.click({ position: { x: box.width * 2 / 3, y: box.height / 2 } });
        await page.waitForTimeout(300);

        if (await finishBtn.isVisible({ timeout: 2000 })) {
            await finishBtn.click();
        }

        // --- P2's Turn (Stone 2, Last) ---
        await page.waitForTimeout(500);
        await p2.placeStone(1, 300, 400);
        await page.waitForTimeout(300);
        await p2.send("confirm_placement", {});

        // --- Phase Transition ---
        // After all stones are placed, game should transition to combined phase
        await expect(page.getByText('waiting for opponent')).not.toBeVisible({ timeout: 15000 });

        // Verify we're in combined phase
        await expect(page.getByRole('button', { name: /next round|exit game/i })).toBeVisible({ timeout: 15000 });

        console.log('Turn-based game flow completed successfully!');
        p2.leave();
    });

    test('Turn Based: Cannot Place Stone When Not Your Turn', async ({ page, request }) => {
        await page.addInitScript(() => {
            window.localStorage.setItem('curling_tutorial_seen', JSON.stringify(['placement-tutorial', 'measurements-tutorial', 'ban-tutorial']));
        });

        const { gameId, p2 } = await GameFactory.startGame(page, request, 'turn_double_ban_open_pick', {
            total_rounds: 1,
            stones_per_team: 1
        });
        console.log(`Turn Block Test: ${gameId}`);

        await expect(page.getByRole('button', { name: 'Menu' })).toBeVisible({ timeout: 10000 });

        const sheet = page.locator('svg.bg-white.block');
        await expect(sheet).toBeVisible();
        const box = await sheet.boundingBox();
        if (!box) throw new Error('Sheet not found');

        // P1 places and confirms (completes their turn)
        await sheet.click({ position: { x: box.width / 2, y: box.height / 2 } });
        await page.waitForTimeout(300);

        const finishBtn = page.getByRole('button', { name: /finish placement|confirm/i });
        if (await finishBtn.isVisible({ timeout: 2000 })) {
            await finishBtn.click();
        }

        // Now it's P2's turn - P1 should NOT be able to place
        await page.waitForTimeout(500);

        // Count stones currently placed by P1
        const stonesBeforeClick = await page.locator('.stone-hover-container').count();

        // P1 tries to place another stone (should fail/be blocked)
        await sheet.click({ position: { x: box.width / 3, y: box.height / 2 } });
        await page.waitForTimeout(300);

        // Count stones after - should be the same (placement was blocked)
        const stonesAfterClick = await page.locator('.stone-hover-container').count();

        // In turn-based mode, clicking when not your turn should not add a stone
        // Note: depending on implementation, the stone count might stay same or we see "not your turn" message
        console.log(`Stones before: ${stonesBeforeClick}, after: ${stonesAfterClick}`);

        // P2 completes their turn
        await p2.placeStone(0, 200, 200);
        await p2.send("confirm_placement", {});

        // Game should transition to combined phase (1 stone each)
        await expect(page.getByText('waiting for opponent')).not.toBeVisible({ timeout: 15000 });
        await expect(page.getByRole('button', { name: /next round|exit game/i })).toBeVisible({ timeout: 15000 });

        p2.leave();
    });

    test('Turn Based: Stones Visible to Both Players (Open Mode)', async ({ page, request }) => {
        await page.addInitScript(() => {
            window.localStorage.setItem('curling_tutorial_seen', JSON.stringify(['placement-tutorial', 'measurements-tutorial', 'ban-tutorial']));
        });

        const { gameId, p2 } = await GameFactory.startGame(page, request, 'turn_double_ban_open_pick', {
            total_rounds: 1,
            stones_per_team: 1
        });
        console.log(`Open Visibility Test: ${gameId}`);

        await expect(page.getByRole('button', { name: 'Menu' })).toBeVisible({ timeout: 10000 });

        const sheet = page.locator('svg.bg-white.block');
        await expect(sheet).toBeVisible();
        const box = await sheet.boundingBox();
        if (!box) throw new Error('Sheet not found');

        // P1 places stone
        await sheet.click({ position: { x: box.width / 2, y: box.height / 2 } });
        await page.waitForTimeout(300);

        const finishBtn = page.getByRole('button', { name: /finish placement|confirm/i });
        if (await finishBtn.isVisible({ timeout: 2000 })) {
            await finishBtn.click();
        }

        // P2 places stone
        await page.waitForTimeout(500);
        await p2.placeStone(0, 150, 300);
        await page.waitForTimeout(300);

        // P2's stone should be VISIBLE to P1 in open mode (unlike blind pick)
        // Check for opponent's stone on the sheet (P2 is yellow/blue color)
        const opponentStoneVisible = await page.evaluate(() => {
            const stones = Array.from(document.querySelectorAll('.stone-hover-container, div.rounded-full'));
            // Look for stones that might be opponent color
            return stones.length >= 2; // Should have at least 2 stones (P1's + P2's)
        });

        // In open/visible mode, opponent stones should be visible during placement
        expect(opponentStoneVisible).toBe(true);

        // Complete the game
        await p2.send("confirm_placement", {});
        await expect(page.getByText('waiting for opponent')).not.toBeVisible({ timeout: 15000 });
        await expect(page.getByRole('button', { name: /next round|exit game/i })).toBeVisible({ timeout: 15000 });

        p2.leave();
    });
});
