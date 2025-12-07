import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import CurlingSheet from "./CurlingSheet";
import { Dialog } from "./ui/Dialog";
import { BottomSheet } from "./ui/BottomSheet";
import { Button } from "./ui/Button";
import DraggableStone from "./DraggableStone";
import StoneSelectionBar from "./StoneSelectionBar";
import { StoneMeasurements } from "./StoneMeasurements";
import {
  SettingsProvider,
  useSettings,
  SHEET_STYLES,
} from "../contexts/SettingsContext";
import { SettingsDialog } from "./SettingsDialog";
import { Channel } from "phoenix";
import {
  SHEET_WIDTH,
  STONE_RADIUS,
  VIEW_TOP_OFFSET,
  HOG_LINE_OFFSET,
  BACK_LINE_OFFSET,
  HOG_LINE_WIDTH,
  HOUSE_RADIUS_12,
  NEAR_HOUSE_THRESHOLD,
} from "../utils/constants";
import { resolveCollisions } from "../utils/physics";
import { useGameDimensions } from "../hooks/useGameDimensions";
import { GameState, StonePosition, PlayerColor } from "../types/game-types";

interface CurlingGameProps {
  gameState: GameState;
  playerId?: string;
  channel?: Channel;
  onShare?: () => void;
}

type GestureState =
  | { type: "IDLE" }
  | {
      type: "PENDING";
      stoneIndex: number;
      startX: number;
      startY: number;
      timerId: number;
      source: "pickup" | "placement";
      startTime: number;
    }
  | { type: "DRAGGING"; stoneIndex: number };

import {
  Menu,
  History as HistoryIcon,
  Info,
  LogOut,
  Share2,
  Ruler,
  X,
  Settings,
} from "lucide-react";
import { Loupe } from "./Loupe";
import { StoneInspector } from "./StoneInspector";
import { MeasurementType } from "../contexts/SettingsContext";
import { motion, AnimatePresence } from "framer-motion";
import { RoundStartOverlay } from "./RoundStartOverlay";
import { TutorialProvider } from "../contexts/TutorialContext";
import { PhaseTutorial } from "./tutorial";

// ... existing imports ...

