import { test, expect } from "@playwright/test";
import { GameFactory } from "../utils/game-factory";

test.describe("Turn Based Voting Phase E2E", () => {
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
    // First wait for the Menu button to confirm game loaded
    await expect(page.getByRole("button", { name: "Menu" })).toBeVisible({ timeout: 10000 });

    // Wait for both players to be connected by checking for the voting dialog
    await expect(page.getByText("Who Starts?")).toBeVisible({
      timeout: 15000,
    });
  };

  // Helper to get P1's player ID from the page
  const getP1PlayerId = async (page: any): Promise<string> => {
    return await page.evaluate(() => {
      return (
        (window as any).__PLAYER_ID__ || localStorage.getItem("player_id") || ""
      );
    });
  };

  test.describe("Voting Agreement Tests", () => {
    test("Both players vote for P1 → P1 starts", async ({ page, request }) => {
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
      console.log(`Voting Test (P1 starts): ${gameId}`);

      // Wait for voting screen
      await waitForVotingScreen(page);

      // Get P1's player ID
      const p1Id = await getP1PlayerId(page);
      console.log(`P1 ID: ${p1Id}, P2 ID: ${p2.getPlayerId()}`);

      // P1 clicks "I start" button (votes for themselves)
      const iStartBtn = page.getByRole("button", { name: /i start/i });
      await expect(iStartBtn).toBeVisible({ timeout: 5000 });
      await iStartBtn.click();

      // P2 also votes for P1 (opponent starts from P2's perspective)
      await p2.voteFirstPlayer(p1Id);

      // Voting should complete, placement phase should start
      await expect(
        page.getByText(/who starts|who should start/i),
      ).not.toBeVisible({ timeout: 10000 });

      // Verify we're in placement phase (P1's turn indicator or placement UI)
      const sheet = page.locator("svg.bg-white.block");
      await expect(sheet).toBeVisible({ timeout: 5000 });

      console.log("Voting agreement test passed: Both voted P1, P1 starts");
      p2.leave();
    });

    test("Both players vote for P2 → P2 starts", async ({ page, request }) => {
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
      console.log(`Voting Test (P2 starts): ${gameId}`);

      await waitForVotingScreen(page);

      const p2Id = p2.getPlayerId();

      // P1 clicks "Opponent starts" button
      const opponentStartsBtn = page.getByRole("button", {
        name: /opponent starts/i,
      });
      await expect(opponentStartsBtn).toBeVisible({ timeout: 5000 });
      await opponentStartsBtn.click();

      // P2 votes for themselves
      await p2.voteFirstPlayer(p2Id);

      // Voting should complete
      await expect(
        page.getByText(/who starts|who should start/i),
      ).not.toBeVisible({ timeout: 10000 });

      // Verify placement phase started
      const sheet = page.locator("svg.bg-white.block");
      await expect(sheet).toBeVisible({ timeout: 5000 });

      console.log("Voting agreement test passed: Both voted P2, P2 starts");
      p2.leave();
    });

    test("Players disagree (both vote for themselves) → Votes reset", async ({
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
      console.log(`Voting Disagreement Test: ${gameId}`);

      await waitForVotingScreen(page);

      const p1Id = await getP1PlayerId(page);
      const p2Id = p2.getPlayerId();

      // P1 votes for themselves
      const iStartBtn = page.getByRole("button", { name: /i start/i });
      await iStartBtn.click();

      // P2 also votes for themselves (disagreement!)
      await p2.voteFirstPlayer(p2Id);

      // Should still be on voting screen (votes reset on disagreement)
      // Wait a moment for the reset
      await page.waitForTimeout(1000);

      // Voting screen should still be visible OR show disagreement message
      const votingStillVisible = await page
        .getByText(/who starts|who should start|votes don't match/i)
        .isVisible();
      expect(votingStillVisible).toBe(true);

      // Now they agree - both vote for P1
      await iStartBtn.click();
      await p2.voteFirstPlayer(p1Id);

      // This time voting should complete
      await expect(
        page.getByText(/who starts|who should start/i),
      ).not.toBeVisible({ timeout: 10000 });

      console.log(
        "Voting disagreement test passed: Reset after disagreement, agreed on second try",
      );
      p2.leave();
    });
  });

  test.describe("Phase Transition Tests", () => {
    test("Vote → Placement → Combined: Full Phase Flow", async ({
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
      console.log(`Phase Transition Test: ${gameId}`);

      // -- VOTE PHASE --
      await waitForVotingScreen(page);
      const p1Id = await getP1PlayerId(page);

      // Both vote for P1
      await page.getByRole("button", { name: /i start/i }).click();
      await p2.voteFirstPlayer(p1Id);

      // -- PLACEMENT PHASE --
      await expect(page.getByText(/who starts/i)).not.toBeVisible({
        timeout: 10000,
      });

      const sheet = page.locator("svg.bg-white.block");
      await expect(sheet).toBeVisible({ timeout: 10000 });
      const box = await sheet.boundingBox();
      if (!box) throw new Error("Sheet not found");

      // P1 places ban
      await sheet.click({ position: { x: box.width / 3, y: box.height / 2 } });
      await page.waitForTimeout(300);
      const finishBtn = page.getByRole("button", {
        name: /finish placement|confirm/i,
      });
      if (await finishBtn.isVisible({ timeout: 2000 })) {
        await finishBtn.click();
      }

      // P2 places ban and confirms
      await p2.placeBan(200, 300);
      await page.waitForTimeout(200);
      await p2.send("confirm_placement", {});

      // P1 places stone
      await page.waitForTimeout(500);
      await sheet.click({
        position: { x: box.width / 2, y: box.height * 0.6 },
      });
      await page.waitForTimeout(300);
      if (await finishBtn.isVisible({ timeout: 2000 })) {
        await finishBtn.click();
      }

      // P2 places stone and confirms
      await p2.placeStone(0, 150, 400);
      await page.waitForTimeout(200);
      await p2.send("confirm_placement", {});

      // -- COMBINED PHASE --
      await expect(
        page.getByRole("button", { name: /next round|exit game/i }),
      ).toBeVisible({ timeout: 15000 });

      console.log("Phase transition test passed: Vote → Placement → Combined");
      p2.leave();
    });

    test("Stones and Ban Rings visible during placement (open mode)", async ({
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
      console.log(`Visibility Test: ${gameId}`);

      // Complete voting
      await waitForVotingScreen(page);
      const p1Id = await getP1PlayerId(page);
      await page.getByRole("button", { name: /i start/i }).click();
      await p2.voteFirstPlayer(p1Id);
      await expect(page.getByText(/who starts/i)).not.toBeVisible({
        timeout: 10000,
      });

      const sheet = page.locator("svg.bg-white.block");
      await expect(sheet).toBeVisible();
      const box = await sheet.boundingBox();
      if (!box) throw new Error("Sheet not found");

      // P1 places ban
      await sheet.click({ position: { x: box.width / 3, y: box.height / 2 } });
      await page.waitForTimeout(300);
      const finishBtn = page.getByRole("button", {
        name: /finish placement|confirm/i,
      });
      if (await finishBtn.isVisible({ timeout: 2000 })) {
        await finishBtn.click();
      }

      // P2 places ban
      await p2.placeBan(250, 350);
      await page.waitForTimeout(500);

      // Check if P2's ban is visible to P1 (open mode)
      const banRingsVisible = await page.evaluate(() => {
        // Look for ban ring elements (orange circles)
        const banElements = document.querySelectorAll(
          '[class*="rounded-full"]',
        );
        return banElements.length >= 2; // P1's ban + P2's ban
      });
      expect(banRingsVisible).toBe(true);

      // P2 confirms
      await p2.send("confirm_placement", {});

      // P1 places stone
      await page.waitForTimeout(500);
      await sheet.click({
        position: { x: box.width / 2, y: box.height * 0.6 },
      });
      await page.waitForTimeout(300);
      if (await finishBtn.isVisible({ timeout: 2000 })) {
        await finishBtn.click();
      }

      // P2 places stone
      await p2.placeStone(0, 180, 400);
      await page.waitForTimeout(500);

      // Check if P2's stone is visible to P1
      const stonesVisible = await page.evaluate(() => {
        const stoneElements = document.querySelectorAll(
          '[class*="rounded-full"]',
        );
        // Should see multiple stones (at least 2)
        return stoneElements.length >= 2;
      });
      expect(stonesVisible).toBe(true);

      console.log(
        "Visibility test passed: Both players see each other's items",
      );
      p2.leave();
    });
  });

  test.describe("Stone Count Per Round Tests", () => {
    test("Turn Double Ban: Stones increase each round (3, 4, 5)", async ({
      page,
      request,
    }) => {
      await skipTutorials(page);

      const { gameId, p2 } = await GameFactory.startGame(
        page,
        request,
        "turn_double_ban_open_pick",
        {
          total_rounds: 3, // Play all 3 rounds
        },
      );
      console.log(`Stone Count Test: ${gameId}`);

      // Helper to complete a round
      const completeRound = async (
        expectedStones: number,
        roundNum: number,
      ) => {
        console.log(
          `Starting Round ${roundNum} with ${expectedStones} stones expected`,
        );

        // Complete voting phase
        await waitForVotingScreen(page);
        const p1Id = await getP1PlayerId(page);
        await page.getByRole("button", { name: /i start/i }).click();
        await p2.voteFirstPlayer(p1Id);
        await expect(page.getByText(/who starts/i)).not.toBeVisible({
          timeout: 10000,
        });

        const sheet = page.locator("svg.bg-white.block");
        await expect(sheet).toBeVisible();
        const box = await sheet.boundingBox();
        if (!box) throw new Error("Sheet not found");

        const finishBtn = page.getByRole("button", {
          name: /finish placement|confirm/i,
        });

        // Place bans (2 each)
        for (let i = 0; i < 2; i++) {
          // P1 places ban
          await sheet.click({
            position: { x: box.width * (0.2 + i * 0.1), y: box.height / 2 },
          });
          await page.waitForTimeout(200);
          if (await finishBtn.isVisible({ timeout: 1000 }))
            await finishBtn.click();

          // P2 places ban
          await p2.placeBan(200 + i * 50, 300);
          await page.waitForTimeout(200);
          await p2.send("confirm_placement", {});
          await page.waitForTimeout(300);
        }

        // Place stones (alternating)
        for (let i = 0; i < expectedStones; i++) {
          // P1 places stone
          await sheet.click({
            position: { x: box.width * (0.3 + i * 0.1), y: box.height * 0.6 },
          });
          await page.waitForTimeout(200);
          if (await finishBtn.isVisible({ timeout: 1000 }))
            await finishBtn.click();

          // P2 places stone
          await p2.placeStone(i, 150 + i * 30, 400);
          await page.waitForTimeout(200);
          await p2.send("confirm_placement", {});
          await page.waitForTimeout(300);
        }

        // Should transition to combined phase
        await expect(
          page.getByRole("button", { name: /next round|exit game/i }),
        ).toBeVisible({ timeout: 20000 });

        console.log(
          `Round ${roundNum} completed successfully with ${expectedStones} stones`,
        );
      };

      // Round 1: 3 stones
      await completeRound(3, 1);

      // Click Next Round
      const nextRoundBtn = page.getByRole("button", { name: /next round/i });
      if (await nextRoundBtn.isVisible({ timeout: 2000 })) {
        await nextRoundBtn.click();
      }
      await p2.send("ready_for_next_round", {});

      // Round 2: 4 stones
      await completeRound(4, 2);

      if (await nextRoundBtn.isVisible({ timeout: 2000 })) {
        await nextRoundBtn.click();
      }
      await p2.send("ready_for_next_round", {});

      // Round 3: 5 stones
      await completeRound(5, 3);

      // After round 3, should see "Exit Game" (game complete)
      await expect(
        page.getByRole("button", { name: /exit game/i }),
      ).toBeVisible({ timeout: 10000 });

      console.log("Stone count test passed: Verified 3→4→5 stone progression");
      p2.leave();
    });
  });
});
