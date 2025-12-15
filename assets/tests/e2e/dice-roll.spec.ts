import { test, expect } from "@playwright/test";
import { GameFactory } from "../utils/game-factory";

test.describe("Dice Roll Dialog E2E", () => {
    // Helper to skip tutorials
    const skipTutorials = async (page: any) => {
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
    };

    // Helper to wait for voting screen
    const waitForVotingScreen = async (page: any) => {
        // Wait for page to load and game state to show turn_order phase
        await expect(page.getByRole("button", { name: "Menu" })).toBeVisible({ timeout: 10000 });

        // Wait for both players to be connected by checking for the voting dialog
        await expect(page.getByText("Who Starts?")).toBeVisible({
            timeout: 15000,
        });
    };

    test("Dice roll dialog is visible when both players vote to randomize", async ({
        page,
        request,
    }) => {
        await skipTutorials(page);

        const { gameId, p2 } = await GameFactory.startGame(
            page,
            request,
            "turn_double_ban_open_pick",
            {
                total_rounds: 1,
                stones_per_team: 1,
            },
        );
        console.log(`Dice Roll Test: ${gameId}`);

        // Wait for voting screen
        await waitForVotingScreen(page);

        // P1 clicks "Roll dice" button (votes to randomize)
        const rollDiceBtn = page.getByRole("button", { name: /roll dice/i });
        await expect(rollDiceBtn).toBeVisible({ timeout: 5000 });
        await rollDiceBtn.click();

        // P2 also votes to randomize
        await p2.send("vote_first_player", { vote_for: "randomize" });

        // Wait for dice roll overlay to appear
        const diceOverlay = page.getByTestId("dice-roll-overlay");
        await expect(diceOverlay).toBeVisible({ timeout: 10000 });

        // Verify the dialog itself is visible
        const diceDialog = page.getByTestId("dice-roll-dialog");
        await expect(diceDialog).toBeVisible();

        // Verify the "Rolling dice..." title is shown
        const diceTitle = page.getByTestId("dice-roll-title");
        await expect(diceTitle).toBeVisible();
        await expect(diceTitle).toHaveText("Rolling dice...");

        // Verify "You" and "Opponent" labels are visible
        await expect(page.getByText("You")).toBeVisible();
        await expect(page.getByText("Opponent")).toBeVisible();

        // Verify "vs" separator is visible
        await expect(page.getByText("vs")).toBeVisible();

        console.log("Dice roll dialog visibility test passed");

        // Wait for winner announcement to appear (after animation)
        await expect(page.getByText(/You start!|Opponent starts/)).toBeVisible({
            timeout: 5000,
        });

        // Verify the "Continue" button appears
        const continueBtn = page.getByRole("button", { name: /continue/i });
        await expect(continueBtn).toBeVisible({ timeout: 5000 });

        // Click Continue to dismiss the overlay
        await continueBtn.click();

        // Verify the dice overlay is no longer visible
        await expect(diceOverlay).not.toBeVisible({ timeout: 5000 });

        // Verify we're now in placement phase
        const sheet = page.locator("svg.bg-white.block");
        await expect(sheet).toBeVisible({ timeout: 5000 });

        console.log("Dice roll complete flow test passed");
        p2.leave();
    });

    test("Dice roll shows correct winner announcement", async ({
        page,
        request,
    }) => {
        await skipTutorials(page);

        const { gameId, p2 } = await GameFactory.startGame(
            page,
            request,
            "turn_double_ban_open_pick",
            {
                total_rounds: 1,
                stones_per_team: 1,
            },
        );
        console.log(`Dice Winner Test: ${gameId}`);

        await waitForVotingScreen(page);

        // Both players vote to randomize
        await page.getByRole("button", { name: /roll dice/i }).click();
        await p2.send("vote_first_player", { vote_for: "randomize" });

        // Wait for dice overlay
        await expect(page.getByTestId("dice-roll-overlay")).toBeVisible({ timeout: 10000 });

        // Wait for winner announcement - should show either "You start!" or "Opponent starts"
        const winnerText = page.getByText(/You start!|Opponent starts/);
        await expect(winnerText).toBeVisible({ timeout: 5000 });

        // Verify "Lowest roll wins" explanation is shown
        await expect(page.getByText("Lowest roll wins")).toBeVisible();

        // Verify dice values are displayed (e.g. "3 vs 5")
        const scoreDisplay = page.locator('text=/\\d+ vs \\d+/');
        await expect(scoreDisplay).toBeVisible();

        // Click Continue
        await page.getByRole("button", { name: /continue/i }).click();

        // Verify transition to placement phase
        await expect(page.getByTestId("dice-roll-overlay")).not.toBeVisible({ timeout: 5000 });

        console.log("Dice winner announcement test passed");
        p2.leave();
    });

    test("Dice overlay has correct z-index (visible above game board)", async ({
        page,
        request,
    }) => {
        await skipTutorials(page);

        const { gameId, p2 } = await GameFactory.startGame(
            page,
            request,
            "turn_double_ban_open_pick",
            {
                total_rounds: 1,
                stones_per_team: 1,
            },
        );
        console.log(`Dice Z-Index Test: ${gameId}`);

        await waitForVotingScreen(page);

        // Both players vote to randomize
        await page.getByRole("button", { name: /roll dice/i }).click();
        await p2.send("vote_first_player", { vote_for: "randomize" });

        // Wait for dice overlay
        const diceOverlay = page.getByTestId("dice-roll-overlay");
        await expect(diceOverlay).toBeVisible({ timeout: 10000 });

        // Verify z-index is high enough (1000)
        const zIndex = await diceOverlay.evaluate((el: Element) => {
            return window.getComputedStyle(el).zIndex;
        });
        expect(parseInt(zIndex)).toBeGreaterThanOrEqual(1000);

        // Verify the overlay covers the full viewport (fixed inset-0)
        const position = await diceOverlay.evaluate((el: Element) => {
            const style = window.getComputedStyle(el);
            return {
                position: style.position,
                top: style.top,
                left: style.left,
                right: style.right,
                bottom: style.bottom,
            };
        });
        expect(position.position).toBe("fixed");
        expect(position.top).toBe("0px");
        expect(position.left).toBe("0px");

        console.log(`Dice overlay z-index (${zIndex}) and position verified`);

        // Clean up
        await page.getByRole("button", { name: /continue/i }).click({ timeout: 5000 });
        p2.leave();
    });
});