const CurlingGameContent = ({
  gameState,
  playerId,
  channel,
  onShare,
}: CurlingGameProps) => {
  const { settings, openSettings, sheetSettings, isSettingsOpen } =
    useSettings();
  const [myStones, setMyStones] = useState<StonePosition[]>([]);
  const [myColor, setMyColor] = useState<"red" | "yellow" | null>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const [isReady, setIsReady] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [selectedHistoryRound, setSelectedHistoryRound] = useState<
    number | null
  >(null);
  const [showRoundStartOverlay, setShowRoundStartOverlay] = useState(false);
  const [waitingMinTimeElapsed, setWaitingMinTimeElapsed] = useState(true);
  const waitingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const prevRoundRef = useRef<number>(
    gameState.current_round === 1 ? 0 : gameState.current_round,
  );

  const { containerRef, sheetDimensions, scale } = useGameDimensions();
  const [highlightedStone, setHighlightedStone] = useState<{
    color: "red" | "yellow";
    index: number;
    stepIndex: number;
    activeTypes?: MeasurementType[];
  } | null>(null);
  const [hoveredStone, setHoveredStone] = useState<{
    color: "red" | "yellow";
    index: number;
  } | null>(null);
  const [showMeasurements, setShowMeasurements] = useState(false);
  const [dragState, setDragState] = useState<{
    isDragging: boolean;
    x: number;
    y: number;
    stoneIndex: number | null;
  }>({
    isDragging: false,
    x: 0,
    y: 0,
    stoneIndex: null,
  });
  // const [dragMode, setDragMode] = useState<'follow' | 'stay'>('follow'); // Removed unused dragMode
  const gestureState = useRef<GestureState>({ type: "IDLE" });
  const isHistoryMode = selectedHistoryRound !== null;

  // Handle Escape key logic (Close menu / Deselect stone)
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        console.log("Escape pressed", {
          showMenu,
          isSettingsOpen,
          showHelp,
          showRoundStartOverlay,
          highlightedStone,
        });

        // Priority 1: Menu
        if (showMenu) {
          console.log("Closing menu");
          setShowMenu(false);
          return;
        }

        // Priority 2: Dialogs/Overlays (Settings, Help, Round Start)
        // These typically handle their own close logic or block interaction
        if (isSettingsOpen || showHelp || showRoundStartOverlay) {
          console.log("Blocked by overlay");
          return;
        }

        // Priority 3: Deselect stone
        if (highlightedStone) {
          console.log("Deselecting stone");
          setHighlightedStone(null);
        } else {
          console.log("No stone to deselect");
        }
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [
    showMenu,
    isSettingsOpen,
    showHelp,
    showRoundStartOverlay,
    highlightedStone,
  ]);

  // Lock body scroll to prevent "double scroll" on mobile
  useEffect(() => {
    // Only apply on mobile/when fixed
    if (window.innerWidth < 768) {
      document.body.style.overflow = "hidden";
      document.body.style.overscrollBehavior = "none";
    }
    return () => {
      document.body.style.overflow = "";
      document.body.style.overscrollBehavior = "";
    };
  }, []);

  const [lastInitializedRound, setLastInitializedRound] = useState(0);

  // Initialize stones based on game state
  useEffect(() => {
    if (gameState && playerId) {
      const player = gameState.players.find((p) => p.id === playerId);
      if (player) {
        setMyColor(player.color);

        // Initialize stones if not already done or if round changed
        if (gameState.current_round > lastInitializedRound) {
          const initialStones = Array.from({
            length: gameState.stones_per_team,
          }).map((_, i) => ({
            index: i,
            x: 0,
            y: 0,
            placed: false,
            resetCount: 0,
          }));
          setMyStones(initialStones);
          setLastInitializedRound(gameState.current_round);
          setIsReady(false);
        }
      }

      // Check if we are ready
      if (gameState.player_ready && gameState.player_ready[playerId]) {
        setIsReady(true);
      } else {
        setIsReady(false);
      }
    }
  }, [gameState, playerId]);

  // Detect round transition and show overlay for BOTH players
  useEffect(() => {
    if (gameState && gameState.current_round > prevRoundRef.current) {
      // Round has increased - show the overlay
      setShowRoundStartOverlay(true);
      prevRoundRef.current = gameState.current_round;
    }
  }, [gameState?.current_round]);

  const updateStonePosition = useCallback(
    (index: number, x: number, y: number, placed: boolean) => {
      setMyStones((prev) =>
        prev.map((s) => (s.index === index ? { ...s, x, y, placed } : s)),
      );
    },
    [],
  );

  const handleStoneDragEnd = useCallback(
    (index: number, dropPoint: { x: number; y: number }) => {
      if (!sheetRef.current || isReady) return;

      const sheetRect = sheetRef.current.getBoundingClientRect();

      // Check if dropped within the sheet
      if (
        dropPoint.x >= sheetRect.left &&
        dropPoint.x <= sheetRect.right &&
        dropPoint.y >= sheetRect.top &&
        dropPoint.y <= sheetRect.bottom
      ) {
        // Find the stone to check if it was already placed

        // Convert drop point to logical coordinates (cm)
        // X: 0 to SHEET_WIDTH
        // Y: VIEW_TOP_OFFSET to VIEW_TOP_OFFSET + VIEW_BOTTOM_OFFSET (relative to tee line)
        // But our internal storage for x,y should probably be relative to the Tee Line (0,0) or top-left of sheet?
        // Let's store them as logical coordinates relative to the Tee Line (0,0 center) for consistency with backend?
        // OR, to match the SVG coordinate system we defined in CurlingSheet:
        // Origin (0,0) is Top-Left of the VIEWBOX.
        // ViewBox width = SHEET_WIDTH
        // ViewBox height = VIEW_TOP_OFFSET + VIEW_BOTTOM_OFFSET
        // Tee Line is at Y = VIEW_TOP_OFFSET
        // Center Line is at X = SHEET_WIDTH / 2

        // Let's store coordinates in the SVG coordinate system (0,0 top-left of view)
        // This makes rendering easier.

        let rawX, rawY;

        // Calculate relative position from drop point (pointer position)
        // We use this for BOTH new stones and existing stones to ensure the stone
        // lands exactly where the pointer/loupe center is.
        // This matches the visual behavior of the Proxy stone which is centered on the pointer.
        const relativeX = dropPoint.x - sheetRect.left;
        const relativeY = dropPoint.y - sheetRect.top;

        rawX = relativeX / scale;
        rawY = relativeY / scale;

        // Clamp to sheet boundaries (accounting for stone radius)
        // Valid Y range: Hog Line bottom edge to Back Line
        // Hog Line: Stone must not touch any part of the line (use bottom edge).
        // Back Line: We want to allow touching/overlapping, but not fully past.
        const hogLineY = VIEW_TOP_OFFSET - HOG_LINE_OFFSET;
        const hogLineBottomEdge = hogLineY + HOG_LINE_WIDTH / 2;
        const backLineY = VIEW_TOP_OFFSET + BACK_LINE_OFFSET;

        // MinY: Stone top edge must be at or below hog line bottom edge
        const minY = hogLineBottomEdge + STONE_RADIUS;

        // MaxY: Allow stone to touch back line with its edge.
        // Stone center can be at backLineY + STONE_RADIUS (bottom edge touches line).
        const maxY = backLineY + STONE_RADIUS;

        const clampedX = Math.max(
          STONE_RADIUS,
          Math.min(SHEET_WIDTH - STONE_RADIUS, rawX),
        );
        const clampedY = Math.max(minY, Math.min(maxY, rawY));

        // Resolve collisions
        const { x: resolvedX, y: resolvedY } = resolveCollisions(
          index,
          clampedX,
          clampedY,
          myStones,
        );

        updateStonePosition(index, resolvedX, resolvedY, true);
      } else {
        // Dropped outside - reset to bar
        setMyStones((prev) =>
          prev.map((s) =>
            s.index === index
              ? { ...s, placed: false, resetCount: (s.resetCount || 0) + 1 }
              : s,
          ),
        );
      }
      setDragState((prev) => ({
        ...prev,
        isDragging: false,
        stoneIndex: null,
      }));
    },
    [isReady, scale, myStones, updateStonePosition],
  );

  const handleStoneDrag = useCallback(
    (index: number, position: { x: number; y: number }) => {
      setDragState({
        isDragging: true,
        x: position.x,
        y: position.y,
        stoneIndex: index,
      });
    },
    [],
  );

  // Global pointer up handler to stop dragging
  useEffect(() => {
    const handleGlobalPointerUp = (e: PointerEvent) => {
      // Handle PENDING state (Click vs Drag decision)
      if (gestureState.current.type === "PENDING") {
        // Clear the long-press timer
        clearTimeout(gestureState.current.timerId);

        const { stoneIndex, startX, startY, source } = gestureState.current;
        const moveDist = Math.sqrt(
          Math.pow(e.clientX - startX, 2) + Math.pow(e.clientY - startY, 2),
        );

        // If we didn't move much, it's a CLICK
        if (moveDist < 5) {
          // If the source was 'placement', we have already placed the stone.
          // We should NOT do anything else (like selecting it or placing another one).
          if (source === "placement") {
            gestureState.current = { type: "IDLE" };
            return;
          }

          // Check if click was ON the stone or in the HALO
          // We need to recalculate the distance to the stone center in logical coordinates
          if (sheetRef.current) {
            const sheetRect = sheetRef.current.getBoundingClientRect();
            const clickX = e.clientX - sheetRect.left;
            const clickY = e.clientY - sheetRect.top;
            const rawX = clickX / scale;
            const rawY = clickY / scale;

            const stone = myStones.find((s) => s.index === stoneIndex);
            if (stone) {
              const distToCenter = Math.sqrt(
                Math.pow(rawX - stone.x, 2) + Math.pow(rawY - stone.y, 2),
              );

              // Visual radius is STONE_RADIUS (14.5 - regulation curling stone).
              // If click is within visual radius -> Select/Highlight
              // If click is outside visual radius (but inside target/halo) -> Place New Stone
              if (distToCenter > STONE_RADIUS) {
                // Clicked in Halo -> Place New Stone
                const stoneToPlace = myStones.find((s) => !s.placed);
                if (stoneToPlace) {
                  // Place at click location
                  // Clamp to sheet boundaries
                  const hogLineY = VIEW_TOP_OFFSET - HOG_LINE_OFFSET;
                  const hogLineBottomEdge = hogLineY + HOG_LINE_WIDTH / 2;
                  const backLineY = VIEW_TOP_OFFSET + BACK_LINE_OFFSET;
                  const minY = hogLineBottomEdge + STONE_RADIUS;
                  const maxY = backLineY + STONE_RADIUS;

                  const clampedX = Math.max(
                    STONE_RADIUS,
                    Math.min(SHEET_WIDTH - STONE_RADIUS, rawX),
                  );
                  const clampedY = Math.max(minY, Math.min(maxY, rawY));

                  const { x: resolvedX, y: resolvedY } = resolveCollisions(
                    stoneToPlace.index,
                    clampedX,
                    clampedY,
                    myStones,
                  );
                  updateStonePosition(
                    stoneToPlace.index,
                    resolvedX,
                    resolvedY,
                    true,
                  );
                }
              } else {
                // Clicked on Stone -> Highlight/Select (existing behavior)
                if (gameState.phase === "combined" || isHistoryMode) {
                  setHighlightedStone((prev) => {
                    // Check if stone is in guard zone
                    // const hogLineY = VIEW_TOP_OFFSET - HOG_LINE_OFFSET;
                    // const topOfHouseY = VIEW_TOP_OFFSET - HOUSE_RADIUS_12;
                    // Note: Y increases downwards. Hog Line (smaller Y) < Stone < Top of House (larger Y)
                    // But wait, in our coordinate system for `stone.y`:
                    // It seems `stone.y` is in logical coordinates where 0 is top-left?
                    // Let's verify with `renderStones` which uses `pos.y * scale`.
                    // Yes.
                    // Hog Line Y = VIEW_TOP_OFFSET - HOG_LINE_OFFSET
                    // Top of House Y = VIEW_TOP_OFFSET - HOUSE_RADIUS_12
                    // Guard zone: Y is between Hog Line and Top of House.
                    // Actually, Hog Line is further UP (smaller Y) than House if we consider Tee Line as reference?
                    // Let's check constants.
                    // VIEW_TOP_OFFSET is Tee Line Y.
                    // HOG_LINE_OFFSET is distance from Tee to Hog.
                    // So Hog Line Y = VIEW_TOP_OFFSET - HOG_LINE_OFFSET.
                    // Top of House Y = VIEW_TOP_OFFSET - HOUSE_RADIUS_12.
                    // Since HOG_LINE_OFFSET > HOUSE_RADIUS_12, Hog Line Y < Top of House Y.
                    const distToCenter = Math.sqrt(
                      Math.pow(stone.x - SHEET_WIDTH / 2, 2) +
                        Math.pow(stone.y - VIEW_TOP_OFFSET, 2),
                    );

                    // House Stone: Touching the house
                    const isHouseStone =
                      distToCenter <= HOUSE_RADIUS_12 + STONE_RADIUS;

                    // Near House Stone: Not touching house, but within threshold

                    const isNearHouseStone =
                      !isHouseStone &&
                      distToCenter <=
                        HOUSE_RADIUS_12 + STONE_RADIUS + NEAR_HOUSE_THRESHOLD;

                    let steps;
                    if (isHouseStone) {
                      steps = settings.houseZone;
                    } else if (isNearHouseStone) {
                      steps = settings.nearHouseZone;
                    } else {
                      steps = settings.guardZone;
                    }

                    if (prev?.color === myColor && prev?.index === stoneIndex) {
                      // Already selected - Cycle logic
                      const nextStepIndex = prev.stepIndex + 1;
                      if (nextStepIndex >= steps.length) {
                        // Reached the end of steps, deselect stone
                        setHoveredStone(null);
                        return null;
                      }
                      // Load next step's types
                      const nextStepTypes = steps[nextStepIndex]?.types || [];
                      return {
                        ...prev,
                        stepIndex: nextStepIndex,
                        activeTypes: nextStepTypes,
                      };
                    } else {
                      // New selection - initialize with first step's types
                      const initialTypes = steps[0]?.types || [];
                      return {
                        color: myColor!,
                        index: stoneIndex,
                        stepIndex: 0,
                        activeTypes: initialTypes,
                      };
                    }
                  });
                }
              }
            }
          }
        }
        // Reset gesture state
        gestureState.current = { type: "IDLE" };
        return;
      }

      if (dragState.isDragging || gestureState.current.type === "DRAGGING") {
        const index =
          dragState.stoneIndex ??
          (gestureState.current.type === "DRAGGING"
            ? gestureState.current.stoneIndex
            : null);
        if (index !== null) {
          handleStoneDragEnd(index, { x: e.clientX, y: e.clientY });
        }
        gestureState.current = { type: "IDLE" };
      }
    };

    const handleGlobalPointerMove = (e: PointerEvent) => {
      // Handle PENDING -> DRAGGING transition
      if (gestureState.current.type === "PENDING") {
        const { startX, startY, stoneIndex, timerId, source, startTime } =
          gestureState.current;
        const moveDist = Math.sqrt(
          Math.pow(e.clientX - startX, 2) + Math.pow(e.clientY - startY, 2),
        );
        const timeElapsed = Date.now() - startTime;

        // Logic:
        // - If source is 'pickup' (existing stone), drag immediately on move > 5px.
        // - If source is 'placement' (new stone), drag ONLY if > 200ms has passed AND moved > 5px.
        const shouldDrag =
          moveDist > 5 && (source === "pickup" || timeElapsed > 200);

        if (shouldDrag) {
          // Drag threshold
          // Clear the timer since we are now dragging manually
          clearTimeout(timerId);

          gestureState.current = { type: "DRAGGING", stoneIndex };
          setDragState({
            isDragging: true,
            x: e.clientX,
            y: e.clientY,
            stoneIndex: stoneIndex,
          });
        }
        return;
      }

      if (dragState.isDragging && dragState.stoneIndex !== null) {
        handleStoneDrag(dragState.stoneIndex, { x: e.clientX, y: e.clientY });
      }
    };

    window.addEventListener("pointerup", handleGlobalPointerUp);
    window.addEventListener("pointermove", handleGlobalPointerMove);

    return () => {
      window.removeEventListener("pointerup", handleGlobalPointerUp);
      window.removeEventListener("pointermove", handleGlobalPointerMove);
    };
  }, [
    dragState.isDragging,
    dragState.stoneIndex,
    myStones,
    scale,
    myColor,
    gameState.phase,
    isHistoryMode,
  ]);

  // Determine which stones to display (History vs Live)
  // MOVED BEFORE handleSheetPointerDown to avoid reference error
  let displayRedStones: StonePosition[] = [];
  let displayYellowStones: StonePosition[] = [];

  if (isHistoryMode) {
    const historyRound =
      gameState.history && gameState.history[selectedHistoryRound];
    if (historyRound) {
      displayRedStones = historyRound.stones?.red || [];
      displayYellowStones = historyRound.stones?.yellow || [];
    }
  } else {
    displayRedStones = gameState.stones.red || [];
    displayYellowStones = gameState.stones.yellow || [];
  }

  const handleSheetPointerDown = useCallback(
    (e: React.PointerEvent) => {
      // Handle measurement mode (combined phase or history mode)
      if (gameState.phase === "combined" || isHistoryMode) {
        if (!sheetRef.current) return;

        const sheetRect = sheetRef.current.getBoundingClientRect();
        const clickX = e.clientX - sheetRect.left;
        const clickY = e.clientY - sheetRect.top;

        // Convert to logical coordinates
        const rawX = clickX / scale;
        const rawY = clickY / scale;

        // Check if click is on any stone
        const CLICK_THRESHOLD = 44 / scale; // 44px in logical units
        let clickedOnStone = false;

        // Check red stones
        for (let i = 0; i < displayRedStones.length; i++) {
          const stone = displayRedStones[i];
          const dx = rawX - stone.x;
          const dy = rawY - stone.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < CLICK_THRESHOLD) {
            clickedOnStone = true;
            break;
          }
        }

        // Check yellow stones if not already clicked on red
        if (!clickedOnStone) {
          for (let i = 0; i < displayYellowStones.length; i++) {
            const stone = displayYellowStones[i];
            const dx = rawX - stone.x;
            const dy = rawY - stone.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < CLICK_THRESHOLD) {
              clickedOnStone = true;
              break;
            }
          }
        }

        // If not clicked on any stone, deselect
        if (!clickedOnStone) {
          setHighlightedStone(null);
        }

        return;
      }

      // Original placement mode logic
      if (
        !sheetRef.current ||
        isReady ||
        gameState.phase !== "placement" ||
        isHistoryMode
      )
        return;

      const sheetRect = sheetRef.current.getBoundingClientRect();
      const clickX = e.clientX - sheetRect.left;
      const clickY = e.clientY - sheetRect.top;

      // Convert to logical coordinates
      const rawX = clickX / scale;
      const rawY = clickY / scale;

      // 1. Check for stone pickup (Smart Targeting)
      // Find closest stone within threshold
      const PICKUP_THRESHOLD = 44 / scale; // 44px in logical units
      let closestStone: StonePosition | null = null;
      let minDistance = Infinity;

      for (const stone of myStones) {
        if (!stone.placed) continue;
        const dx = rawX - stone.x;
        const dy = rawY - stone.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < PICKUP_THRESHOLD && distance < minDistance) {
          minDistance = distance;
          closestStone = stone;
        }
      }

      // Helper to start pending gesture
      const startPendingGesture = (
        index: number,
        source: "pickup" | "placement",
      ) => {
        const timerId = window.setTimeout(() => {
          if (
            gestureState.current.type === "PENDING" &&
            gestureState.current.stoneIndex === index
          ) {
            // Promote to DRAGGING
            const { startX, startY } = gestureState.current;
            gestureState.current = { type: "DRAGGING", stoneIndex: index };
            setDragState({
              isDragging: true,
              x: startX,
              y: startY,
              stoneIndex: index,
            });
          }
        }, 300); // 500ms long press

        gestureState.current = {
          type: "PENDING",
          stoneIndex: index,
          startX: e.clientX,
          startY: e.clientY,
          timerId,
          source,
          startTime: Date.now(),
        };
      };

      if (closestStone !== null) {
        startPendingGesture(closestStone.index, "pickup");
        return;
      }

      // 2. If no stone found, try to place a new one (existing click logic)
      // Find first unplaced stone
      const stoneToPlace = myStones.find((s) => !s.placed);
      if (!stoneToPlace) return;

      // Clamp to sheet boundaries
      const hogLineY = VIEW_TOP_OFFSET - HOG_LINE_OFFSET;
      const hogLineBottomEdge = hogLineY + HOG_LINE_WIDTH / 2;
      const backLineY = VIEW_TOP_OFFSET + BACK_LINE_OFFSET;
      const minY = hogLineBottomEdge + STONE_RADIUS;
      const maxY = backLineY + STONE_RADIUS;

      const clampedX = Math.max(
        STONE_RADIUS,
        Math.min(SHEET_WIDTH - STONE_RADIUS, rawX),
      );
      const clampedY = Math.max(minY, Math.min(maxY, rawY));

      // Resolve collisions
      const { x: resolvedX, y: resolvedY } = resolveCollisions(
        stoneToPlace.index,
        clampedX,
        clampedY,
        myStones,
      );

      // Place the stone
      updateStonePosition(stoneToPlace.index, resolvedX, resolvedY, true);

      // Enter PENDING state to allow immediate dragging
      startPendingGesture(stoneToPlace.index, "placement");
    },
    [
      isReady,
      gameState.phase,
      isHistoryMode,
      scale,
      myStones,
      updateStonePosition,
      displayRedStones,
      displayYellowStones,
    ],
  );

  const handleConfirmPlacement = () => {
    if (!channel) return;

    // Start minimum wait timer to prevent flash
    setWaitingMinTimeElapsed(false);
    if (waitingTimerRef.current) {
      clearTimeout(waitingTimerRef.current);
    }
    waitingTimerRef.current = setTimeout(() => {
      setWaitingMinTimeElapsed(true);
    }, 500);

    // Send all stone placements
    const placementPromises = myStones
      .filter((s) => s.placed)
      .map((stone) => {
        return new Promise((resolve, reject) => {
          channel
            .push("place_stone", {
              stone_index: stone.index,
              position: { x: stone.x, y: stone.y },
            })
            .receive("ok", resolve)
            .receive("error", (reasons: any) => reject(reasons));
        });
      });

    // Wait for all placements to be acknowledged before confirming
    Promise.all(placementPromises)
      .then(() => {
        channel
          .push("confirm_placement", {})
          .receive("ok", () => {
            setIsReady(true);
          })
          .receive("error", (reasons: any) => {
            console.error("Confirmation failed", reasons);
            alert("Failed to confirm placement: " + JSON.stringify(reasons));
          });
      })
      .catch((err) => {
        console.error("Failed to place stones", err);
        alert("Failed to save stone positions: " + JSON.stringify(err));
      });
  };

  const handleNextRound = () => {
    setHighlightedStone(null);
    setHoveredStone(null);
    // Overlay will be triggered by useEffect when round changes
    if (channel) {
      channel.push("ready_for_next_round", {});
    }
  };

  const handleRoundOverlayComplete = () => {
    setShowRoundStartOverlay(false);
  };

  const handleCancelPlacement = () => {
    if (!channel) return;

    channel
      .push("cancel_placement", {})
      .receive("ok", () => {
        setIsReady(false);
      })
      .receive("error", (reasons: any) => {
        console.error("Failed to cancel placement", reasons);
      });
  };

  if (!gameState || !playerId || !myColor) {
    return <div>Loading game...</div>;
  }

  const allStonesPlaced = myStones.every((s) => s.placed);

  // Calculate pixel size for stones
  const stonePixelSize = STONE_RADIUS * 2 * scale;

  // Determine which stones to display (History vs Live) - MOVED TO TOP

  // Helper to render stones
  const renderStones = (stones: StonePosition[], color: PlayerColor) => {
    // Calculate a darker shade for handle and inner border
    const getBorderColor = (hexColor: string) => {
      const r = parseInt(hexColor.slice(1, 3), 16);
      const g = parseInt(hexColor.slice(3, 5), 16);
      const b = parseInt(hexColor.slice(5, 7), 16);
      const darkerR = Math.floor(r * 0.7);
      const darkerG = Math.floor(g * 0.7);
      const darkerB = Math.floor(b * 0.7);
      return `#${darkerR.toString(16).padStart(2, "0")}${darkerG.toString(16).padStart(2, "0")}${darkerB.toString(16).padStart(2, "0")}`;
    };

    return stones.map((pos: StonePosition, i: number) => {
      const stoneColor = gameState.team_colors
        ? gameState.team_colors[color]
        : color === "red"
          ? "#cc0000"
          : "#e6b800";
      const darkerShade = getBorderColor(stoneColor);

      const isHighlighted =
        highlightedStone?.color === color && highlightedStone?.index === i;

      return (
        <React.Fragment key={`${color}-${i}`}>
          {/* Pulse ring animation for selected stone */}

          <div
            className={`absolute rounded-full shadow-md animate-glow transition-all duration-200 hover:brightness-110 ${
              isHighlighted ? "scale-105 ring-2 ring-white/50" : ""
            } ${
              gameState.phase === "combined" || isHistoryMode
                ? "cursor-pointer"
                : "cursor-default"
            }`}
            style={{
              width: stonePixelSize,
              height: stonePixelSize,
              backgroundColor: stoneColor,
              border: `2px solid #777777`,
              boxShadow: `inset 0 0 0 1px ${darkerShade}`,
              left: pos.x * scale,
              top: pos.y * scale,
              marginLeft: -stonePixelSize / 2,
              marginTop: -stonePixelSize / 2,
              zIndex: 2,
            }}
            onClick={(e) => {
              e.stopPropagation(); // Prevent sheet click
              if (gameState.phase === "combined" || isHistoryMode) {
                setHighlightedStone((prev) => {
                  // Determine zone
                  // const topOfHouseY = VIEW_TOP_OFFSET - HOUSE_RADIUS_12;
                  const distToCenter = Math.sqrt(
                    Math.pow(pos.x - SHEET_WIDTH / 2, 2) +
                      Math.pow(pos.y - VIEW_TOP_OFFSET, 2),
                  );

                  // House Stone: Touching the house (dist <= 12ft radius + stone radius)
                  const isHouseStone =
                    distToCenter <= HOUSE_RADIUS_12 + STONE_RADIUS;

                  // Near House Stone: Not touching house, but within threshold of outer ring
                  // Distance from center <= 12ft radius + stone radius + threshold
                  const isNearHouseStone =
                    !isHouseStone &&
                    distToCenter <=
                      HOUSE_RADIUS_12 + STONE_RADIUS + NEAR_HOUSE_THRESHOLD;

                  // Guard Stone: Anything else (typically above house)
                  let steps;
                  if (isHouseStone) {
                    steps = settings.houseZone;
                  } else if (isNearHouseStone) {
                    steps = settings.nearHouseZone;
                  } else {
                    steps = settings.guardZone;
                  }

                  if (prev?.color === color && prev?.index === i) {
                    // Already selected - Cycle logic
                    const nextStepIndex = prev.stepIndex + 1;
                    if (nextStepIndex >= steps.length) {
                      // Reached the end of steps, deselect stone
                      setHoveredStone(null);
                      return null;
                    }
                    // Load next step's types
                    const nextStepTypes = steps[nextStepIndex]?.types || [];
                    return {
                      ...prev,
                      stepIndex: nextStepIndex,
                      activeTypes: nextStepTypes,
                    };
                  } else {
                    // New selection - initialize with first step's types
                    const initialTypes = steps[0]?.types || [];
                    return {
                      color,
                      index: i,
                      stepIndex: 0,
                      activeTypes: initialTypes,
                    };
                  }
                });
              }
            }}
            onMouseEnter={() => {
              if (gameState.phase === "combined" || isHistoryMode) {
                setHoveredStone({ color, index: i });
              }
            }}
            onMouseLeave={() => {
              if (gameState.phase === "combined" || isHistoryMode) {
                setHoveredStone(null);
              }
            }}
          >
            {/* Small handle */}
            <div
              style={{
                width: (stonePixelSize * 2) / 5,
                height: stonePixelSize / 7,
                backgroundColor: darkerShade,
                borderRadius: stonePixelSize / 12,
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
              }}
            />
          </div>
        </React.Fragment>
      );
    });
  };

  const renderGameBoard = (forLoupe = false) => (
    <div
      className="relative z-10"
      style={{
        width: sheetDimensions.width,
        height: sheetDimensions.height,
      }}
    >
      <div
        ref={forLoupe ? undefined : sheetRef}
        className="absolute inset-0 touch-none" // touch-none to prevent browser zooming/scrolling while dragging
        onPointerDown={forLoupe ? undefined : handleSheetPointerDown}
      >
        <CurlingSheet
          width="100%"
          round={
            isHistoryMode && gameState.history?.[selectedHistoryRound]
              ? gameState.history[selectedHistoryRound].round
              : gameState.current_round
          }
          phase={isHistoryMode ? "combined" : gameState.phase}
          style={SHEET_STYLES.find((s) => s.id === sheetSettings.styleId)}
        />
      </div>

      {/* Render placed stones */}
      {!isHistoryMode &&
        !isReady &&
        gameState.phase === "placement" &&
        myStones.map((stone) => {
          const isDraggingThisStone =
            dragState.isDragging && dragState.stoneIndex === stone.index;

          return (
            stone.placed && (
              <div key={`stone-wrapper-${stone.index}`}>
                {/* Ghost Stone (stays in place while dragging) */}
                {isDraggingThisStone && (
                  <div
                    className="absolute rounded-full"
                    style={{
                      width: stonePixelSize,
                      height: stonePixelSize,
                      backgroundColor: gameState.team_colors
                        ? gameState.team_colors[myColor]
                        : myColor === "red"
                          ? "#cc0000"
                          : "#e6b800",
                      border: `2px solid #777777`,
                      boxShadow: `inset 0 0 0 1px #00000055`, // darker shade approximation
                      left: stone.x * scale,
                      top: stone.y * scale,
                      marginLeft: -stonePixelSize / 2,
                      marginTop: -stonePixelSize / 2,
                      opacity: 0.3,
                      zIndex: 5,
                    }}
                  >
                    <div
                      style={{
                        width: (stonePixelSize * 2) / 5,
                        height: stonePixelSize / 7,
                        backgroundColor: "#00000055",
                        borderRadius: stonePixelSize / 12,
                        position: "absolute",
                        top: "50%",
                        left: "50%",
                        transform: "translate(-50%, -50%)",
                      }}
                    />
                  </div>
                )}

                <DraggableStone
                  key={`my-${stone.index}-${stone.x}-${stone.y}${forLoupe ? "-loupe" : ""}`}
                  color={myColor}
                  index={stone.index}
                  position={{
                    x: stone.x * scale,
                    y: stone.y * scale,
                  }}
                  onDragEnd={forLoupe ? () => {} : handleStoneDragEnd}
                  // onDrag={forLoupe ? undefined : handleStoneDrag} // Removed unused prop
                  isPlaced={true}
                  size={stonePixelSize}
                  customColor={
                    gameState.team_colors
                      ? gameState.team_colors[myColor]
                      : undefined
                  }
                  onClick={(e) => e.stopPropagation()}
                  // Hide the actual draggable stone while dragging to prevent jitter and use proxy instead
                  opacity={isDraggingThisStone ? 0 : 1}
                  interactive={false} // Let sheet handle events for smart targeting
                />
              </div>
            )
          );
        })}

      {/* Render Red and Yellow stones (Live or History) */}
      {/* Skip rendering own color during placement phase (myStones handles that), but always render in history mode */}
      {!(
        gameState.phase === "placement" &&
        !isReady &&
        myColor === "red" &&
        !isHistoryMode
      ) && renderStones(displayRedStones, "red")}
      {!(
        gameState.phase === "placement" &&
        !isReady &&
        myColor === "yellow" &&
        !isHistoryMode
      ) && renderStones(displayYellowStones, "yellow")}

      {/* Measurement lines in combined phase or history mode */}
      {(gameState.phase === "combined" || isHistoryMode) && (
        <StoneMeasurements
          stones={{
            red: displayRedStones,
            yellow: displayYellowStones,
          }}
          scale={scale}
          showMeasurements={showMeasurements}
          onHighlightStone={setHighlightedStone}
          onToggleMeasurementType={(type: MeasurementType) => {
            if (highlightedStone) {
              setHighlightedStone((prev) => {
                if (!prev) return null;
                const currentTypes = prev.activeTypes || [];
                // Toggle: add if not present, remove if present
                const newTypes = currentTypes.includes(type)
                  ? currentTypes.filter((t) => t !== type)
                  : [...currentTypes, type];
                return { ...prev, activeTypes: newTypes };
              });
            }
          }}
          highlightedStone={(() => {
            const targetStone = highlightedStone || hoveredStone;

            if (!targetStone) return null;

            // Calculate active types based on stone position and step index
            // We need to find the stone position again to check zone
            let stone;
            if (targetStone.color === "red") {
              stone = displayRedStones[targetStone.index];
            } else {
              stone = displayYellowStones[targetStone.index];
            }

            // let initialActiveTypes: MeasurementType[] = [];
            let steps: any[] = [];
            if (stone) {
              const distToCenter = Math.sqrt(
                Math.pow(stone.x - SHEET_WIDTH / 2, 2) +
                  Math.pow(stone.y - VIEW_TOP_OFFSET, 2),
              );

              // House Stone: Touching the house
              const isHouseStone =
                distToCenter <= HOUSE_RADIUS_12 + STONE_RADIUS;

              // Near House Stone: Not touching house, but within threshold

              const isNearHouseStone =
                !isHouseStone &&
                distToCenter <=
                  HOUSE_RADIUS_12 + STONE_RADIUS + NEAR_HOUSE_THRESHOLD;

              if (isHouseStone) {
                steps = settings.houseZone;
              } else if (isNearHouseStone) {
                steps = settings.nearHouseZone;
              } else {
                steps = settings.guardZone;
              }

              // Default to first step
              // initialActiveTypes = steps[0]?.types || [];
            }

            if (
              highlightedStone &&
              targetStone.color === highlightedStone.color &&
              targetStone.index === highlightedStone.index &&
              highlightedStone.activeTypes
            ) {
              return {
                ...targetStone,
                activeTypes: highlightedStone.activeTypes,
                stepIndex: highlightedStone.stepIndex,
              };
            }

            // Fallback for hover or if activeTypes missing (legacy/safety)
            const stepIndex =
              "stepIndex" in targetStone ? (targetStone as any).stepIndex : 0;

            // Safety check for index
            const step = steps[stepIndex] || steps[0];

            return {
              ...targetStone,
              activeTypes: step.types,
              stepIndex: stepIndex,
            };
          })()}
          isSelected={!!highlightedStone}
        />
      )}
    </div>
  );

  return (
    <motion.div className="fixed inset-0 h-[100dvh] md:relative md:inset-auto md:h-auto flex flex-col items-center w-full max-w-md mx-auto md:aspect-[9/16] md:min-h-[1000px] md:rounded-2xl md:shadow-2xl bg-[var(--icy-white)] backdrop-blur-md transition-all duration-300 overflow-hidden select-none">
      {/* Full-height Sidelines (Mobile Only) */}
      <div
        className="absolute inset-y-0 border-x border-gray-200 md:border-none pointer-events-none z-0 left-1/2 -translate-x-1/2"
        style={{ width: sheetDimensions.width }}
      />

      {/* Main Game Area - Flex grow to take available space */}
      <div
        ref={containerRef}
        className="flex-grow w-full relative flex flex-col items-center justify-end min-h-0"
      >
        {renderGameBoard()}
      </div>

      {/* Loupe for Dragging */}
      {dragState.isDragging && (
        <Loupe
          x={dragState.x}
          y={dragState.y}
          content={
            <div
              style={{
                width: sheetDimensions.width,
                height: sheetDimensions.height,
                position: "relative",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  left: sheetRef.current?.getBoundingClientRect().left || 0,
                  top: sheetRef.current?.getBoundingClientRect().top || 0,
                }}
              >
                {renderGameBoard(true)}

                {/* Also render the stone being dragged (proxy) */}
                {dragState.stoneIndex !== null && myColor && (
                  <div
                    style={{
                      position: "absolute",
                      zIndex: 50,
                      left:
                        dragState.x -
                        (sheetRef.current?.getBoundingClientRect().left || 0) -
                        stonePixelSize / 2,
                      top:
                        dragState.y -
                        (sheetRef.current?.getBoundingClientRect().top || 0) -
                        stonePixelSize / 2,
                    }}
                  >
                    <div
                      style={{
                        width: stonePixelSize,
                        height: stonePixelSize,
                        borderRadius: "50%",
                        backgroundColor: gameState.team_colors
                          ? gameState.team_colors[myColor]
                          : myColor === "red"
                            ? "#cc0000"
                            : "#e6b800",
                        border: `2px solid #777777`,
                        boxShadow: `inset 0 0 0 1px #00000055`,
                        opacity: 0.7,
                      }}
                    >
                      <div
                        style={{
                          width: (stonePixelSize * 2) / 5,
                          height: stonePixelSize / 7,
                          backgroundColor: "#00000055",
                          borderRadius: stonePixelSize / 12,
                          position: "absolute",
                          top: "50%",
                          left: "50%",
                          transform: "translate(-50%, -50%)",
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          }
        />
      )}

      {/* Loupe for Highlighted Stone (Combined Phase) */}
      {(() => {
        if (
          dragState.isDragging ||
          !highlightedStone ||
          gameState.phase !== "combined"
        )
          return null;

        // Find the stone
        let stone;
        if (highlightedStone.color === "red") {
          stone = displayRedStones[highlightedStone.index];
        } else {
          stone = displayYellowStones[highlightedStone.index];
        }

        if (!stone) return null;

        // Check if in house
        const topOfHouseY = VIEW_TOP_OFFSET - HOUSE_RADIUS_12;
        const stoneBottomEdgeY = stone.y + STONE_RADIUS;
        const isInHouse = stoneBottomEdgeY >= topOfHouseY;

        if (!isInHouse) return null;

        // Calculate positions
        const sheetRect = sheetRef.current?.getBoundingClientRect();
        if (!sheetRect) return null;

        const stonePixelX = stone.x * scale;
        const stonePixelY = stone.y * scale;
        const stoneGlobalX = sheetRect.left + stonePixelX;
        const stoneGlobalY = sheetRect.top + stonePixelY;

        // Fixed position: Up center, a bit above top of house
        const topOfHousePixelY = (VIEW_TOP_OFFSET - HOUSE_RADIUS_12) * scale;
        const fixedX = sheetRect.left + sheetDimensions.width / 2;

        // Calculate offset based on sheet width (scales with loupe size)
        const loupeSize = Math.max(
          120,
          Math.min(240, sheetDimensions.width * 0.6),
        );
        const loupeOffset = loupeSize * 0.75; // Offset is 75% of loupe size (places it further up)

        // Position it above the top of the house
        const fixedY = sheetRect.top + topOfHousePixelY - loupeOffset;

        const availableTypes: MeasurementType[] = [
          "closest-ring",
          "t-line",
          "center-line",
        ];

        return (
          <StoneInspector
            x={stoneGlobalX}
            y={stoneGlobalY}
            fixedPosition={{ x: fixedX, y: fixedY }}
            scale={1.8}
            sheetWidth={sheetDimensions.width}
            activeTypes={highlightedStone.activeTypes || []}
            availableTypes={availableTypes}
            onToggleType={(type) => {
              setHighlightedStone((prev) => {
                if (!prev) return null;
                const currentTypes = prev.activeTypes || [];
                const newTypes = currentTypes.includes(type)
                  ? currentTypes.filter((t) => t !== type)
                  : [...currentTypes, type];
                return { ...prev, activeTypes: newTypes };
              });
            }}
            content={
              <div
                style={{
                  width: sheetDimensions.width,
                  height: sheetDimensions.height,
                  position: "relative",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    left: sheetRect.left,
                    top: sheetRect.top,
                  }}
                >
                  {renderGameBoard(true)}
                </div>
              </div>
            }
          />
        );
      })()}

      {/* Main Screen Proxy Stone (Fixed Position - Always on Top) */}
      {dragState.isDragging &&
        dragState.stoneIndex !== null &&
        myColor &&
        createPortal(
          <div
            className="fixed pointer-events-none z-[9999]"
            style={{
              width: stonePixelSize,
              height: stonePixelSize,
              left: dragState.x - stonePixelSize / 2,
              top: dragState.y - stonePixelSize / 2,
            }}
          >
            <div
              style={{
                width: "100%",
                height: "100%",
                borderRadius: "50%",
                backgroundColor: gameState.team_colors
                  ? gameState.team_colors[myColor]
                  : myColor === "red"
                    ? "#cc0000"
                    : "#e6b800",
                border: `2px solid #777777`,
                boxShadow: `inset 0 0 0 1px #00000055`,
                opacity: 0.8,
                transform: "scale(1.1)",
                transition: "transform 0.1s ease-out",
              }}
            >
              <div
                style={{
                  width: (stonePixelSize * 2) / 5,
                  height: stonePixelSize / 7,
                  backgroundColor: "#00000055",
                  borderRadius: stonePixelSize / 12,
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                }}
              />
            </div>
          </div>,
          document.body,
        )}

      {/* Controls Area - Floating Card */}
      <div className="w-full px-3">
        <div className="w-full max-w-md card-gradient backdrop-blur-md p-4 shrink-0 relative z-20 shadow-2xl border border-white/20 my-4 rounded-2xl mb-6">
          <div className="flex gap-2 h-[64px]">
            {/* Persistent Menu Button */}
            <div className="relative shrink-0 flex items-center">
              <button
                onClick={() => {
                  setShowMenu(!showMenu);
                  setHighlightedStone(null);
                  setHoveredStone(null);
                }}
                className="w-12 h-12 rounded-full bg-[var(--icy-button-bg)] text-[var(--icy-button-text)] flex items-center justify-center hover:scale-105 hover:shadow-lg shadow-md transition-all active:scale-95"
                aria-label="Menu"
              >
                <Menu size={24} />
              </button>

              {/* Menu Bottom Sheet */}
              <BottomSheet
                isOpen={showMenu}
                onClose={() => setShowMenu(false)}
                title="menu"
              >
                <div className="flex flex-col gap-1">
                  {onShare && (
                    <button
                      onClick={() => {
                        onShare();
                        setShowMenu(false);
                      }}
                      className="w-full text-left px-4 py-4 hover:bg-gray-100 active:bg-gray-200 rounded-2xl flex items-center gap-4 text-base font-medium transition-colors"
                    >
                      <Share2 size={22} className="text-gray-600" />
                      Share
                    </button>
                  )}
                  <button
                    onClick={() => {
                      if (gameState.history && gameState.history.length > 0) {
                        setSelectedHistoryRound(0);
                      } else {
                        alert("No history available yet.");
                      }
                      setShowMenu(false);
                    }}
                    className="w-full text-left px-4 py-4 hover:bg-gray-100 active:bg-gray-200 rounded-2xl flex items-center gap-4 text-base font-medium transition-colors"
                  >
                    <HistoryIcon size={22} className="text-gray-600" />
                    History
                  </button>
                  <button
                    onClick={() => {
                      setShowHelp(true);
                      setShowMenu(false);
                    }}
                    className="w-full text-left px-4 py-4 hover:bg-gray-100 active:bg-gray-200 rounded-2xl flex items-center gap-4 text-base font-medium transition-colors"
                  >
                    <Info size={22} className="text-gray-600" />
                    Help
                  </button>
                  <button
                    onClick={() => {
                      openSettings();
                      setShowMenu(false);
                    }}
                    className="w-full text-left px-4 py-4 hover:bg-gray-100 active:bg-gray-200 rounded-2xl flex items-center gap-4 text-base font-medium transition-colors"
                  >
                    <Settings size={22} className="text-gray-600" />
                    Settings
                  </button>
                  <div className="h-px bg-gray-200 my-2" />
                  <button
                    onClick={() => (window.location.href = "/")}
                    className="w-full text-left px-4 py-4 hover:bg-red-50 active:bg-red-100 text-red-600 rounded-2xl flex items-center gap-4 text-base font-medium transition-colors"
                  >
                    <LogOut size={22} />
                    Exit Game
                  </button>
                </div>
              </BottomSheet>
            </div>

            {/* Contextual Controls */}
            <div className="flex-grow flex items-center justify-center min-w-0">
              {/* Placement Phase - Active */}
              {gameState.phase === "placement" &&
                !isReady &&
                !isHistoryMode && (
                  <div className="w-full flex items-center gap-2">
                    {!allStonesPlaced ? (
                      <div className="flex-grow min-w-0">
                        {myColor && (
                          <StoneSelectionBar
                            stones={myStones}
                            myColor={myColor}
                            onDragEnd={handleStoneDragEnd}
                            onDragStart={handleStoneDrag}
                            disabled={false}
                            draggedStoneIndex={
                              dragState.isDragging ? dragState.stoneIndex : null
                            }
                          />
                        )}
                      </div>
                    ) : (
                      <Button
                        onClick={handleConfirmPlacement}
                        className="flex-grow h-12 text-base"
                        noHoverAnimation
                      >
                        finish placement
                      </Button>
                    )}
                  </div>
                )}

              {gameState.phase === "combined" && !isHistoryMode && (
                <div className="w-full flex gap-2">
                  <Button
                    onClick={() => setShowMeasurements(!showMeasurements)}
                    className={`w-12 h-12 rounded-2xl p-0 relative group ${showMeasurements ? "" : "bg-gray-400 hover:bg-gray-500 text-white shadow-none"}`}
                    aria-label="Toggle measurements"
                  >
                    <Ruler size={20} />
                    {/* Tooltip */}
                    <div className="absolute bottom-full mb-2 hidden group-hover:block">
                      <div className="bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                        {showMeasurements
                          ? "Hide measurements"
                          : "Show measurements"}
                      </div>
                    </div>
                  </Button>
                  <Button
                    onClick={handleNextRound}
                    variant="destructive"
                    className="flex-grow h-12 text-base"
                    noHoverAnimation
                    noTapAnimation
                  >
                    start new round
                  </Button>
                </div>
              )}

              {/* History Controls */}
              {isHistoryMode && (
                <div className="w-full flex items-center gap-2">
                  <Button
                    onClick={() =>
                      setSelectedHistoryRound(
                        Math.min(
                          (gameState.history?.length || 0) - 1,
                          selectedHistoryRound! + 1,
                        ),
                      )
                    }
                    disabled={
                      selectedHistoryRound ===
                      (gameState.history?.length || 0) - 1
                    }
                    variant="outline"
                    className="w-12 h-12"
                    aria-label="Earlier Round"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-6 w-6"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 19l-7-7 7-7"
                      />
                    </svg>
                  </Button>

                  <Button
                    onClick={() => setSelectedHistoryRound(null)}
                    className="flex-grow h-12"
                  >
                    <X size={20} />
                    <span>exit history</span>
                  </Button>

                  <Button
                    onClick={() =>
                      setSelectedHistoryRound(
                        Math.max(0, selectedHistoryRound! - 1),
                      )
                    }
                    disabled={selectedHistoryRound === 0}
                    variant="outline"
                    className="w-12 h-12"
                    aria-label="Later Round"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-6 w-6"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Help Dialog */}
      <Dialog
        isOpen={showHelp}
        onClose={() => setShowHelp(false)}
        title="how to play"
      >
        <p>
          <strong className="text-gray-900">1. Place Stones:</strong> Click
          where you want to place your stone or drag your stones from the bottom
          bar onto the sheet.
        </p>
        <p>
          <strong className="text-gray-900">2. Confirm:</strong> Once all stones
          are placed, tap "Finish Placement" to lock them in.
        </p>
      </Dialog>

      <SettingsDialog />

      {/* Waiting for Opponent Overlay - Centered on screen */}
      <AnimatePresence>
        {isReady &&
          (gameState.phase === "placement" || !waitingMinTimeElapsed) && (
            <motion.div
              key="waiting-overlay"
              className="fixed inset-0 z-[90] flex items-center justify-center pointer-events-none"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.4 } }}
            >
              {/* Backdrop - lighter to show sheet */}
              <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" />

              {/* Content */}
              <motion.div
                className="relative z-10 flex flex-col items-center text-center px-8 gap-6 pointer-events-auto"
                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{
                  opacity: 0,
                  scale: 0.95,
                  y: -10,
                  transition: { duration: 0.3 },
                }}
                transition={{ duration: 0.3, delay: 0.1 }}
              >
                <h2
                  className="text-4xl md:text-5xl font-bold text-white lowercase tracking-tight animate-pulse"
                  style={{
                    textShadow: "0 4px 20px rgba(0, 0, 0, 0.3)",
                  }}
                >
                  waiting for opponent...
                </h2>

                <Button
                  onClick={handleCancelPlacement}
                  variant="outline"
                  className="h-12 px-6 rounded-full bg-white/90 hover:bg-white text-gray-800 border border-gray-200/50 shadow-md backdrop-blur-md animate-glow"
                  noHoverAnimation
                  noTapAnimation
                >
                  make changes
                </Button>
              </motion.div>
            </motion.div>
          )}
      </AnimatePresence>

      {/* Round Start Overlay */}
      <RoundStartOverlay
        isVisible={showRoundStartOverlay}
        roundNumber={gameState.current_round}
        onComplete={handleRoundOverlayComplete}
      />

      {/* Phase Tutorial - automatically shows for registered phases */}
      <PhaseTutorial
        phase={gameState.phase}
        canShow={!isHistoryMode && !showRoundStartOverlay}
      />
    </motion.div>
  );
};

const CurlingGame = (props: CurlingGameProps) => (
  <TutorialProvider>
    <SettingsProvider>
      <CurlingGameContent {...props} />
    </SettingsProvider>
  </TutorialProvider>
);

export default CurlingGame;
