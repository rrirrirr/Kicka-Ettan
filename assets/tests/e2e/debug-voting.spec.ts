import { test, expect } from "@playwright/test";
import { GameFactory } from "../utils/game-factory";

test.describe("Debug Voting Phase", () => {
    test("Debug: Check what phase we're in", async ({ page, request }) => {
        // Capture ALL browser console messages before anything else
        const consoleLogs: string[] = [];
        page.on('console', msg => {
            consoleLogs.push(`[${msg.type()}] ${msg.text()}`);
        });

        // Skip tutorials
        await page.addInitScript(() => {
            window.localStorage.setItem(
                "curling_tutorial_seen",
                JSON.stringify([
                    "placement-tutorial",
                    "measurements-tutorial",
                    "ban-tutorial",
                ]),
            );
        });

        const { gameId, p2 } = await GameFactory.startGame(
            page,
            request,
            "turn_double_ban_open_pick",
            {
                total_rounds: 1,
                stones_per_team: 1,
            },
        );
        console.log(`Debug Test Game: ${gameId}`);

        // Wait for the Menu button (indicates game loaded)
        await expect(page.getByRole("button", { name: "Menu" })).toBeVisible({ timeout: 15000 });

        // Wait a bit for any renders to complete
        await page.waitForTimeout(500);

        // Take a screenshot to see what's on screen
        await page.screenshot({ path: 'debug-voting-phase.png', fullPage: true });

        // Check if voting dialog text is visible
        const votingVisible = await page.getByText("Who Starts?").isVisible();
        console.log("Voting dialog visible:", votingVisible);

        // Get the stored player ID
        const storedPlayerId = await page.evaluate(() => {
            return localStorage.getItem('kicka_ettan_player_id');
        });
        console.log("Stored Player ID:", storedPlayerId);

        // Print all captured console logs
        console.log("\n=== Browser Console Logs ===");
        consoleLogs.forEach(log => {
            console.log(log);
        });
        console.log("=== End Console Logs ===\n");

        // Wait a bit more for any async updates
        await page.waitForTimeout(2000);

        // Check again
        const votingVisibleAfter = await page.getByText("Who Starts?").isVisible();
        console.log("Voting dialog visible after wait:", votingVisibleAfter);

        // Take final screenshot
        await page.screenshot({ path: 'debug-voting-phase-after-wait.png', fullPage: true });

        p2.leave();
    });
});

