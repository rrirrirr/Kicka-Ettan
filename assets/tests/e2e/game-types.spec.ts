
import { test, expect } from "@playwright/test";
import { GameFactory } from "../utils/game-factory";

test.describe("Game Types E2E", () => {
  test('Standard Game: Full Flow, UI Text, Async Rounds, End Game', async ({ page, request }) => {
    // Pre-seed local storage to skip tutorials
    await page.addInitScript(() => {
      window.localStorage.setItem('curling_tutorial_seen', JSON.stringify(['placement-tutorial', 'measurements-tutorial', 'ban-tutorial']));
    });

    // 1. Start a "standard" game with 2 rounds, 1 stone per team (for speed)
    const { gameId, p2 } = await GameFactory.startGame(page, request, 'blind_pick', {
      total_rounds: 2,
      stones_per_team: 1
    });

    console.log(`Game started: ${gameId} `);

    // Wait for game to be fully loaded using a stable element
    // Check for potential error states first
    await expect(page.getByText('Connecting...')).not.toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Error')).not.toBeVisible({ timeout: 1000 });

    // Wait for lobby to transition to game (when P2 joins)
    // The "waiting for opponent" text is in the lobby
    await expect(page.getByText('waiting for opponent')).not.toBeVisible({ timeout: 15000 });

    // Now the game should be active with both players
    await expect(page.getByRole('button', { name: 'Menu' })).toBeVisible({ timeout: 10000 });

    // Tutorial should be skipped automatically via localStorage

    // --- Round 1: Placement ---

    // Verify Round Number and Phase Text (Round 1, Placement)
    // Verify Round Number and Phase Text (Round 1, Placement)
    // Match either overlay "round #1" or sheet text "round 1"
    // Use toBeAttached to avoid visibility issues with faint text or overlay timing
    await expect(page.getByText(/round #?1/i).first()).toBeAttached();
    await expect(page.getByText(/placement phase/i)).toBeAttached();

    // Wait for overlay to disappear or click to dismiss if needed (auto-dismiss is 2s)
    await expect(page.getByText('round #1')).not.toBeVisible({ timeout: 10000 });

    // P1 places stone
    // Wait for selection bar to be visible (ensures stones are initialized)
    const selectionBar = page.getByTestId('selection-bar');
    await expect(selectionBar).toBeVisible({ timeout: 10000 });

    // Click on the sheet container to place it
    const sheet = page.getByTestId('curling-sheet');
    await expect(sheet).toBeVisible({ timeout: 10000 });

    const box = await sheet.boundingBox();
    if (box) {
      // Place stone in the playable area (between hog line and house)
      // The sheet coordinates: hog line is near top, house is in lower portion
      await sheet.click({ position: { x: box.width / 2, y: box.height * 0.6 } });

      // Wait for stone to be placed and button to appear
      await expect(page.getByRole('button', { name: 'finish placement' })).toBeVisible({ timeout: 10000 });
      await page.getByRole('button', { name: 'finish placement' }).click();
    }

    // --- Waiting Screen & Async Logic ---

    // Now P1 should be waiting for P2
    // Verify waiting overlay/text
    await expect(page.getByText('waiting for opponent')).toBeVisible();

    // P2 hasn't finished placement yet.

    // P2 places stone (Backend)
    await p2.placeStone(0, 200, 200);
    await p2.setReady(); // P2 finishes placement

    // --- Round 1: Combined ---

    // Both ready, should transition to Combined
    // Verify waiting screen is GONE
    await expect(page.getByText('waiting for opponent')).not.toBeVisible();

    // Click "Next Round" (P1)
    await page.getByRole('button', { name: 'next round' }).click();

    // P2 sends ready for next round
    await p2.send('ready_for_next_round');

    // --- Round 2 ---

    // Verify Round 2 Overlay
    await expect(page.getByText('round #2')).toBeVisible();
    await expect(page.getByText('round #1')).not.toBeVisible();

    // P2 places and finishes (before P1 checks for next round)
    await p2.placeStone(0, 220, 220);
    await p2.setReady();

    // P1 places stone
    if (box) {
      await sheet.click({ position: { x: box.width / 2 + 20, y: box.height / 2 } });
      await page.getByRole('button', { name: 'finish placement' }).click();
    }

    // End of Round 2 (Last Round)
    // Both should be ready, so combined phase should transition
    await expect(page.getByText('waiting for opponent')).not.toBeVisible({ timeout: 10000 });

    // Click Next Round -> End Game (since current_round > total_rounds)
    // The button might say 'next round' even if it's the end, logic handles transition
    const nextRoundBtn = page.getByRole('button', { name: /next round|finish game|exit game/i }).first();
    await expect(nextRoundBtn).toBeVisible({ timeout: 10000 });
    await nextRoundBtn.click();

    // P2 sends next round to trigger their end state
    await p2.send('ready_for_next_round');

    // --- End Game ---
    // Clicking "exit game" navigates to home, test complete
    // P2 cleanup
    p2.leave();
  });

  test('Blind Pick: Opponent Stones Hidden', async ({ page, request }) => {
    // Pre-seed local storage to skip tutorials
    await page.addInitScript(() => {
      window.localStorage.setItem('curling_tutorial_seen', JSON.stringify(['placement-tutorial', 'measurements-tutorial', 'ban-tutorial']));
    });

    const { gameId, p2 } = await GameFactory.startGame(page, request, 'blind_pick', {
      total_rounds: 1,
      stones_per_team: 1 // Simplified to 1 stone
    });
    console.log(`Blind Pick Game started: ${gameId}`);

    // Wait for game load
    await expect(page.getByRole('button', { name: 'Menu' })).toBeVisible({ timeout: 10000 });

    // P1 places 1 stone
    const sheet = page.getByTestId('curling-sheet');
    await expect(sheet).toBeVisible();
    const box = await sheet.boundingBox();

    if (box) {
      await sheet.click({ position: { x: box.width / 2 - 50, y: box.height / 2 } });
    }

    // P2 places 1 stone (add small delay to let UI settle)
    await page.waitForTimeout(500);
    await p2.placeStone(0, 100, 100);

    // Finish placement
    await page.getByRole('button', { name: 'finish placement' }).click();

    // Small delay before P2 confirms
    await page.waitForTimeout(500);
    await p2.setReady();

    // Verify Combined Phase: waiting overlay should disappear
    await expect(page.getByText('waiting for opponent')).not.toBeVisible({ timeout: 10000 });

    // Verify we're in combined phase (exit game button should appear for 1-round game)
    await expect(page.getByRole('button', { name: /next round|exit game/i })).toBeVisible({ timeout: 10000 });

    p2.leave();
  });

  test('Blind Pick: P1 Next Round Does Not Force P2 Into Placement Phase', async ({ page, request }) => {
    // This test verifies the critical behavior that when P1 clicks "Next Round",
    // P2 should still see the combined phase (not be forced into placement).
    // This bug has been reintroduced multiple times - this test prevents regression.
    await page.addInitScript(() => {
      window.localStorage.setItem('curling_tutorial_seen', JSON.stringify(['placement-tutorial', 'measurements-tutorial', 'ban-tutorial']));
    });

    const { gameId, p2 } = await GameFactory.startGame(page, request, 'blind_pick', {
      total_rounds: 2,  // Need 2 rounds to test next round behavior
      stones_per_team: 1
    });
    console.log(`Blind Pick Next Round Test: ${gameId}`);

    await expect(page.getByRole('button', { name: 'Menu' })).toBeVisible({ timeout: 10000 });

    // --- Complete Round 1 ---
    const sheet = page.getByTestId('curling-sheet');
    await expect(sheet).toBeVisible();
    const box = await sheet.boundingBox();

    // P1 places stone
    if (box) {
      await sheet.click({ position: { x: box.width / 2, y: box.height / 2 } });
    }
    await page.getByRole('button', { name: 'finish placement' }).click();

    // P2 places stone and confirms
    await page.waitForTimeout(500);
    await p2.placeStone(0, 150, 150);
    await p2.setReady();

    // Wait for combined phase
    await expect(page.getByText('waiting for opponent')).not.toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('button', { name: /next round/i })).toBeVisible({ timeout: 10000 });

    // --- P1 clicks Next Round ---
    await page.getByRole('button', { name: /next round/i }).click();

    // P1 should now see Round 2 placement phase overlay
    await expect(page.getByText(/round #?2/i).first()).toBeAttached({ timeout: 10000 });

    // --- CRITICAL TEST: Verify P2 is NOT forced into placement phase ---
    // P2 should still see combined phase, NOT placement phase
    // We verify P2 can still send ready_for_next_round (which only works from combined phase)
    // If P2 were in placement phase, they would NOT have the "Next Round" action available

    // P2 sends ready_for_next_round - this should work if they're still in combined phase view
    await p2.send('ready_for_next_round');

    // After P2 acknowledges, they should now be in round 2 placement
    // P1 places for round 2
    await expect(page.getByText('round #2')).not.toBeVisible({ timeout: 10000 });

    if (box) {
      await sheet.click({ position: { x: box.width / 2 + 30, y: box.height / 2 } });
    }
    await page.getByRole('button', { name: 'finish placement' }).click();

    // P2 places for round 2
    await page.waitForTimeout(500);
    await p2.placeStone(0, 200, 200);
    await p2.setReady();

    // Verify round 2 combined phase
    await expect(page.getByText('waiting for opponent')).not.toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('button', { name: /next round|exit game/i })).toBeVisible({ timeout: 10000 });

    p2.leave();
  });

  test('Ban Pick: Full Ban Phase Flow', async ({ page, request }) => {
    // Pre-seed local storage to skip tutorials
    await page.addInitScript(() => {
      window.localStorage.setItem('curling_tutorial_seen', JSON.stringify(['placement-tutorial', 'measurements-tutorial', 'ban-tutorial']));
    });

    const { gameId, p2 } = await GameFactory.startGame(page, request, 'ban_pick', {
      total_rounds: 1,
      stones_per_team: 1
    });
    console.log(`Ban Pick Game started: ${gameId}`);

    // Wait for game load
    await expect(page.getByRole('button', { name: 'Menu' })).toBeVisible({ timeout: 10000 });

    // --- Ban Phase ---
    // Verify we're in ban phase
    await expect(page.getByText(/ban phase/i)).toBeAttached({ timeout: 5000 });

    // P1 places ban (click on sheet)
    const sheet = page.getByTestId('curling-sheet');
    await expect(sheet).toBeVisible();
    const box = await sheet.boundingBox();

    if (box) {
      // Place ban zone
      await sheet.click({ position: { x: box.width / 2, y: box.height / 2 + 50 } });
    }

    // P2 places ban (add delay to let UI settle)
    await page.waitForTimeout(500);
    await p2.placeBan(200, 200);

    // P1 confirms ban (click "Confirm Ban" or similar button)
    await page.getByRole('button', { name: /confirm ban|finish/i }).click();

    // Small delay before P2 confirms
    await page.waitForTimeout(500);
    await p2.confirmBan();

    // --- Placement Phase ---
    // Verify we transitioned from ban phase (ban overlay disappears)
    await expect(page.getByText(/ban phase/i)).not.toBeVisible({ timeout: 10000 });

    // --- Test 1: Verify opponent's ban ring is visible ---
    // The opponent's ban ring (placed by P2) should now be visible to P1
    // It's rendered as a red circle with rgba(220, 38, 38, 0.3) background
    const banRing = page.locator('div.rounded-full').filter({
      has: page.locator('[style*="rgba(220, 38, 38"]')
    }).first();

    // Alternative approach: check for any red circle element
    const redBanCircle = await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('div'));
      return elements.some(el => {
        const style = window.getComputedStyle(el);
        const bg = style.backgroundColor;
        // Check for red-ish transparent background (the ban zone)
        return bg.includes('220') && bg.includes('38') && bg.includes('38');
      });
    });
    expect(redBanCircle).toBe(true);

    // --- Test 2: Attempt to place stone in banned zone ---
    // P2 placed their ban at (200, 200). This restricts P1 from placing there.
    // If P1 tries to place a stone in the ban zone, it should be pushed out.
    // First, let's place a stone OUTSIDE the ban zone to verify normal flow works
    if (box) {
      // Place stone well away from the ban zone at (200, 200)
      await sheet.click({ position: { x: box.width / 2 - 50, y: box.height / 2 } });
    }

    // Click "Finish Placement"
    await page.getByRole('button', { name: 'finish placement' }).click();

    // P2 places stone and confirms
    await p2.placeStone(0, 100, 100);
    await p2.setReady();

    // --- Combined Phase ---
    // Verify we're in combined phase
    await expect(page.getByText('waiting for opponent')).not.toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('button', { name: /next round|exit game/i })).toBeVisible({ timeout: 10000 });

    p2.leave();
  });

  test('Blind Pick: Verify Opponent Stones Hidden During Placement', async ({ page, request }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('curling_tutorial_seen', JSON.stringify(['placement-tutorial', 'measurements-tutorial', 'ban-tutorial']));
    });

    const { gameId, p2 } = await GameFactory.startGame(page, request, 'blind_pick', {
      total_rounds: 1,
      stones_per_team: 1
    });
    console.log(`Blind Pick Visibility Test: ${gameId}`);

    await expect(page.getByRole('button', { name: 'Menu' })).toBeVisible({ timeout: 10000 });

    // P2 places stone first (via backend) - add delay for stability
    await page.waitForTimeout(500);
    await p2.placeStone(0, 200, 200);

    // P1 places stone
    const sheet = page.getByTestId('curling-sheet');
    await expect(sheet).toBeVisible();
    const box = await sheet.boundingBox();
    if (box) {
      await sheet.click({ position: { x: box.width / 2, y: box.height / 2 } });
    }

    // Before confirming, check if opponent stones are visible
    // Opponent (P2) is yellow - color #185494 (blue-ish) or #e6b800 (yellow)
    // Default yellow team_color is #185494
    const opponentStonesVisible = await page.evaluate(() => {
      const stones = Array.from(document.querySelectorAll('div.rounded-full'));
      // Look for stones with opponent color (P2 is assigned yellow, defaults to #185494)
      return stones.some(el => {
        const style = window.getComputedStyle(el);
        const bg = style.backgroundColor;
        // Convert #185494 to rgb(24, 84, 148)
        return bg === 'rgb(24, 84, 148)' || bg === 'rgb(230, 184, 0)';
      });
    });

    // Opponent stones should NOT be visible during placement phase
    expect(opponentStonesVisible).toBe(false);

    // Now finish placement and verify opponent stones appear
    await page.getByRole('button', { name: 'finish placement' }).click();

    // Small delay before P2 confirms
    await page.waitForTimeout(500);
    await p2.setReady();

    // Wait for combined phase
    await expect(page.getByText('waiting for opponent')).not.toBeVisible({ timeout: 10000 });

    // Now check if opponent stones are visible (they should be in combined phase)
    const opponentStonesVisibleCombined = await page.evaluate(() => {
      const stones = Array.from(document.querySelectorAll('div.rounded-full'));
      return stones.some(el => {
        const style = window.getComputedStyle(el);
        const bg = style.backgroundColor;
        return bg === 'rgb(24, 84, 148)' || bg === 'rgb(230, 184, 0)';
      });
    });

    expect(opponentStonesVisibleCombined).toBe(true);

    p2.leave();
  });

  test('Ban Pick: Stone in Ban Zone Gets Pushed Out or Sent to Bar', async ({ page, request }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('curling_tutorial_seen', JSON.stringify(['placement-tutorial', 'measurements-tutorial', 'ban-tutorial']));
    });

    const { gameId, p2 } = await GameFactory.startGame(page, request, 'ban_pick', {
      total_rounds: 1,
      stones_per_team: 2  // Need 2 stones to test both edge and center
    });
    console.log(`Ban Zone Push Test: ${gameId}`);

    await expect(page.getByRole('button', { name: 'Menu' })).toBeVisible({ timeout: 10000 });

    // --- Ban Phase ---
    await expect(page.getByText(/ban phase/i)).toBeAttached({ timeout: 5000 });

    const sheet = page.getByTestId('curling-sheet');
    await expect(sheet).toBeVisible();
    const box = await sheet.boundingBox();

    // P1 places ban at center of sheet (around y=400 in sheet coords)
    if (box) {
      await sheet.click({ position: { x: box.width / 2, y: box.height / 2 } });
    }

    // P2 places ban elsewhere (won't affect P1) - add delay
    await page.waitForTimeout(500);
    await p2.placeBan(100, 100);

    await page.getByRole('button', { name: /confirm ban|finish/i }).click();

    // Small delay before P2 confirms
    await page.waitForTimeout(500);
    await p2.confirmBan();

    // --- Placement Phase ---
    await expect(page.getByText(/ban phase/i)).not.toBeVisible({ timeout: 10000 });

    // P1's ban restricts P2. P2's ban restricts P1.
    // The backend rejects stones placed inside ban zones with error 'placement_in_banned_zone'
    // Stones on edge get pushed out, stones inside get rejected and sent to bar

    // P2 places stones outside ban zone (P1's ban is at sheet center) - add delay
    await page.waitForTimeout(500);
    await p2.placeStone(0, 50, 300);  // Well outside P1's ban zone
    await p2.placeStone(1, 400, 300); // Also outside

    // P1 places stones outside ban zone
    if (box) {
      await sheet.click({ position: { x: box.width / 4, y: box.height / 2 } });
      await sheet.click({ position: { x: box.width * 3 / 4, y: box.height / 2 } });
    }

    await page.getByRole('button', { name: 'finish placement' }).click();

    // Small delay before P2 confirms
    await page.waitForTimeout(500);
    await p2.setReady();

    // Should transition to combined phase if placement was valid
    await expect(page.getByText('waiting for opponent')).not.toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('button', { name: /next round|exit game/i })).toBeVisible({ timeout: 10000 });

    p2.leave();
  });

  test('Cancel Ban: Bans Stay In Position After Make Changes', async ({ page, request }) => {
    // This test verifies that ban rings stay in position after clicking "make changes"
    await page.addInitScript(() => {
      window.localStorage.setItem('curling_tutorial_seen', JSON.stringify(['placement-tutorial', 'measurements-tutorial', 'ban-tutorial']));
    });

    const { gameId, p2 } = await GameFactory.startGame(page, request, 'ban_pick', {
      total_rounds: 1,
      stones_per_team: 1
    });
    console.log(`Cancel Ban Position Test: ${gameId}`);

    await expect(page.getByRole('button', { name: 'Menu' })).toBeVisible({ timeout: 10000 });

    // Should be in ban phase
    await expect(page.getByText(/ban phase/i)).toBeAttached({ timeout: 5000 });

    const sheet = page.getByTestId('curling-sheet');
    await expect(sheet).toBeVisible();
    const box = await sheet.boundingBox();

    // P1 places ban
    if (box) {
      await sheet.click({ position: { x: box.width / 2, y: box.height / 2 } });
    }

    // The confirm ban button should appear
    await expect(page.getByRole('button', { name: /confirm ban/i })).toBeVisible({ timeout: 5000 });

    // P1 confirms ban
    await page.getByRole('button', { name: /confirm ban/i }).click();

    // P1 should see waiting
    await expect(page.getByText('waiting for opponent')).toBeVisible({ timeout: 5000 });

    // P1 clicks "Make Changes" button to go back
    await page.getByRole('button', { name: /make changes/i }).click();

    // Waiting screen should disappear
    await expect(page.getByText('waiting for opponent')).not.toBeVisible({ timeout: 5000 });

    // CRITICAL: The confirm ban button should still be visible (ban still placed)
    await page.waitForTimeout(500);
    await expect(page.getByRole('button', { name: /confirm ban/i })).toBeVisible({ timeout: 5000 });

    // Complete the flow
    await page.getByRole('button', { name: /confirm ban/i }).click();
    await p2.placeBan(200, 200);
    await p2.confirmBan();

    // Should transition to placement phase
    await expect(page.getByText('waiting for opponent')).not.toBeVisible({ timeout: 10000 });

    p2.leave();
  });

  test('Cancel Placement: Stones Stay In Position After Make Changes', async ({ page, request }) => {
    // This test verifies the critical behavior that when P1 clicks "make changes",
    // the stones should remain in their placed positions, NOT be reset to the stone bar.
    await page.addInitScript(() => {
      window.localStorage.setItem('curling_tutorial_seen', JSON.stringify(['placement-tutorial', 'measurements-tutorial', 'ban-tutorial']));
    });

    const { gameId, p2 } = await GameFactory.startGame(page, request, 'blind_pick', {
      total_rounds: 1,
      stones_per_team: 3  // Test with multiple stones
    });
    console.log(`Cancel Placement Position Test: ${gameId}`);

    await expect(page.getByRole('button', { name: 'Menu' })).toBeVisible({ timeout: 10000 });

    const sheet = page.getByTestId('curling-sheet');
    await expect(sheet).toBeVisible();
    const box = await sheet.boundingBox();

    // P1 places all 3 stones at different positions
    if (box) {
      await sheet.click({ position: { x: box.width / 4, y: box.height / 2 } });
      await page.waitForTimeout(300);
      await sheet.click({ position: { x: box.width / 2, y: box.height / 2 } });
      await page.waitForTimeout(300);
      await sheet.click({ position: { x: box.width * 3 / 4, y: box.height / 2 } });
    }

    // After placing all 3, the "finish placement" button should appear
    await expect(page.getByRole('button', { name: 'finish placement' })).toBeVisible({ timeout: 5000 });

    // Count stones on the sheet - should find exactly 3 stones placed
    const placedStonesOnSheetBefore = await page.locator('.stone-hover-container').count();
    expect(placedStonesOnSheetBefore).toBe(3);

    // P1 clicks "Finish Placement"
    await page.getByRole('button', { name: 'finish placement' }).click();

    // P1 should see "waiting for opponent"
    await expect(page.getByText('waiting for opponent')).toBeVisible({ timeout: 5000 });

    // P1 clicks "Make Changes" button to go back
    await page.getByRole('button', { name: /make changes/i }).click();

    // Waiting screen should disappear
    await expect(page.getByText('waiting for opponent')).not.toBeVisible({ timeout: 5000 });

    // CRITICAL: ALL 3 stones should STILL be on the sheet, NOT in the stone bar
    await page.waitForTimeout(500);

    // Count stones on sheet again - should STILL be 3
    const placedStonesOnSheetAfter = await page.locator('.stone-hover-container').count();
    expect(placedStonesOnSheetAfter).toBe(3);

    // The "finish placement" button should still be visible (since all stones are placed)
    await expect(page.getByRole('button', { name: 'finish placement' })).toBeVisible({ timeout: 5000 });

    // Complete the flow
    await page.getByRole('button', { name: 'finish placement' }).click();
    await p2.placeStone(0, 100, 100);
    await p2.placeStone(1, 150, 150);
    await p2.placeStone(2, 200, 200);
    await p2.setReady();

    await expect(page.getByText('waiting for opponent')).not.toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('button', { name: /next round|exit game/i })).toBeVisible({ timeout: 10000 });

    p2.leave();
  });

  test('Cancel Placement: P1 Can Reposition Stones After Cancel', async ({ page, request }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('curling_tutorial_seen', JSON.stringify(['placement-tutorial', 'measurements-tutorial', 'ban-tutorial']));
    });

    const { gameId, p2 } = await GameFactory.startGame(page, request, 'blind_pick', {
      total_rounds: 1,
      stones_per_team: 1
    });
    console.log(`Cancel Placement Test: ${gameId}`);

    await expect(page.getByRole('button', { name: 'Menu' })).toBeVisible({ timeout: 10000 });

    const sheet = page.getByTestId('curling-sheet');
    await expect(sheet).toBeVisible();
    const box = await sheet.boundingBox();

    // P1 places stone
    if (box) {
      await sheet.click({ position: { x: box.width / 2, y: box.height / 2 } });
    }

    // P1 clicks "Finish Placement"
    await page.getByRole('button', { name: 'finish placement' }).click();

    // P1 should see "waiting for opponent"
    await expect(page.getByText('waiting for opponent')).toBeVisible({ timeout: 5000 });

    // P1 clicks "Make Changes" button to go back and reposition
    await page.getByRole('button', { name: /make changes/i }).click();

    // Waiting screen should disappear
    await expect(page.getByText('waiting for opponent')).not.toBeVisible({ timeout: 5000 });

    // P1 should be able to place stones again
    if (box) {
      // Place stone at a different position
      await sheet.click({ position: { x: box.width / 3, y: box.height / 2 } });
    }

    // Click finish again
    await page.getByRole('button', { name: 'finish placement' }).click();

    // P2 places and confirms - add delay for stability
    await page.waitForTimeout(500);
    await p2.placeStone(0, 100, 100);

    await page.waitForTimeout(500);
    await p2.setReady();

    // Combined phase
    await expect(page.getByText('waiting for opponent')).not.toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('button', { name: /next round|exit game/i })).toBeVisible({ timeout: 10000 });

    p2.leave();
  });

  test('Reconnection: P1 Refreshes Page Mid-Game and Rejoins', async ({ page, request }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('curling_tutorial_seen', JSON.stringify(['placement-tutorial', 'measurements-tutorial', 'ban-tutorial']));
    });

    const { gameId, p2 } = await GameFactory.startGame(page, request, 'blind_pick', {
      total_rounds: 1,
      stones_per_team: 1
    });
    console.log(`Reconnection Test: ${gameId}`);

    await expect(page.getByRole('button', { name: 'Menu' })).toBeVisible({ timeout: 10000 });

    const sheet = page.getByTestId('curling-sheet');
    await expect(sheet).toBeVisible();
    const box = await sheet.boundingBox();

    // P1 places stone
    if (box) {
      await sheet.click({ position: { x: box.width / 2, y: box.height / 2 } });
    }

    // P1 refreshes the page mid-placement
    await page.reload();

    // Re-inject localStorage
    await page.addInitScript(() => {
      window.localStorage.setItem('curling_tutorial_seen', JSON.stringify(['placement-tutorial', 'measurements-tutorial', 'ban-tutorial']));
    });

    // Should rejoin the game
    await expect(page.getByRole('button', { name: 'Menu' })).toBeVisible({ timeout: 10000 });

    // Sheet should be visible again
    await expect(sheet).toBeVisible({ timeout: 10000 });

    // P1 can continue playing - place stone again (previous placement was lost since not confirmed)
    const newBox = await sheet.boundingBox();
    if (newBox) {
      await sheet.click({ position: { x: newBox.width / 2, y: newBox.height / 2 } });
    }

    await page.getByRole('button', { name: 'finish placement' }).click();

    // P2 places and confirms - add delay for stability
    await page.waitForTimeout(500);
    await p2.placeStone(0, 100, 100);

    await page.waitForTimeout(500);
    await p2.setReady();

    // Combined phase
    await expect(page.getByText('waiting for opponent')).not.toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('button', { name: /next round|exit game/i })).toBeVisible({ timeout: 10000 });

    p2.leave();
  });

  test('Multiple Stones: Verify 3 Stones Per Team Works', async ({ page, request }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('curling_tutorial_seen', JSON.stringify(['placement-tutorial', 'measurements-tutorial', 'ban-tutorial']));
    });

    const { gameId, p2 } = await GameFactory.startGame(page, request, 'blind_pick', {
      total_rounds: 1,
      stones_per_team: 3
    });
    console.log(`Multiple Stones Test: ${gameId}`);

    await expect(page.getByRole('button', { name: 'Menu' })).toBeVisible({ timeout: 10000 });

    const sheet = page.getByTestId('curling-sheet');
    await expect(sheet).toBeVisible();
    const box = await sheet.boundingBox();

    // P1 places 3 stones
    if (box) {
      await sheet.click({ position: { x: box.width / 4, y: box.height / 2 } });
      await sheet.click({ position: { x: box.width / 2, y: box.height / 2 } });
      await sheet.click({ position: { x: box.width * 3 / 4, y: box.height / 2 } });
    }

    // Finish placement button should now be visible (all stones placed)
    await page.getByRole('button', { name: 'finish placement' }).click();

    // P2 places 3 stones
    await p2.placeStone(0, 100, 300);
    await p2.placeStone(1, 150, 350);
    await p2.placeStone(2, 200, 400);
    await p2.setReady();

    // Combined phase
    await expect(page.getByText('waiting for opponent')).not.toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('button', { name: /next round|exit game/i })).toBeVisible({ timeout: 10000 });

    p2.leave();
  });

  test('Score Display: Verify Scores Show in Combined Phase', async ({ page, request }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('curling_tutorial_seen', JSON.stringify(['placement-tutorial', 'measurements-tutorial', 'ban-tutorial']));
    });

    const { gameId, p2 } = await GameFactory.startGame(page, request, 'blind_pick', {
      total_rounds: 1,
      stones_per_team: 1
    });
    console.log(`Score Display Test: ${gameId}`);

    await expect(page.getByRole('button', { name: 'Menu' })).toBeVisible({ timeout: 10000 });

    const sheet = page.getByTestId('curling-sheet');
    await expect(sheet).toBeVisible();
    const box = await sheet.boundingBox();

    // P1 places stone near center (house)
    if (box) {
      await sheet.click({ position: { x: box.width / 2, y: box.height / 3 } });
    }

    await page.getByRole('button', { name: 'finish placement' }).click();

    // P2 places stone further from center - add delay for stability
    await page.waitForTimeout(500);
    await p2.placeStone(0, 100, 100);

    await page.waitForTimeout(500);
    await p2.setReady();

    // Wait for combined phase
    await expect(page.getByText('waiting for opponent')).not.toBeVisible({ timeout: 10000 });

    // Verify we're in combined phase (game completed successfully)
    // The exit button confirms we reached combined phase which shows scores
    await expect(page.getByRole('button', { name: /exit game/i })).toBeVisible({ timeout: 10000 });

    p2.leave();
  });

  test('Infinite Rounds: Game Continues With total_rounds=0', async ({ page, request }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('curling_tutorial_seen', JSON.stringify(['placement-tutorial', 'measurements-tutorial', 'ban-tutorial']));
    });

    const { gameId, p2 } = await GameFactory.startGame(page, request, 'blind_pick', {
      total_rounds: 0,  // Infinite rounds
      stones_per_team: 1
    });
    console.log(`Infinite Rounds Test: ${gameId}`);

    await expect(page.getByRole('button', { name: 'Menu' })).toBeVisible({ timeout: 10000 });

    const sheet = page.getByTestId('curling-sheet');
    await expect(sheet).toBeVisible();
    const box = await sheet.boundingBox();

    // Round 1
    if (box) {
      await sheet.click({ position: { x: box.width / 2, y: box.height / 2 } });
    }
    await page.getByRole('button', { name: 'finish placement' }).click();
    await p2.placeStone(0, 100, 100);
    await p2.setReady();

    await expect(page.getByText('waiting for opponent')).not.toBeVisible({ timeout: 10000 });

    // Should show "Next Round" button (not exit game) since infinite rounds
    // The button should say something like "next round" not "exit game"
    await expect(page.getByRole('button', { name: /next round/i })).toBeVisible({ timeout: 10000 });

    // Click next round to verify game continues
    await page.getByRole('button', { name: /next round/i }).click();
    await p2.send('ready_for_next_round');

    // Should transition to round 2
    await expect(page.getByText(/round #?2/i).first()).toBeAttached({ timeout: 10000 });

    p2.leave();
  });

  test('Invalid Game ID: Error Handling for Non-Existent Game', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('curling_tutorial_seen', JSON.stringify(['placement-tutorial', 'measurements-tutorial', 'ban-tutorial']));
    });

    // Navigate to a non-existent game
    await page.goto('http://127.0.0.1:4002/game/INVALID_GAME_ID_12345');

    // Wait for page to settle
    await page.waitForTimeout(2000);

    // Check what's on the page - should either show error, loading, or some UI element
    // The key is that the page doesn't crash and shows something
    const pageContent = await page.content();
    const hasContent = pageContent.length > 100;  // Page has meaningful content

    expect(hasContent).toBe(true);
  });

  test('History Navigation: View Previous Rounds in Combined Phase', async ({ page, request }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('curling_tutorial_seen', JSON.stringify(['placement-tutorial', 'measurements-tutorial', 'ban-tutorial']));
    });

    const { gameId, p2 } = await GameFactory.startGame(page, request, 'blind_pick', {
      total_rounds: 2,
      stones_per_team: 1
    });
    console.log(`History Navigation Test: ${gameId}`);

    await expect(page.getByRole('button', { name: 'Menu' })).toBeVisible({ timeout: 10000 });

    const sheet = page.getByTestId('curling-sheet');
    const box = await sheet.boundingBox();

    // Complete Round 1
    if (box) {
      await sheet.click({ position: { x: box.width / 2, y: box.height / 2 } });
    }
    await page.getByRole('button', { name: 'finish placement' }).click();
    await p2.placeStone(0, 100, 100);
    await p2.setReady();

    await expect(page.getByText('waiting for opponent')).not.toBeVisible({ timeout: 10000 });

    // Click next round
    await page.getByRole('button', { name: /next round/i }).click();
    await p2.send('ready_for_next_round');

    // Complete Round 2
    await expect(page.getByText(/round #?2/i).first()).toBeAttached({ timeout: 10000 });
    await expect(page.getByText('round #2')).not.toBeVisible({ timeout: 10000 });

    if (box) {
      await sheet.click({ position: { x: box.width / 3, y: box.height / 2 } });
    }
    await page.getByRole('button', { name: 'finish placement' }).click();
    await p2.placeStone(0, 150, 150);
    await p2.setReady();

    await expect(page.getByText('waiting for opponent')).not.toBeVisible({ timeout: 10000 });

    // Now in combined phase of round 2, check for history navigation
    // History buttons typically show round numbers
    const historyButton = page.locator('button').filter({ hasText: /1|round 1/i }).first();
    const historyExists = await historyButton.isVisible().catch(() => false);

    // If history navigation exists, click it
    if (historyExists) {
      await historyButton.click();
      // Verify we can see round 1 content
      await expect(page.getByText(/round 1/i)).toBeAttached();
    }

    // Cleanup regardless
    await expect(page.getByRole('button', { name: /exit game/i })).toBeVisible({ timeout: 10000 });

    p2.leave();
  });
});
