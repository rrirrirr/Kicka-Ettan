import { useState, useEffect, useRef } from 'react';
import CurlingSheet from './curling-sheet';
import DraggableStone from './draggable-stone';
import StoneSelectionBar from './stone-selection-bar';
import StoneMeasurements from './stone-measurements';
import { Channel } from 'phoenix';
import {
  SHEET_WIDTH,
  STONE_RADIUS,
  VIEW_TOP_OFFSET,
  VIEW_BOTTOM_OFFSET,
  COLOR_ICE,
  HOG_LINE_OFFSET,
  BACK_LINE_OFFSET
} from '../utils/constants';

interface CurlingGameProps {
  gameState?: any;
  playerId?: string;
  channel?: Channel;
  onShare?: () => void;
}

interface StonePosition {
  index: number;
  x: number;
  y: number;
  placed: boolean;
  resetCount?: number;
}

// Helper function for collision resolution
const resolveCollisions = (
  currentIndex: number,
  currentX: number,
  currentY: number,
  allStones: StonePosition[]
) => {
  const MIN_DISTANCE = STONE_RADIUS * 2;
  let resolvedX = currentX;
  let resolvedY = currentY;

  // Iterative collision resolution
  for (let i = 0; i < 3; i++) { // Limit iterations to prevent infinite loops
    let collisionFound = false;

    allStones.forEach(otherStone => {
      if (otherStone.index === currentIndex || !otherStone.placed) return;

      const dx = resolvedX - otherStone.x;
      const dy = resolvedY - otherStone.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < MIN_DISTANCE) {
        collisionFound = true;
        // Calculate push vector
        let nx = dx / distance;
        let ny = dy / distance;

        // Handle exact overlap
        if (distance === 0) {
          nx = Math.random() * 2 - 1; // Random direction
          ny = Math.random() * 2 - 1;
          const len = Math.sqrt(nx * nx + ny * ny);
          nx /= len;
          ny /= len;
        }

        // Move dropped stone out
        resolvedX = otherStone.x + nx * (MIN_DISTANCE + 1);
        resolvedY = otherStone.y + ny * (MIN_DISTANCE + 1);
      }
    });

    if (!collisionFound) break;
  }

  // Ensure we stay within bounds after collision resolution
  // Valid Y range:
  // Min: Hog Line (VIEW_TOP_OFFSET - HOG_LINE_OFFSET)
  // Max: Back Line (VIEW_TOP_OFFSET + BACK_LINE_OFFSET)
  // We allow stones to touch/overlap the back line, so we clamp center to [minY + radius, maxY + radius]
  const hogLineY = VIEW_TOP_OFFSET - HOG_LINE_OFFSET; // Should be 0 if offsets match
  const backLineY = VIEW_TOP_OFFSET + BACK_LINE_OFFSET;

  const minY = hogLineY + STONE_RADIUS;
  const maxY = backLineY + STONE_RADIUS;

  resolvedX = Math.max(STONE_RADIUS, Math.min(SHEET_WIDTH - STONE_RADIUS, resolvedX));
  resolvedY = Math.max(minY, Math.min(maxY, resolvedY));

  return { x: resolvedX, y: resolvedY };
};


import { Menu, History as HistoryIcon, Info, LogOut, Share2, Ruler } from 'lucide-react';

// ... existing imports ...

