import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import CurlingSheet from "./CurlingSheet";
import { BottomSheet } from "./ui/BottomSheet";
import { Button } from "./ui/Button";
import DraggableStone from "./DraggableStone";

import UnifiedSelectionBar from "./UnifiedSelectionBar";
import FirstPlayerDecision from "./FirstPlayerDecision";
import BanSelectionBar, { BanPosition } from "./BanSelectionBar";
import { StoneMeasurements } from "./StoneMeasurements";
import {
  SettingsProvider,
  useSettings,
  SHEET_STYLES,
} from "../contexts/SettingsContext";
import { SettingsDialog } from "./SettingsDialog";
import { Channel } from "phoenix";
import { buttonHover, buttonTap } from "../utils/animations";
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
import { resolveAllCollisions } from "../utils/physics";
import {
  saveStonePlacements,
  saveBanPlacements,
  loadPlacements,
  clearPlacements,
} from "../utils/placementStorage";
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

type BanGestureState =
  | { type: "IDLE" }
  | {
    type: "PENDING";
    banIndex: number;
    startX: number;
    startY: number;
    timerId: number;
    source: "pickup" | "placement";
    startTime: number;
  }
  | { type: "DRAGGING"; banIndex: number };

import {
  Menu,
  History as HistoryIcon,
  Info,
  LogOut,
  Share2,
  Ruler,
  X,
  Settings,
  RotateCcw,
  Lock,
} from "lucide-react";
import { Loupe } from "./Loupe";
import { StoneInspector } from "./StoneInspector";
import { MeasurementType } from "../contexts/SettingsContext";
import { motion, AnimatePresence } from "framer-motion";
import { RoundStartOverlay } from "./RoundStartOverlay";
import { GameEndOverlay } from "./GameEndOverlay";
import { TutorialProvider } from "../contexts/TutorialContext";
import { PhaseTutorial } from "./tutorial";
import { PhaseHelpDialog } from "./PhaseHelpDialog";

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

  // Ban phase state - similar structure to stones for consistent drag/drop
  const [myBans, setMyBans] = useState<BanPosition[]>([]);
  const [isBanReady, setIsBanReady] = useState(false);
  const banGestureState = useRef<BanGestureState>({ type: "IDLE" });
  const [banDragState, setBanDragState] = useState<{
    isDragging: boolean;
    x: number;
    y: number;
    banIndex: number | null;
  }>({
    isDragging: false,
    x: 0,
    y: 0,
    banIndex: null,
  });

  // Persist dice results for 10 seconds after they're received
  const [persistedDiceData, setPersistedDiceData] = useState<{
    diceRolls: Record<string, number>;
    firstPlayer: string;
    players: { id: string; name: string; color: 'red' | 'yellow' }[];
    teamColors: { red: string; yellow: string };
  } | null>(null);

  // When dice results arrive, capture them (no auto-close - user must dismiss)
  useEffect(() => {
    if (gameState.dice_rolls && Object.keys(gameState.dice_rolls).length > 0 && gameState.first_player) {
      // Capture the dice data before phase changes
      setPersistedDiceData({
        diceRolls: gameState.dice_rolls,
        firstPlayer: gameState.first_player,
        players: gameState.players?.map(p => ({
          id: p.id,
          name: p.name || 'Player',
          color: p.color as 'red' | 'yellow'
        })) || [],
        teamColors: gameState.team_colors || { red: '#cc0000', yellow: '#e6b800' },
      });
    }
  }, [gameState.dice_rolls, gameState.first_player]);

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

        // Reinitialize stones and ban position when round changes
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
          // Initialize bans based on configuration or default to 1
          const bansPerTeam = gameState.bans_count !== undefined ? gameState.bans_count : 1;
          const initialBans = Array.from({ length: bansPerTeam }).map((_, i) => ({
            index: i,
            x: 0,
            y: 0,
            placed: false,
          }));
          setMyBans(initialBans);
          setIsBanReady(false);
          banGestureState.current = { type: "IDLE" };
          setBanDragState({ isDragging: false, x: 0, y: 0, banIndex: null });
          setLastInitializedRound(gameState.current_round);
        }
      }

      // Sync isReady state with server
      const serverReady = gameState.player_ready?.[playerId] ?? false;
      setIsReady(serverReady);

      // Sync ban ready state with server (for ban phase)
      if (gameState.phase === "ban") {
        setIsBanReady(serverReady);
      }

      // Re-initialize bans if bans_count changed (e.g., from turn_order to placement phase)
      // This handles the case where bans were initialized with default (1) during turn_order phase
      // and need to be updated when placement phase sends actual bans_count (e.g., 2)
      const targetBansCount = gameState.bans_count !== undefined ? gameState.bans_count : 1;
      if (myBans.length !== targetBansCount && !serverReady) {
        const newBans = Array.from({ length: targetBansCount }).map((_, i) => ({
          index: i,
          x: 0,
          y: 0,
          placed: false,
        }));
        setMyBans(newBans);
        setIsBanReady(false);
        banGestureState.current = { type: "IDLE" };
        setBanDragState({ isDragging: false, x: 0, y: 0, banIndex: null });
      }
    }
  }, [gameState, playerId]);

  // Load placements from localStorage on mount/game state change
  useEffect(() => {
    if (!gameState || !playerId) return;

    const serverReady = gameState.player_ready?.[playerId] ?? false;
    // Only restore if player is not already ready
    if (serverReady) return;

    // Try to load from localStorage
    if (gameState.phase === "placement" || gameState.phase === "ban") {
      const saved = loadPlacements(
        gameState.game_id,
        gameState.current_round,
        gameState.phase
      );

      if (saved) {
        if (saved.phase === "placement" && saved.stones) {
          setMyStones(saved.stones);
        } else if (saved.phase === "ban" && saved.bans) {
          setMyBans(saved.bans);
        }
      }
    }
  }, [gameState?.game_id, gameState?.current_round, gameState?.phase, playerId]);

  // Detect round transition and show overlay for BOTH players
  // Skip for turn_order phase - show when entering placement instead
  useEffect(() => {
    if (gameState && gameState.current_round > prevRoundRef.current) {
      // Round has increased - show the overlay only if we're not in turn_order phase
      if (gameState.phase !== "turn_order") {
        setShowRoundStartOverlay(true);
      }
      prevRoundRef.current = gameState.current_round;
    }
  }, [gameState?.current_round, gameState?.phase]);

  // Show round overlay when transitioning from turn_order to placement
  const prevPhaseRef = useRef<string | null>(null);
  useEffect(() => {
    if (gameState?.phase === "placement" && prevPhaseRef.current === "turn_order") {
      // Just exited voting phase, show round start animation
      setShowRoundStartOverlay(true);
    }
    if (gameState?.phase) {
      prevPhaseRef.current = gameState.phase;
    }
  }, [gameState?.phase]);

  // Save stone placements to localStorage when they change
  useEffect(() => {
    if (!gameState || gameState.phase !== "placement") return;
    // Only save if at least one stone is placed
    const hasPlacedStones = myStones.some(s => s.placed);
    if (hasPlacedStones) {
      saveStonePlacements(
        gameState.game_id,
        gameState.current_round,
        myStones
      );
    }
  }, [myStones, gameState?.game_id, gameState?.current_round, gameState?.phase]);

  // Save ban placements to localStorage when they change  
  useEffect(() => {
    if (!gameState || gameState.phase !== "ban") return;
    // Only save if at least one ban is placed
    const hasPlacedBans = myBans.some(b => b.placed);
    if (hasPlacedBans) {
      saveBanPlacements(
        gameState.game_id,
        gameState.current_round,
        myBans
      );
    }
  }, [myBans, gameState?.game_id, gameState?.current_round, gameState?.phase]);

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
      // Block placement if it's not our turn in turn-based mode
      if (gameState.turn_based && gameState.current_turn_id !== playerId) return;

      // Block if stone is locked (placed in a previous turn)
      const myPlacedTurns = gameState.my_placed_turns || { stones: [], bans: [] };
      const stonePlacedTurn = myPlacedTurns.stones?.[index];
      const currentTurn = gameState.turn_number || 1;
      if (stonePlacedTurn != null && stonePlacedTurn < currentTurn) {
        console.log("Stone is locked, ignoring drag");
        setDragState((prev) => ({ ...prev, isDragging: false, stoneIndex: null }));
        return;
      }

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

        // Resolve all collisions iteratively (stone-to-stone, ban zone, boundaries)
        const myBannedZone = gameState.banned_zones?.[myColor ?? "red"];

        // Include opponent stones in collision detection
        const opponentColor = myColor === "red" ? "yellow" : "red";
        const opponentStones = (gameState.stones?.[opponentColor] || []).map((s, i) => ({
          index: 100 + i, // Offset index
          x: s.x,
          y: s.y,
          placed: true,
          color: opponentColor as PlayerColor
        }));

        const allCollidableStones = [...myStones, ...opponentStones];

        const result = resolveAllCollisions(
          index,
          clampedX,
          clampedY,
          allCollidableStones,
          myBannedZone,
        );

        if (result.resetToBar) {
          // Stone is fully inside ban zone - reset to bar
          setMyStones((prev) =>
            prev.map((s) =>
              s.index === index
                ? { ...s, placed: false, resetCount: (s.resetCount || 0) + 1 }
                : s,
            ),
          );

          // Notify server that stone was removed/reset (so placements_this_turn is decremented)
          if (channel) {
            channel.push("remove_stone", {
              stone_index: index,
            });
          }
        } else {
          // Use resolved position
          updateStonePosition(index, result.x, result.y, true);

          // If turn-based, send move immediately
          // NOTE: We change this to ALWAYS send immediately if channel exists,
          // except in simultaneous mode perhaps? But even then real-time updates are fine if hidden by client_view.
          // The issue reported is that opponent doesn't see updates.
          if (channel) {
            channel.push("place_stone", {
              stone_index: index,
              position: { x: result.x, y: result.y }
            });
          }
        }
      } else {
        // Dropped outside - reset to bar
        setMyStones((prev) =>
          prev.map((s) =>
            s.index === index
              ? { ...s, placed: false, resetCount: (s.resetCount || 0) + 1 }
              : s,
          ),
        );

        // Notify server that stone was removed/reset
        if (channel) {
          channel.push("remove_stone", {
            stone_index: index,
          });
        }
      }
      setDragState((prev) => ({
        ...prev,
        isDragging: false,
        stoneIndex: null,
      }));
    },
    [isReady, scale, myStones, updateStonePosition, gameState?.turn_based, gameState?.current_turn_id, channel],
  );

  const handleBanDragEnd = useCallback(
    (index: number, dropPoint: { x: number; y: number }) => {
      if (!sheetRef.current || isReady) return;
      // Block placement if it's not our turn in turn-based mode
      if (gameState.turn_based && gameState.current_turn_id !== playerId) return;

      // Block if ban is locked (placed in a previous turn)
      const myPlacedTurns = gameState.my_placed_turns || { stones: [], bans: [] };
      const banPlacedTurn = myPlacedTurns.bans?.[index];
      const currentTurn = gameState.turn_number || 1;
      if (banPlacedTurn != null && banPlacedTurn < currentTurn) {
        console.log("Ban is locked, ignoring drag");
        setBanDragState({ isDragging: false, x: 0, y: 0, banIndex: null });
        return;
      }

      const sheetRect = sheetRef.current.getBoundingClientRect();

      if (
        dropPoint.x >= sheetRect.left &&
        dropPoint.x <= sheetRect.right &&
        dropPoint.y >= sheetRect.top &&
        dropPoint.y <= sheetRect.bottom
      ) {
        const relativeX = dropPoint.x - sheetRect.left;
        const relativeY = dropPoint.y - sheetRect.top;
        const rawX = relativeX / scale;
        const rawY = relativeY / scale;

        // Clamp logic (simplified for ban)
        // Ensure banRadius is a valid number
        const banRadius = (typeof gameState.ban_radius === 'number' && gameState.ban_radius > 0)
          ? gameState.ban_radius
          : 50;

        console.log("Ban Placement (Drag):", { dropPoint, sheetRect, rawX, rawY, banRadius, gameStateBanRadius: gameState.ban_radius });

        // Usually bans have Y restrictions too? Default to full sheet or valid area?
        // Use same restrictions as existing ban logic if possible
        const hogLineY = VIEW_TOP_OFFSET - HOG_LINE_OFFSET;
        const hogLineBottomEdge = hogLineY + HOG_LINE_WIDTH / 2;
        const backLineY = VIEW_TOP_OFFSET + BACK_LINE_OFFSET;

        const minY = hogLineBottomEdge + banRadius;
        const maxY = backLineY - banRadius;

        const clampedX = Math.max(banRadius, Math.min(SHEET_WIDTH - banRadius, rawX));
        const clampedY = Math.max(minY, Math.min(maxY, rawY));

        setMyBans(prev => prev.map(b =>
          b.index === index
            ? { ...b, x: clampedX, y: clampedY, placed: true }
            : b
        ));

        if (channel) {
          channel.push("place_ban", {
            ban_index: index,
            position: { x: clampedX, y: clampedY }
          });
        }
      } else {
        // Reset to bar logic
        setMyBans(prev => prev.map(b =>
          b.index === index
            ? { ...b, placed: false }
            : b
        ));

        // Notify server that ban was removed/reset
        if (channel) {
          channel.push("remove_ban", {
            ban_index: index,
          });
        }
      }
      setBanDragState({ isDragging: false, x: 0, y: 0, banIndex: null });
    },
    [isReady, scale, updateStonePosition, gameState?.turn_based, gameState?.current_turn_id, gameState.ban_radius, channel]
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
      // Block all placement interactions if it's not our turn in turn-based mode
      if (gameState.turn_based && gameState.current_turn_id !== playerId) {
        gestureState.current = { type: "IDLE" };
        return;
      }
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

                  // Resolve all collisions iteratively
                  const myBannedZone = gameState.banned_zones?.[myColor ?? "red"];

                  // Include opponent stones in collision detection if they are visible/on the board
                  const opponentColor = myColor === "red" ? "yellow" : "red";
                  const opponentStones = (gameState.stones?.[opponentColor] || []).map((s, i) => ({
                    index: 100 + i, // Offset index to avoid collision with own indices
                    x: s.x,
                    y: s.y,
                    placed: true,
                    color: opponentColor as PlayerColor
                  }));

                  // Combine my stones (excluding the one being placed) and opponent stones
                  const allCollidableStones = [...myStones, ...opponentStones];

                  const result = resolveAllCollisions(
                    stoneToPlace.index,
                    clampedX,
                    clampedY,
                    allCollidableStones,
                    myBannedZone,
                  );

                  if (!result.resetToBar) {
                    // Place with resolved position
                    updateStonePosition(
                      stoneToPlace.index,
                      result.x,
                      result.y,
                      true,
                    );

                    // Send to server immediately if turn-based or if we want immediate updates
                    // Note: We always want to send it so opponent sees it (if visible)
                    if (channel) {
                      channel.push("place_stone", {
                        stone_index: stoneToPlace.index,
                        position: { x: result.x, y: result.y },
                      });
                    }
                  }
                  // If resetToBar is true, we silently don't place (user tried to place fully in ban zone)
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

      // Handle ban circle PENDING -> DRAGGING transition
      if (banGestureState.current.type === "PENDING") {
        const { banIndex, startX, startY, timerId, source, startTime } = banGestureState.current;
        const moveDist = Math.sqrt(
          Math.pow(e.clientX - startX, 2) + Math.pow(e.clientY - startY, 2),
        );
        const timeElapsed = Date.now() - startTime;

        // Same logic as stones: pickup drags immediately, placement waits 200ms
        const shouldDrag =
          moveDist > 5 && (source === "pickup" || timeElapsed > 200);

        if (shouldDrag) {
          clearTimeout(timerId);
          banGestureState.current = { type: "DRAGGING", banIndex };
          setBanDragState({
            isDragging: true,
            x: e.clientX,
            y: e.clientY,
            banIndex,
          });
        }
        return;
      }

      // Handle ban circle dragging - check both state and ref for timing safety
      if ((banDragState.isDragging || banGestureState.current.type === "DRAGGING") && (gameState.phase === "ban" || gameState.phase === "placement")) {
        setBanDragState(prev => ({ ...prev, isDragging: true, x: e.clientX, y: e.clientY }));
      }
    };

    // Handle ban circle pointer up
    const handleBanPointerUp = (e: PointerEvent) => {
      // Block all ban placement interactions if it's not our turn in turn-based mode
      if (gameState.turn_based && gameState.current_turn_id !== playerId) {
        banGestureState.current = { type: "IDLE" };
        return;
      }
      // Handle PENDING state (click vs drag decision)
      if (banGestureState.current.type === "PENDING") {
        clearTimeout(banGestureState.current.timerId);
        const { banIndex, startX, startY, source } = banGestureState.current;
        const moveDist = Math.sqrt(
          Math.pow(e.clientX - startX, 2) + Math.pow(e.clientY - startY, 2),
        );

        // If we didn't move much, it's a CLICK -> place ban at click position
        if (moveDist < 5 && source === "placement" && sheetRef.current) {
          const sheetRect = sheetRef.current.getBoundingClientRect();
          // Check if click was on the sheet
          if (
            e.clientX >= sheetRect.left &&
            e.clientX <= sheetRect.right &&
            e.clientY >= sheetRect.top &&
            e.clientY <= sheetRect.bottom
          ) {
            const rawX = (e.clientX - sheetRect.left) / scale;
            const rawY = (e.clientY - sheetRect.top) / scale;

            // Ensure banRadius is a valid number, falling back to 50
            const banRadius = (typeof gameState.ban_radius === 'number' && gameState.ban_radius > 0)
              ? gameState.ban_radius
              : 50;

            console.log("Ban Placement (Click):", { clientX: e.clientX, clientY: e.clientY, rawX, rawY, banRadius, gameStateBanRadius: gameState.ban_radius });

            const hogLineY = VIEW_TOP_OFFSET - HOG_LINE_OFFSET;
            const hogLineBottomEdge = hogLineY + HOG_LINE_WIDTH / 2;
            const backLineY = VIEW_TOP_OFFSET + BACK_LINE_OFFSET;

            const minY = hogLineBottomEdge + banRadius;
            const maxY = backLineY - banRadius;

            const clampedX = Math.max(banRadius, Math.min(SHEET_WIDTH - banRadius, rawX));
            const clampedY = Math.max(minY, Math.min(maxY, rawY));

            setMyBans(prev => prev.map(b =>
              b.index === banIndex
                ? { ...b, x: clampedX, y: clampedY, placed: true }
                : b
            ));

            if (channel) {
              channel.push("place_ban", {
                ban_index: banIndex,
                position: { x: clampedX, y: clampedY }
              });
            }
          }
        }
        banGestureState.current = { type: "IDLE" };
        return;
      }

      // Handle DRAGGING state - check both state and ref for timing safety
      if ((banDragState.isDragging || banGestureState.current.type === "DRAGGING") && (gameState.phase === "ban" || gameState.phase === "placement") && sheetRef.current) {
        const banIndex = banDragState.banIndex ??
          (banGestureState.current.type === "DRAGGING" ? banGestureState.current.banIndex : null);
        const sheetRect = sheetRef.current.getBoundingClientRect();

        // Check if dropped on sheet
        if (
          banIndex !== null &&
          e.clientX >= sheetRect.left &&
          e.clientX <= sheetRect.right &&
          e.clientY >= sheetRect.top &&
          e.clientY <= sheetRect.bottom
        ) {
          const rawX = (e.clientX - sheetRect.left) / scale;
          const rawY = (e.clientY - sheetRect.top) / scale;

          const banRadius = gameState.ban_radius || 50;
          const hogLineY = VIEW_TOP_OFFSET - HOG_LINE_OFFSET;
          const hogLineBottomEdge = hogLineY + HOG_LINE_WIDTH / 2;
          const backLineY = VIEW_TOP_OFFSET + BACK_LINE_OFFSET;

          const minY = hogLineBottomEdge + banRadius;
          const maxY = backLineY - banRadius;

          const clampedX = Math.max(banRadius, Math.min(SHEET_WIDTH - banRadius, rawX));
          const clampedY = Math.max(minY, Math.min(maxY, rawY));

          setMyBans(prev => prev.map(b =>
            b.index === banIndex
              ? { ...b, x: clampedX, y: clampedY, placed: true }
              : b
          ));

          if (gameState.turn_based && channel) {
            channel.push("place_ban", {
              ban_index: banIndex,
              position: { x: clampedX, y: clampedY }
            });
          }
        } else if (banIndex !== null) {
          // Dropped OUTSIDE sheet - reset ban to selection bar (like stones)
          setMyBans(prev => prev.map(b =>
            b.index === banIndex
              ? { ...b, placed: false }
              : b
          ));

          // Notify server that ban was removed/reset
          if (channel) {
            channel.push("remove_ban", {
              ban_index: banIndex,
            });
          }
        }
        setBanDragState({ isDragging: false, x: 0, y: 0, banIndex: null });
        banGestureState.current = { type: "IDLE" };
      }
    };

    window.addEventListener("pointerup", handleGlobalPointerUp);
    window.addEventListener("pointerup", handleBanPointerUp);
    window.addEventListener("pointermove", handleGlobalPointerMove);

    return () => {
      window.removeEventListener("pointerup", handleGlobalPointerUp);
      window.removeEventListener("pointerup", handleBanPointerUp);
      window.removeEventListener("pointermove", handleGlobalPointerMove);
    };
  }, [
    dragState.isDragging,
    dragState.stoneIndex,
    myStones,
    scale,
    myColor,
    gameState.phase,
    gameState.ban_radius,
    isHistoryMode,
    banDragState.isDragging,
    gameState.turn_based,
    gameState.current_turn_id,
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
    if (gameState.phase === 'combined') {
      console.log("Combined Phase Stones:", { red: displayRedStones, yellow: displayYellowStones, rawState: gameState.stones });
    }
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

      // Handle ban phase - similar to placement but for ban circle
      if (gameState.phase === "ban" && !isBanReady && !isHistoryMode) {
        if (!sheetRef.current) return;

        const sheetRect = sheetRef.current.getBoundingClientRect();
        const clickX = e.clientX - sheetRect.left;
        const clickY = e.clientY - sheetRect.top;
        const rawX = clickX / scale;
        const rawY = clickY / scale;

        // Helper to start ban pending gesture
        const startBanPendingGesture = (banIndex: number, source: "pickup" | "placement") => {
          const timerId = window.setTimeout(() => {
            if (banGestureState.current.type === "PENDING") {
              // Promote to DRAGGING after long press
              const { startX, startY, banIndex: idx } = banGestureState.current;
              banGestureState.current = { type: "DRAGGING", banIndex: idx };
              setBanDragState({
                isDragging: true,
                x: startX,
                y: startY,
                banIndex: idx,
              });
            }
          }, 300);

          banGestureState.current = {
            type: "PENDING",
            banIndex,
            startX: e.clientX,
            startY: e.clientY,
            timerId,
            source,
            startTime: Date.now(),
          };
        };

        const banRadius = gameState.ban_radius || 50;

        // Check if clicking on existing placed ban circle for pickup
        for (const ban of myBans) {
          if (!ban.placed) continue;

          // Check if ban is locked (placed in a previous turn) - if so, don't allow pickup
          const myPlacedTurns = gameState.my_placed_turns || { stones: [], bans: [] };
          const banPlacedTurn = myPlacedTurns.bans?.[ban.index];
          const currentTurn = gameState.turn_number || 1;
          const isBanLocked = banPlacedTurn != null && banPlacedTurn < currentTurn;
          if (isBanLocked) continue; // Skip locked bans

          const dx = rawX - ban.x;
          const dy = rawY - ban.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < banRadius) {
            // Start pending gesture for pickup
            startBanPendingGesture(ban.index, "pickup");
            return;
          }
        }

        // Click on sheet to place next unplaced ban
        const banToPlace = myBans.find(b => !b.placed);
        if (banToPlace) {
          const hogLineY = VIEW_TOP_OFFSET - HOG_LINE_OFFSET;
          const hogLineBottomEdge = hogLineY + HOG_LINE_WIDTH / 2;
          const backLineY = VIEW_TOP_OFFSET + BACK_LINE_OFFSET;

          const minY = hogLineBottomEdge + banRadius;
          const maxY = backLineY - banRadius;

          const clampedX = Math.max(banRadius, Math.min(SHEET_WIDTH - banRadius, rawX));
          const clampedY = Math.max(minY, Math.min(maxY, rawY));

          setMyBans(prev => prev.map(b =>
            b.index === banToPlace.index
              ? { ...b, x: clampedX, y: clampedY, placed: true }
              : b
          ));

          // Enter PENDING state to allow immediate dragging (like stones)
          startBanPendingGesture(banToPlace.index, "placement");
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

      // 0. Check for ban pickup (if enabled)
      if ((!gameState.bans_locked) && (gameState.bans_count || 0) > 0) {
        // Ensure banRadius is a valid number
        const banRadius = (typeof gameState.ban_radius === 'number' && gameState.ban_radius > 0)
          ? gameState.ban_radius
          : 50;

        for (const ban of myBans) {
          if (!ban.placed) continue;

          // Check if ban is locked (placed in a previous turn) - if so, don't allow pickup
          const myPlacedTurns = gameState.my_placed_turns || { stones: [], bans: [] };
          const banPlacedTurn = myPlacedTurns.bans?.[ban.index];
          const currentTurn = gameState.turn_number || 1;
          const isBanLocked = banPlacedTurn != null && banPlacedTurn < currentTurn;
          if (isBanLocked) continue; // Skip locked bans

          const dx = rawX - ban.x;
          const dy = rawY - ban.y;
          if (Math.sqrt(dx * dx + dy * dy) < banRadius) {
            // Start Ban Pending Gesture (Inline)
            const timerId = window.setTimeout(() => {
              if (banGestureState.current.type === "PENDING") {
                const { startX, startY, banIndex: idx } = banGestureState.current;
                banGestureState.current = { type: "DRAGGING", banIndex: idx };
                setBanDragState({
                  isDragging: true,
                  x: startX,
                  y: startY,
                  banIndex: idx
                });
              }
            }, 300);
            banGestureState.current = {
              type: "PENDING",
              banIndex: ban.index,
              startX: e.clientX,
              startY: e.clientY,
              timerId,
              source: "pickup",
              startTime: Date.now()
            };
            return;
          }
        }
      }

      // 1. Check for stone pickup (Smart Targeting)
      // Find closest stone within threshold
      const PICKUP_THRESHOLD = 44 / scale; // 44px in logical units
      let closestStone: StonePosition | null = null;
      let minDistance = Infinity;

      for (const stone of myStones) {
        if (!stone.placed) continue;

        // Check if stone is locked (placed in a previous turn) - if so, don't allow pickup
        const myPlacedTurns = gameState.my_placed_turns || { stones: [], bans: [] };
        const stonePlacedTurn = myPlacedTurns.stones?.[stone.index];
        const currentTurn = gameState.turn_number || 1;
        const isStoneLocked = stonePlacedTurn != null && stonePlacedTurn < currentTurn;
        if (isStoneLocked) continue; // Skip locked stones

        const dx = rawX - stone.x;
        const dy = rawY - stone.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // If we are just checking for pickup, use standard threshold. 
        // But if we fail standard threshold, we might still want to avoid placing a NEW stone if we are close to an existing one.
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

      // 2. If no stone found, try to place a new item (ban or stone)
      // First, block placement if it's not our turn
      if (gameState.turn_based && gameState.current_turn_id !== playerId) return;

      // Block if we've already used all our placements for this turn
      const placementsThisTurn = gameState.placements_this_turn || 0;
      const placementsPerTurn = gameState.placements_per_turn || 999; // Default high if not set
      if (gameState.turn_based && placementsThisTurn >= placementsPerTurn) {
        console.log("Placements limit reached for this turn:", placementsThisTurn, "/", placementsPerTurn);
        return;
      }

      // Helper for ban placement
      const placeBanAtPosition = (banToPlace: typeof myBans[0], x: number, y: number) => {
        const banRadius = gameState.ban_radius || 50;
        const hogLineY = VIEW_TOP_OFFSET - HOG_LINE_OFFSET;
        const hogLineBottomEdge = hogLineY + HOG_LINE_WIDTH / 2;
        const backLineY = VIEW_TOP_OFFSET + BACK_LINE_OFFSET;
        const minY = hogLineBottomEdge + banRadius;
        const maxY = backLineY - banRadius;

        const clampedX = Math.max(banRadius, Math.min(SHEET_WIDTH - banRadius, x));
        const clampedY = Math.max(minY, Math.min(maxY, y));

        setMyBans(prev => prev.map(b =>
          b.index === banToPlace.index ? { ...b, x: clampedX, y: clampedY, placed: true } : b
        ));

        if (channel) {
          channel.push("place_ban", {
            ban_index: banToPlace.index,
            position: { x: clampedX, y: clampedY }
          });
        }

        // Start pending gesture for ban (allow immediate drag)
        const timerId = window.setTimeout(() => {
          if (banGestureState.current.type === "PENDING") {
            const { startX, startY, banIndex: idx } = banGestureState.current;
            banGestureState.current = { type: "DRAGGING", banIndex: idx };
            setBanDragState({ isDragging: true, x: startX, y: startY, banIndex: idx });
          }
        }, 300);
        banGestureState.current = {
          type: "PENDING",
          banIndex: banToPlace.index,
          startX: e.clientX,
          startY: e.clientY,
          timerId,
          source: "placement",
          startTime: Date.now()
        };
      };

      // Check if we should place ban or stone (bans first in bar, then stones)
      // Find first unplaced ban
      const banToPlace = !gameState.bans_locked && myBans.length > 0
        ? [...myBans].sort((a, b) => a.index - b.index).find((b) => !b.placed)
        : null;

      if (banToPlace) {
        // Place ban at click position
        placeBanAtPosition(banToPlace, rawX, rawY);
        return;
      }

      // Find first unplaced stone (sort by index to ensure leftmost is picked first)
      const stoneToPlace = !gameState.stones_locked
        ? [...myStones].sort((a, b) => a.index - b.index).find((s) => !s.placed)
        : null;
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

      // Resolve collisions with other stones and ban zones
      const myBannedZone = gameState.banned_zones?.[myColor ?? "red"];

      // Include opponent stones in collision detection
      const opponentColor = myColor === "red" ? "yellow" : "red";
      const opponentStones = (gameState.stones?.[opponentColor] || []).map((s, i) => ({
        index: 100 + i, // Offset index
        x: s.x,
        y: s.y,
        placed: true,
        color: opponentColor as PlayerColor
      }));

      const allCollidableStones = [...myStones, ...opponentStones];

      const result = resolveAllCollisions(
        stoneToPlace.index,
        clampedX,
        clampedY,
        allCollidableStones,
        myBannedZone,
      );

      if (result.resetToBar) {
        // Stone would be fully inside ban zone - don't place
        return;
      }

      // Place the stone with resolved position
      updateStonePosition(stoneToPlace.index, result.x, result.y, true);

      // Send update to server immediately
      if (channel) {
        channel.push("place_stone", {
          stone_index: stoneToPlace.index,
          position: { x: result.x, y: result.y },
        });
      }

      // Enter PENDING state to allow immediate dragging
      startPendingGesture(stoneToPlace.index, "placement");
    },
    [
      isReady,
      gameState.phase,
      gameState.ban_radius,
      isHistoryMode,
      scale,
      myStones,
      updateStonePosition,
      displayRedStones,
      displayYellowStones,
      myBans,
      isBanReady,
      banDragState.isDragging,
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

    // Send only unlocked stone placements (locked ones were already synced in previous turns)
    const myPlacedTurns = gameState.my_placed_turns || { stones: [], bans: [] };
    const currentTurn = gameState.turn_number || 1;

    const placementPromises = myStones
      .filter((s) => {
        if (!s.placed) return false;
        // Skip locked stones (placed in previous turns)
        const stonePlacedTurn = myPlacedTurns.stones?.[s.index];
        const isLocked = stonePlacedTurn != null && stonePlacedTurn < currentTurn;
        return !isLocked;
      })
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
            // Clear localStorage after successful confirmation
            clearPlacements(gameState.game_id);
          })
          .receive("error", (reasons: any) => {
            console.error("Confirmation failed", reasons);
            alert("Failed to confirm placement: " + JSON.stringify(reasons));
          });
      })
      .catch((err) => {
        // Silently log errors that are expected (e.g., item_locked from race conditions)
        // Don't interrupt the user with alerts for these
        console.warn("Stone placement error (handled gracefully):", err);
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

  // First player decision voting
  const handleVoteFirstPlayer = (voteForId: string) => {
    if (!channel) return;

    channel.push("vote_first_player", { vote_for: voteForId })
      .receive("error", (err: any) => {
        console.error("Vote failed:", err);
      });
  };

  // Ban phase handlers
  const handleConfirmBan = () => {
    if (!channel) return;

    const placedBans = myBans.filter(b => b.placed);
    if (placedBans.length === 0) return;

    // Send all ban placements to server (for now just the first one, but ready for multiple)
    const firstBan = placedBans[0];
    channel
      .push("place_ban", {
        position: { x: firstBan.x, y: firstBan.y },
      })
      .receive("ok", () => {
        // Then confirm
        channel
          .push("confirm_ban", {})
          .receive("ok", () => {
            setIsBanReady(true);
            // Clear localStorage after successful confirmation
            clearPlacements(gameState.game_id);
          })
          .receive("error", (reasons: any) => {
            console.error("Failed to confirm ban", reasons);
          });
      })
      .receive("error", (reasons: any) => {
        console.error("Failed to place ban", reasons);
      });
  };

  const handleCancelBan = () => {
    if (!channel) return;

    channel
      .push("cancel_ban", {})
      .receive("ok", () => {
        setIsBanReady(false);
      })
      .receive("error", (reasons: any) => {
        console.error("Failed to cancel ban", reasons);
      });
  };



  const handleBanDrag = useCallback(
    (index: number, position: { x: number; y: number }) => {
      setBanDragState({
        isDragging: true,
        x: position.x,
        y: position.y,
        banIndex: index,
      });
    },
    [],
  );

  if (!gameState || !playerId || !myColor) {
    return <div>Loading game...</div>;
  }

  const allStonesPlaced = myStones.every((s) => s.placed);
  const allBansPlaced = myBans.every((b) => b.placed);
  const allItemsPlaced = allStonesPlaced && allBansPlaced;

  // For turn-based mode: show confirm when placements_this_turn >= placements_per_turn
  // OR when all items are placed
  const isMyTurn = !gameState.turn_based || gameState.current_turn_id === playerId;
  const turnPlacementsDone = gameState.turn_based &&
    (gameState.placements_this_turn || 0) >= (gameState.placements_per_turn || 1);

  const readyToConfirm = isMyTurn && (turnPlacementsDone || allItemsPlaced);

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
            className={`absolute rounded-full shadow-md animate-glow transition-all duration-200 hover:brightness-110 ${isHighlighted ? "scale-105" : ""
              } ${gameState.phase === "combined" || isHistoryMode
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
        data-testid={forLoupe ? undefined : "curling-sheet"}
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

      {/* Render placed ban circles during ban phase */}
      {gameState.phase === "ban" && myBans.filter(b => b.placed).map((ban) => {
        const banSize = (gameState.ban_radius || 50) * 2 * scale;
        const isDraggingThisBan = banDragState.isDragging && banDragState.banIndex === ban.index;
        return (
          <div
            key={ban.index}
            className={`absolute rounded-full border-4 border-dashed flex items-center justify-center ${!isBanReady ? 'draggable-ban-on-sheet' : ''}`}
            onPointerDown={handleSheetPointerDown}
            style={{
              width: banSize,
              height: banSize,
              borderColor: "#FB923C",
              backgroundColor: "rgba(251, 146, 60, 0.25)",
              left: ban.x * scale,
              top: ban.y * scale,
              marginLeft: -banSize / 2,
              marginTop: -banSize / 2,
              zIndex: 3,
              cursor: isBanReady ? "default" : "grab",
              pointerEvents: isBanReady ? "none" : "auto",
              opacity: isDraggingThisBan ? 0.3 : 1,
            }}
          >
            <X size={Math.min(40, (gameState.ban_radius || 50) * scale * 0.8)} color="#FB923C" strokeWidth={3} />
          </div>
        );
      })}

      {/* Render ban zones during placement phase */}
      {gameState.phase === "placement" && (
        <>
          {/* Render MY ban rings - stored under opponent's color key */}
          {/* If locked (placed in previous turn), show as green with lock icon */}
          {/* If editable (placed this turn or not placed), show as orange dashed */}
          {myColor && gameState.banned_zones && (() => {
            const opponentColor = myColor === "red" ? "yellow" : "red";
            const myBanData = gameState.banned_zones[opponentColor];
            if (!myBanData) return null;

            // Normalize to array - backend sends single object for 1 ban, array for multiple
            const myBans = Array.isArray(myBanData) ? myBanData : [myBanData];

            const myPlacedTurns = gameState.my_placed_turns || { stones: [], bans: [] };
            const currentTurn = gameState.turn_number || 1;

            return myBans.map((banPosition, banIndex) => {
              const banSize = banPosition.radius * 2 * scale;

              // Check if this specific ban is locked
              const banPlacedTurn = myPlacedTurns.bans?.[banIndex];
              const isBanLocked = banPlacedTurn != null && banPlacedTurn < currentTurn;

              // Ban ring is editable ONLY if:
              // 1. It's MY turn (in turn-based mode)
              // 2. AND I'm not ready yet
              // 3. AND the ban is NOT locked (not placed in a previous turn)
              const canEditBan = isMyTurn && !isReady && !isBanLocked;

              if (!canEditBan) {
                // Show as confirmed green ring with optional lock icon
                return (
                  <div
                    key={`my-placed-ban-${banIndex}`}
                    className="absolute rounded-full pointer-events-none flex items-center justify-center"
                    style={{
                      width: banSize,
                      height: banSize,
                      border: "4px solid rgba(74, 222, 128, 0.6)", // green-400 with opacity
                      left: banPosition.x * scale,
                      top: banPosition.y * scale,
                      marginLeft: -banSize / 2,
                      marginTop: -banSize / 2,
                      zIndex: 0,
                    }}
                  >
                    {/* Show lock icon if locked from previous turn */}
                    {isBanLocked && (
                      <div className="bg-white/80 rounded-full p-1">
                        <Lock size={Math.min(20, banSize / 4)} className="text-green-600" />
                      </div>
                    )}
                  </div>
                );
              } else {
                // Show as editable orange dashed ring (my turn and not ready and not locked)
                const isDraggingThisBan = banDragState.isDragging && banDragState.banIndex === banIndex;
                return (
                  <div
                    key={`my-placing-ban-${banIndex}`}
                    className="absolute rounded-full border-4 border-dashed flex items-center justify-center draggable-ban-on-sheet"
                    onPointerDown={handleSheetPointerDown}
                    data-ban-index={banIndex}
                    style={{
                      width: banSize,
                      height: banSize,
                      borderColor: "#FB923C",
                      backgroundColor: "rgba(251, 146, 60, 0.25)",
                      left: banPosition.x * scale,
                      top: banPosition.y * scale,
                      marginLeft: -banSize / 2,
                      marginTop: -banSize / 2,
                      zIndex: 3,
                      cursor: "grab",
                      opacity: isDraggingThisBan ? 0.3 : 1,
                    }}
                  >
                    <X size={Math.min(40, banPosition.radius * scale * 0.8)} color="#FB923C" strokeWidth={3} />
                  </div>
                );
              }
            });
          })()}

          {/* Render OPPONENT's ban(s) that restricts ME - stored under my color key */}
          {/* Always show as orange (restriction indicator) */}
          {myColor && gameState.banned_zones && (() => {
            const opponentBanData = gameState.banned_zones[myColor];
            if (!opponentBanData) return null;

            // Normalize to array - backend sends single object for 1 ban, array for multiple
            const opponentBans = Array.isArray(opponentBanData) ? opponentBanData : [opponentBanData];

            return opponentBans.map((banZone, banIndex) => (
              <div
                key={`opponent-ban-${banIndex}`}
                className="absolute rounded-full pointer-events-none"
                style={{
                  width: banZone.radius * 2 * scale,
                  height: banZone.radius * 2 * scale,
                  backgroundColor: "rgba(251, 146, 60, 0.3)",
                  border: "3px solid rgba(251, 146, 60, 0.6)",
                  left: banZone.x * scale,
                  top: banZone.y * scale,
                  marginLeft: -banZone.radius * scale,
                  marginTop: -banZone.radius * scale,
                  zIndex: 1,
                }}
              />
            ));
          })()}
        </>
      )}

      {/* Render placed stones */}
      {!isHistoryMode &&
        !isReady &&
        gameState.phase === "placement" &&
        myStones.map((stone) => {
          const isDraggingThisStone =
            dragState.isDragging && dragState.stoneIndex === stone.index;

          // Check if stone is locked (placed in a previous turn)
          const myPlacedTurns = gameState.my_placed_turns || { stones: [], bans: [] };
          const stonePlacedTurn = myPlacedTurns.stones?.[stone.index];
          const currentTurn = gameState.turn_number || 1;
          const isStoneLocked = stonePlacedTurn != null && stonePlacedTurn < currentTurn;
          // Stone is editable if it's my turn, I'm not ready, and it's not locked
          const canEditStone = isMyTurn && !isReady && !isStoneLocked;

          return (
            stone.placed && (
              <div
                key={`stone-wrapper-${stone.index}`}
                className={canEditStone ? 'stone-hover-container absolute' : 'absolute'}
                onPointerDown={canEditStone ? handleSheetPointerDown : undefined}
                style={{
                  left: stone.x * scale,
                  top: stone.y * scale,
                  width: stonePixelSize,
                  height: stonePixelSize,
                  marginLeft: -stonePixelSize / 2,
                  marginTop: -stonePixelSize / 2,
                  zIndex: isStoneLocked ? 5 : 10,
                }}
              >
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
                      boxShadow: `inset 0 0 0 1px #00000055`,
                      left: 0,
                      top: 0,
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
                  position={{ x: 0, y: 0 }}
                  onDragEnd={forLoupe ? () => { } : (canEditStone ? handleStoneDragEnd : () => { })}
                  isPlaced={false}
                  size={stonePixelSize}
                  customColor={
                    gameState.team_colors
                      ? gameState.team_colors[myColor]
                      : undefined
                  }
                  onClick={(e) => e.stopPropagation()}
                  opacity={isDraggingThisStone ? 0 : (isStoneLocked ? 0.85 : 1)}
                  interactive={canEditStone && !forLoupe}
                />

                {/* Show lock icon on locked stones */}
                {isStoneLocked && !isDraggingThisStone && (
                  <div
                    className="absolute inset-0 flex items-center justify-center pointer-events-none"
                  >
                    <div className="bg-white/80 rounded-full p-0.5">
                      <Lock size={Math.min(14, stonePixelSize / 2)} className="text-green-600" />
                    </div>
                  </div>
                )}
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
    <motion.div className="fixed inset-0 h-[100dvh] md:relative md:inset-auto md:h-auto flex flex-col items-center w-full max-w-md mx-auto md:aspect-[9/16] md:min-h-[1000px] md:rounded-2xl md:shadow-2xl bg-icy-white backdrop-blur-md transition-all duration-300 overflow-hidden select-none">
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

      {/* Ban Circle Drag Preview (Fixed Position - Always on Top) */}
      {banDragState.isDragging &&
        (gameState.phase === "ban" || gameState.phase === "placement") &&
        createPortal(
          <div
            className="fixed pointer-events-none z-[9999] flex items-center justify-center"
            style={{
              width: (gameState.ban_radius || 50) * 2 * scale,
              height: (gameState.ban_radius || 50) * 2 * scale,
              left: banDragState.x - (gameState.ban_radius || 50) * scale,
              top: banDragState.y - (gameState.ban_radius || 50) * scale,
            }}
          >
            <div
              className="w-full h-full rounded-full border-4 border-dashed flex items-center justify-center"
              style={{
                borderColor: "#FB923C",
                backgroundColor: "rgba(251, 146, 60, 0.35)",
              }}
            >
              <X size={Math.min(40, (gameState.ban_radius || 50) * scale * 0.8)} color="#FB923C" strokeWidth={3} />
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
              <Button
                variant="primary"
                shape="circle"
                onClick={() => {
                  setShowMenu(!showMenu);
                  setHighlightedStone(null);
                  setHoveredStone(null);
                }}
                className="w-12 h-12 shadow-md"
                whileHover={buttonHover}
                whileTap={buttonTap}
                aria-label="Menu"
              >
                <Menu size={24} className="w-6 h-6 shrink-0" />
              </Button>

              {/* Menu Bottom Sheet */}
              <BottomSheet
                isOpen={showMenu}
                onClose={() => setShowMenu(false)}
                title="menu"
              >
                <div className="flex flex-col gap-1">
                  {onShare && (
                    <Button
                      variant="ghost"
                      onClick={() => {
                        onShare();
                        setShowMenu(false);
                      }}
                      className="w-full justify-start text-base font-medium h-auto py-4 rounded-2xl"
                      noHoverAnimation
                    >
                      <Share2 size={22} className="text-gray-600" />
                      Share
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    onClick={() => {
                      if (gameState.history && gameState.history.length > 0) {
                        setSelectedHistoryRound(0);
                      } else {
                        alert("No history available yet.");
                      }
                      setShowMenu(false);
                    }}
                    className="w-full justify-start text-base font-medium h-auto py-4 rounded-2xl"
                    noHoverAnimation
                  >
                    <HistoryIcon size={22} className="text-gray-600" />
                    History
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setShowHelp(true);
                      setShowMenu(false);
                    }}
                    className="w-full justify-start text-base font-medium h-auto py-4 rounded-2xl"
                    noHoverAnimation
                  >
                    <Info size={22} className="text-gray-600" />
                    Help
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      openSettings();
                      setShowMenu(false);
                    }}
                    className="w-full justify-start text-base font-medium h-auto py-4 rounded-2xl"
                    noHoverAnimation
                  >
                    <Settings size={22} className="text-gray-600" />
                    Settings
                  </Button>
                  <div className="h-px bg-gray-200 my-2" />
                  <Button
                    variant="ghost"
                    onClick={() => (window.location.href = "/")}
                    className="w-full justify-start text-base font-medium h-auto py-4 rounded-2xl text-red-600 hover:text-red-700 hover:bg-red-50"
                    noHoverAnimation
                  >
                    <LogOut size={22} />
                    Exit Game
                  </Button>
                </div>
              </BottomSheet>
            </div>

            {/* Contextual Controls */}
            <div className="flex-grow flex items-center justify-center min-w-0">
              {/* Ban Phase */}
              {gameState.phase === "ban" && !isBanReady && !isHistoryMode && (
                <div className="w-full flex items-center gap-2">
                  {myBans.some(b => !b.placed) ? (
                    <div className="flex-grow min-w-0">
                      <BanSelectionBar
                        bans={myBans}
                        onDragEnd={handleBanDragEnd}
                        onDrag={handleBanDrag}
                        disabled={false}
                        draggedBanIndex={banDragState.isDragging ? banDragState.banIndex : null}
                      />
                    </div>
                  ) : (
                    <Button
                      onClick={handleConfirmBan}
                      className="flex-grow h-12 text-base"
                      noHoverAnimation
                    >
                      confirm ban
                    </Button>
                  )}
                </div>
              )}

              {/* Placement Phase - Active */}
              {gameState.phase === "placement" &&
                !isReady &&
                !isHistoryMode && (
                  <div className="w-full flex items-center gap-2">
                    {/* Show bar when: not ready to confirm OR currently dragging (to allow returning to bar) */}
                    {(!readyToConfirm || dragState.isDragging || banDragState.isDragging) ? (
                      <div className="flex-grow min-w-0">
                        {myColor && (
                          <UnifiedSelectionBar
                            stones={myStones}
                            bans={myBans}
                            myColor={myColor}
                            onStoneDragEnd={handleStoneDragEnd}
                            onStoneDragStart={handleStoneDrag}
                            onBanDragEnd={handleBanDragEnd}
                            onBanDragStart={handleBanDrag}

                            disabled={gameState.turn_based && gameState.current_turn_id !== playerId}
                            waitingMessage={gameState.turn_based && gameState.current_turn_id !== playerId ? "Waiting for opponent..." : undefined}
                            stonesLocked={gameState.stones_locked}
                            bansLocked={gameState.bans_locked}

                            draggedStoneIndex={
                              dragState.isDragging ? dragState.stoneIndex : null
                            }
                            teamColors={gameState.team_colors}
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
                    variant="ghost"
                    className={`w-12 h-12 rounded-2xl p-0 relative group ${showMeasurements
                      ? "bg-lavender-500 hover:bg-lavender-600 text-white hover:text-white shadow-md"
                      : "bg-gray-200 hover:bg-icy-button-bg/20 text-icy-button-bg shadow-none"}`}
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
                  {gameState.total_rounds > 0 && gameState.current_round >= gameState.total_rounds ? (
                    <Button
                      onClick={() => window.location.href = '/'}
                      variant="primary"
                      className="flex-grow h-12 text-base"
                    >
                      exit game
                    </Button>
                  ) : (
                    <Button
                      onClick={handleNextRound}
                      variant="primary"
                      className="flex-grow h-12 text-base"
                      noHoverAnimation
                    >
                      start next round
                    </Button>
                  )}
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
      <PhaseHelpDialog
        isOpen={showHelp}
        onClose={() => setShowHelp(false)}
        phase={gameState.phase}
        gameType={gameState.game_type}
      />

      <SettingsDialog />

      {/* First Player Decision Overlay - Shows during turn_order phase OR when showing dice results */}
      {(gameState.phase === "turn_order" || persistedDiceData) && (
        <FirstPlayerDecision
          players={persistedDiceData?.players || gameState.players?.map(p => ({
            id: p.id,
            name: p.name || 'Player',
            color: p.color as 'red' | 'yellow'
          })) || []}
          teamColors={persistedDiceData?.teamColors || gameState.team_colors || { red: '#cc0000', yellow: '#e6b800' }}
          myPlayerId={playerId}
          myVote={gameState.my_vote || null}
          opponentHasVoted={gameState.opponent_has_voted || false}
          onVote={handleVoteFirstPlayer}
          diceRolls={persistedDiceData?.diceRolls || gameState.dice_rolls}
          firstPlayer={persistedDiceData?.firstPlayer || gameState.first_player}
          onDiceClose={() => setPersistedDiceData(null)}
        />
      )}

      {/* Waiting for Opponent Overlay - Centered on screen */}
      <AnimatePresence>
        {((gameState.player_ready?.[playerId] &&
          (gameState.phase === "placement" || !waitingMinTimeElapsed)) ||
          (gameState.phase === "ban" && isBanReady)) && (
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

                {/* Hide "make changes" button in turn-based games - once you confirm, your turn is over */}
                {!gameState.turn_based && (
                  <Button
                    onClick={gameState.phase === "ban" ? handleCancelBan : handleCancelPlacement}
                    variant="outline"
                    shape="pill"
                    className="h-12 px-6 bg-white/90 hover:bg-white text-gray-800 border border-gray-200/50 shadow-md backdrop-blur-md animate-glow"
                    noHoverAnimation
                    noTapAnimation
                  >
                    <RotateCcw size={20} />
                    make changes
                  </Button>
                )}
              </motion.div>
            </motion.div>
          )}
      </AnimatePresence>

      {/* Round Start Overlay */}
      <RoundStartOverlay
        isVisible={showRoundStartOverlay}
        roundNumber={gameState.current_round}
        phaseName={gameState.phase === 'ban' ? 'ban phase' : gameState.phase === 'placement' ? 'placement phase' : 'resolution phase'}
        onComplete={handleRoundOverlayComplete}
      />

      {/* Game End Overlay */}
      <GameEndOverlay
        isVisible={gameState.status === 'finished'}
        scores={gameState.scores || { red: 0, yellow: 0 }}
        myColor={myColor}
        teamColors={gameState.team_colors}
        onReturnHome={() => window.location.href = '/'}
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