const CurlingGame = ({ gameState, playerId, channel, onShare }: CurlingGameProps) => {
  const [myStones, setMyStones] = useState<StonePosition[]>([]);
  const [myColor, setMyColor] = useState<'red' | 'yellow' | null>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const [isReady, setIsReady] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [selectedHistoryRound, setSelectedHistoryRound] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [sheetDimensions, setSheetDimensions] = useState({ width: 0, height: 0 });
  const [scale, setScale] = useState(1);
  const [highlightedStone, setHighlightedStone] = useState<{ color: 'red' | 'yellow'; index: number } | null>(null);
  const [hoveredStone, setHoveredStone] = useState<{ color: 'red' | 'yellow'; index: number } | null>(null);
  const [showMeasurements, setShowMeasurements] = useState(false);

  // Update scale and dimensions when container resizes
  useEffect(() => {
    if (!containerRef.current) return;

    const updateDimensions = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.offsetWidth;
        const containerHeight = containerRef.current.offsetHeight;

        // If container has no size yet, skip
        if (containerWidth === 0 || containerHeight === 0) return;

        const sheetAspectRatio = SHEET_WIDTH / (VIEW_TOP_OFFSET + VIEW_BOTTOM_OFFSET);

        // Always use full container width
        const newWidth = containerWidth;
        const newHeight = newWidth / sheetAspectRatio;

        setSheetDimensions({ width: newWidth, height: newHeight });
        setScale(newWidth / SHEET_WIDTH);
      }
    };

    // Use ResizeObserver to detect container size changes
    const resizeObserver = new ResizeObserver(() => {
      updateDimensions();
    });

    resizeObserver.observe(containerRef.current);

    // Initial call
    updateDimensions();

    return () => {
      resizeObserver.disconnect();
    };
  }, [myColor]);

  const [lastInitializedRound, setLastInitializedRound] = useState(0);

  // Initialize stones based on game state
  useEffect(() => {
    if (gameState && playerId) {
      const player = gameState.players.find((p: any) => p.id === playerId);
      if (player) {
        setMyColor(player.color);

        // Initialize stones if not already done or if round changed
        if (gameState.current_round > lastInitializedRound) {
          const initialStones = Array.from({ length: gameState.stones_per_team }).map((_, i) => ({
            index: i,
            x: 0,
            y: 0,
            placed: false,
            resetCount: 0
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

  const handleStoneDragEnd = (index: number, dropPoint: { x: number; y: number }, offset: { x: number; y: number }) => {
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
      const stone = myStones.find(s => s.index === index);

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

      if (stone && stone.placed) {
        // If already placed, use the offset to calculate new position relative to old position
        // Offset is in pixels, need to convert to logical units
        const logicalOffsetX = offset.x / scale;
        const logicalOffsetY = offset.y / scale;

        rawX = stone.x + logicalOffsetX;
        rawY = stone.y + logicalOffsetY;
      } else {
        // If coming from bar, calculate relative position from drop point
        const relativeX = dropPoint.x - sheetRect.left;
        const relativeY = dropPoint.y - sheetRect.top;

        rawX = relativeX / scale;
        rawY = relativeY / scale;
      }

      // Clamp to sheet boundaries (accounting for stone radius)
      // Valid Y range: Hog Line to Back Line
      // Hog Line: We want to be strictly below it.
      // Back Line: We want to allow touching/overlapping, but not fully past.
      const hogLineY = VIEW_TOP_OFFSET - HOG_LINE_OFFSET;
      const backLineY = VIEW_TOP_OFFSET + BACK_LINE_OFFSET;

      // MinY: Center must be at least Radius away (touching). Add 1px to be strictly below?
      // User said "still able to place above". Maybe they mean touching is bad?
      // Let's stick to Radius for now, but ensure it's working.
      const minY = hogLineY + STONE_RADIUS;

      // MaxY: Center on the back line means half the stone is out.
      // Previous was backLineY + STONE_RADIUS (top edge on line).
      // User said "too far below". Let's restrict center to backLineY.
      const maxY = backLineY;

      const clampedX = Math.max(STONE_RADIUS, Math.min(SHEET_WIDTH - STONE_RADIUS, rawX));
      const clampedY = Math.max(minY, Math.min(maxY, rawY));

      // Resolve collisions
      const { x: resolvedX, y: resolvedY } = resolveCollisions(index, clampedX, clampedY, myStones);

      updateStonePosition(index, resolvedX, resolvedY, true);
    } else {
      // Dropped outside - reset to bar
      setMyStones(prev => prev.map(s =>
        s.index === index ? { ...s, placed: false, resetCount: (s.resetCount || 0) + 1 } : s
      ));
    }
  };

  const updateStonePosition = (index: number, x: number, y: number, placed: boolean) => {
    setMyStones(prev => prev.map(s =>
      s.index === index ? { ...s, x, y, placed } : s
    ));
  };

  const handleConfirmPlacement = () => {
    if (!channel) return;

    // Send all stone placements
    const placementPromises = myStones.filter(s => s.placed).map(stone => {
      return new Promise((resolve, reject) => {
        channel.push("place_stone", {
          stone_index: stone.index,
          position: { x: stone.x, y: stone.y }
        })
          .receive("ok", resolve)
          .receive("error", (reasons: any) => reject(reasons));
      });
    });

    // Wait for all placements to be acknowledged before confirming
    Promise.all(placementPromises)
      .then(() => {
        channel.push("confirm_placement", {})
          .receive("ok", () => {
            setIsReady(true);
          })
          .receive("error", (reasons: any) => {
            console.error("Confirmation failed", reasons);
            alert("Failed to confirm placement: " + JSON.stringify(reasons));
          });
      })
      .catch(err => {
        console.error("Failed to place stones", err);
        alert("Failed to save stone positions: " + JSON.stringify(err));
      });
  };

  const handleNextRound = () => {
    setHighlightedStone(null);
    setHoveredStone(null);
    if (channel) {
      channel.push("ready_for_next_round", {});
    }
  };

  if (!gameState || !playerId || !myColor) {
    return <div>Loading game...</div>;
  }

  const allStonesPlaced = myStones.every(s => s.placed);



  // Calculate pixel size for stones
  const stonePixelSize = STONE_RADIUS * 2 * scale;

  // Determine which stones to display (History vs Live)
  const isHistoryMode = selectedHistoryRound !== null;
  let displayRedStones: any[] = [];
  let displayYellowStones: any[] = [];

  if (isHistoryMode) {
    const historyRound = gameState.history && gameState.history[selectedHistoryRound];
    if (historyRound) {
      displayRedStones = historyRound.stones?.red || [];
      displayYellowStones = historyRound.stones?.yellow || [];
    }
  } else {
    displayRedStones = gameState.stones.red || [];
    displayYellowStones = gameState.stones.yellow || [];
  }

  // Helper to render stones
  const renderStones = (stones: any[], color: 'red' | 'yellow') => {
    return stones.map((pos: any, i: number) => (
      <div
        key={`${color}-${i}`}
        className="absolute rounded-full border-2 border-white shadow-md flex items-center justify-center"
        style={{
          width: stonePixelSize,
          height: stonePixelSize,
          backgroundColor: gameState.team_colors ? gameState.team_colors[color] : (color === 'red' ? '#cc0000' : '#e6b800'),
          left: pos.x * scale,
          top: pos.y * scale,
          marginLeft: -stonePixelSize / 2,
          marginTop: -stonePixelSize / 2,
          cursor: (gameState.phase === 'combined' || isHistoryMode) ? 'pointer' : 'default',
          transform: (highlightedStone?.color === color && highlightedStone?.index === i) ? 'scale(1.05)' : 'scale(1)',
          transition: 'all 0.08s cubic-bezier(0.4, 0.0, 0.2, 1)'
        }}
        onClick={() => {
          if (gameState.phase === 'combined' || isHistoryMode) {
            setHighlightedStone(prev =>
              prev?.color === color && prev?.index === i ? null : { color, index: i }
            );
          }
        }}
        onMouseEnter={() => {
          if (gameState.phase === 'combined' || isHistoryMode) {
            setHoveredStone({ color, index: i });
          }
        }}
        onMouseLeave={() => {
          if (gameState.phase === 'combined' || isHistoryMode) {
            setHoveredStone(null);
          }
        }}
      >
        <div
          className="rounded-full"
          style={{
            width: stonePixelSize * 0.5,
            height: stonePixelSize * 0.25,
            backgroundColor: color === 'red' ? '#ffcccc' : '#ffeb99'
          }}
        />
      </div>
    ));
  };

  return (
    <div className="flex flex-col items-center w-full max-w-md mx-auto h-[100dvh] overflow-hidden">
      {/* Main Game Area - Flex grow to take available space */}
      <div ref={containerRef} className="flex-grow w-full relative overflow-y-auto flex flex-col items-center justify-end min-h-0">
        {/* Decorative background track extending to top */}
        <div
          className="absolute top-0 bottom-0 border-x-4 border-blue-900"
          style={{
            width: sheetDimensions.width,
            backgroundColor: COLOR_ICE,
            zIndex: 0
          }}
        />

        <div
          className="relative border-x-4 border-blue-900 bg-white shadow-2xl z-10"
          style={{
            width: sheetDimensions.width,
            height: sheetDimensions.height,
            // No margin auto here, we want it to start from top if scrolling
          }}
        >
          <div ref={sheetRef} className="absolute inset-0">
            <CurlingSheet
              width="100%"
              round={isHistoryMode && gameState.history[selectedHistoryRound] ? gameState.history[selectedHistoryRound].round : gameState.current_round}
              phase={isHistoryMode ? 'combined' : gameState.phase}
            />
          </div>

          {/* Render placed stones */}
          {/* My local stones (during placement, ONLY if not in history mode) */}
          {!isHistoryMode && !isReady && gameState.phase === 'placement' && myStones.map(stone => (
            stone.placed && (
              <DraggableStone
                key={`my-${stone.index}-${stone.x}-${stone.y}`}
                color={myColor}
                index={stone.index}
                position={{
                  x: stone.x * scale,
                  y: stone.y * scale
                }}
                onDragEnd={handleStoneDragEnd}
                isPlaced={true}
                size={stonePixelSize}
                customColor={gameState.team_colors ? gameState.team_colors[myColor] : undefined}
              />
            )
          ))}

          {/* Render Red and Yellow stones (Live or History) */}
          {renderStones(displayRedStones, 'red')}
          {renderStones(displayYellowStones, 'yellow')}

          {/* Measurement lines in combined phase or history mode */}
          {(gameState.phase === 'combined' || isHistoryMode) && (
            <StoneMeasurements
              stones={{
                red: displayRedStones,
                yellow: displayYellowStones
              }}
              scale={scale}
              highlightedStone={highlightedStone || hoveredStone}
              showMeasurements={showMeasurements}
            />
          )}
        </div>
      </div>

      {/* Controls Area - Fixed at bottom */}
      <div className="w-full card-gradient backdrop-blur-md p-4 shrink-0 z-20 shadow-[0_-8px_32px_rgba(0,0,0,0.12)] border-t border-gray-100/20">
        <div className="flex gap-2 min-h-[64px]">
          {/* Persistent Menu Button */}
          <div className="relative shrink-0 flex items-center">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="w-12 h-12 rounded-full bg-[var(--bauhaus-yellow)] text-black flex items-center justify-center hover:scale-105 hover:shadow-lg shadow-md transition-all active:scale-95"
              aria-label="Menu"
            >
              <Menu size={24} />
            </button>

            {showMenu && (
              <div className="absolute bottom-16 left-0 bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-gray-100 p-2 min-w-[220px] z-50 animate-in fade-in slide-in-from-bottom-2">
                {onShare && (
                  <button
                    onClick={() => {
                      onShare();
                      setShowMenu(false);
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-gray-100 rounded flex items-center gap-2"
                  >
                    <Share2 size={16} />
                    Share
                  </button>
                )}
                <button
                  onClick={() => {
                    if (gameState.history && gameState.history.length > 0) {
                      setSelectedHistoryRound(0); // Start at most recent round
                    } else {
                      alert("No history available yet.");
                    }
                    setShowMenu(false);
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-gray-100 rounded flex items-center gap-2"
                >
                  <HistoryIcon size={16} />
                  History
                </button>
                <button
                  onClick={() => {
                    setShowHelp(true);
                    setShowMenu(false);
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-gray-100 rounded flex items-center gap-2"
                >
                  <Info size={16} />
                  Help
                </button>
                <div className="h-px bg-gray-200 my-1" />
                <button
                  onClick={() => window.location.href = '/'}
                  className="w-full text-left px-4 py-2 hover:bg-red-50 text-red-600 rounded flex items-center gap-2"
                >
                  <LogOut size={16} />
                  Exit Game
                </button>
              </div>
            )}
          </div>

          {/* Contextual Controls */}
          <div className="flex-grow flex items-center justify-center">
            {/* Placement Phase - Active */}
            {gameState.phase === 'placement' && !isReady && !isHistoryMode && (
              <div className="w-full flex items-center gap-2">
                {!allStonesPlaced ? (
                  <div className="flex-grow">
                    {myColor && (
                      <StoneSelectionBar
                        stones={myStones}
                        color={myColor}
                        onStoneDragEnd={handleStoneDragEnd}
                        stoneSize={stonePixelSize}
                        customColor={gameState.team_colors ? gameState.team_colors[myColor] : undefined}
                      />
                    )}
                  </div>
                ) : (
                  <button
                    onClick={handleConfirmPlacement}
                    className="flex-grow h-12 font-bold rounded-2xl shadow-md hover:shadow-lg transition-all active:scale-95 bg-[var(--bauhaus-blue)] hover:bg-blue-700 text-white"
                  >
                    finish placement
                  </button>
                )}
              </div>
            )}

            {/* Placement Phase - Waiting */}
            {isReady && gameState.phase === 'placement' && (
              <div className="w-full p-4 bg-[var(--bauhaus-yellow)]/20 text-[var(--bauhaus-yellow)] font-bold rounded-2xl text-center animate-pulse border border-[var(--bauhaus-yellow)]/30 lowercase tracking-tight">
                waiting for opponent...
              </div>
            )}

            {/* Combined/Playing Phase */}
            {gameState.phase === 'combined' && (
              <div className="w-full flex gap-2">
                <button
                  onClick={() => setShowMeasurements(!showMeasurements)}
                  className={`relative w-12 h-12 font-bold rounded-2xl shadow-md transition-all flex items-center justify-center text-white hover:shadow-lg active:scale-95 group ${showMeasurements ? 'bg-[var(--bauhaus-blue)]' : 'bg-gray-400'
                    }`}
                  aria-label="Toggle measurements"
                >
                  <Ruler size={20} />
                  {/* Tooltip */}
                  <div className="absolute bottom-full mb-2 hidden group-hover:block">
                    <div className="bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                      {showMeasurements ? 'Hide measurements' : 'Show measurements'}
                    </div>
                  </div>
                </button>
                <button
                  onClick={handleNextRound}
                  className="flex-grow h-12 font-bold rounded-2xl shadow-md transition-all active:scale-95 hover:shadow-lg bg-[var(--bauhaus-red)] hover:bg-red-600 text-white lowercase tracking-tight"
                >
                  start new round
                </button>
              </div>
            )}

            {/* History Controls */}
            {isHistoryMode && (
              <div className="w-full flex items-center gap-2">
                <button
                  onClick={() => setSelectedHistoryRound(Math.min(gameState.history.length - 1, selectedHistoryRound! + 1))}
                  disabled={selectedHistoryRound === gameState.history.length - 1}
                  className="w-12 py-3 font-bold rounded-2xl shadow-sm transition-all bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-black hover:shadow-md active:scale-95"
                  aria-label="Earlier Round"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>

                <button
                  onClick={() => setSelectedHistoryRound(null)}
                  className="flex-grow py-3 font-bold rounded-2xl shadow-md transition-all bg-[var(--bauhaus-blue)] hover:bg-blue-700 text-white flex flex-col items-center justify-center leading-tight hover:shadow-lg active:scale-95 lowercase tracking-tight"
                >
                  <span>return to game</span>
                  <span className="text-xs font-normal opacity-90">viewing round {gameState.history[selectedHistoryRound!].round}</span>
                </button>

                <button
                  onClick={() => setSelectedHistoryRound(Math.max(0, selectedHistoryRound! - 1))}
                  disabled={selectedHistoryRound === 0}
                  className="w-12 py-3 font-bold rounded-2xl shadow-sm transition-all bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-black hover:shadow-md active:scale-95"
                  aria-label="Later Round"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Help Dialog */}
      {
        showHelp && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6 relative animate-in fade-in zoom-in duration-200">
              <button
                onClick={() => setShowHelp(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              <h2 className="text-xl font-bold mb-4 text-gray-800 lowercase tracking-tight">how to play</h2>

              <div className="space-y-3 text-gray-600">
                <p>
                  <strong className="text-gray-800">1. Place Stones:</strong> Drag your stones from the bottom bar onto the sheet.
                </p>
                <p>
                  <strong className="text-gray-800">2. Strategize:</strong> Place stones to guard the house or set up future shots.
                </p>
                <p>
                  <strong className="text-gray-800">3. Confirm:</strong> Once all stones are placed, tap "Finish Placement" to lock them in.
                </p>
              </div>

              <button
                onClick={() => setShowHelp(false)}
                className="w-full mt-6 py-2 font-semibold rounded-lg transition-colors"
                style={{ backgroundColor: '#2563eb', color: 'white' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1d4ed8'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
              >
                Got it
              </button>
            </div>
          </div>
        )
      }
    </div>
  );
};

export default CurlingGame;
