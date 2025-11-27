
import { useState, useEffect, useRef } from 'react';
import CurlingSheet from './curling-sheet';
import { Dialog } from './ui/Dialog';
import { Button } from './ui/Button';
import DraggableStone from './draggable-stone';
import StoneSelectionBar from './stone-selection-bar';
import StoneMeasurements from './stone-measurements';
import { Channel } from 'phoenix';
import {
  SHEET_WIDTH,
  STONE_RADIUS,
  VIEW_TOP_OFFSET,
  VIEW_BOTTOM_OFFSET,
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


import { Menu, History as HistoryIcon, Info, LogOut, Share2, Ruler, X } from 'lucide-react';

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

  // Lock body scroll to prevent "double scroll" on mobile
  useEffect(() => {
    // Only apply on mobile/when fixed
    if (window.innerWidth < 768) {
      document.body.style.overflow = 'hidden';
      document.body.style.overscrollBehavior = 'none';
    }
    return () => {
      document.body.style.overflow = '';
      document.body.style.overscrollBehavior = '';
    };
  }, []);

  // Update scale and dimensions when container resizes
  useEffect(() => {
    if (!containerRef.current) return;

    const updateDimensions = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.offsetWidth;
        const containerHeight = containerRef.current.offsetHeight;

        // If container has no size yet, skip
        if (containerWidth === 0 || containerHeight === 0) return;

        // Calculate available space
        const availableWidth = containerWidth;
        const availableHeight = containerHeight;

        // Calculate scale factors for both dimensions
        const scaleWidth = availableWidth / SHEET_WIDTH;
        const scaleHeight = availableHeight / (VIEW_TOP_OFFSET + VIEW_BOTTOM_OFFSET);

        // Use the smaller scale to ensure it fits completely
        // But don't scale UP too much if we have tons of space (optional, but good for desktop)
        // For mobile, we want to maximize usage.
        const newScale = Math.min(scaleWidth, scaleHeight);

        setSheetDimensions({
          width: SHEET_WIDTH * newScale,
          height: (VIEW_TOP_OFFSET + VIEW_BOTTOM_OFFSET) * newScale
        });
        setScale(newScale);
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

      // MaxY: Allow stone to touch back line with its edge.
      // Stone center can be at backLineY + STONE_RADIUS (bottom edge touches line).
      const maxY = backLineY + STONE_RADIUS;

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

  const handleSheetClick = (e: React.MouseEvent) => {
    if (!sheetRef.current || isReady || gameState.phase !== 'placement' || isHistoryMode) return;

    // Find first unplaced stone
    const stoneToPlace = myStones.find(s => !s.placed);
    if (!stoneToPlace) return;

    const sheetRect = sheetRef.current.getBoundingClientRect();
    const clickX = e.clientX - sheetRect.left;
    const clickY = e.clientY - sheetRect.top;

    // Convert to logical coordinates
    const rawX = clickX / scale;
    const rawY = clickY / scale;

    // Clamp to sheet boundaries
    const hogLineY = VIEW_TOP_OFFSET - HOG_LINE_OFFSET;
    const backLineY = VIEW_TOP_OFFSET + BACK_LINE_OFFSET;
    const minY = hogLineY + STONE_RADIUS;
    const maxY = backLineY + STONE_RADIUS;

    const clampedX = Math.max(STONE_RADIUS, Math.min(SHEET_WIDTH - STONE_RADIUS, rawX));
    const clampedY = Math.max(minY, Math.min(maxY, rawY));

    // Resolve collisions
    const { x: resolvedX, y: resolvedY } = resolveCollisions(stoneToPlace.index, clampedX, clampedY, myStones);

    updateStonePosition(stoneToPlace.index, resolvedX, resolvedY, true);
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
    // Calculate a darker shade for handle and inner border
    const getBorderColor = (hexColor: string) => {
      const r = parseInt(hexColor.slice(1, 3), 16);
      const g = parseInt(hexColor.slice(3, 5), 16);
      const b = parseInt(hexColor.slice(5, 7), 16);
      const darkerR = Math.floor(r * 0.7);
      const darkerG = Math.floor(g * 0.7);
      const darkerB = Math.floor(b * 0.7);
      return `#${darkerR.toString(16).padStart(2, '0')}${darkerG.toString(16).padStart(2, '0')}${darkerB.toString(16).padStart(2, '0')}`;
    };

    return stones.map((pos: any, i: number) => {
      const stoneColor = gameState.team_colors ? gameState.team_colors[color] : (color === 'red' ? '#cc0000' : '#e6b800');
      const darkerShade = getBorderColor(stoneColor);

      return (
        <div
          key={`${color}-${i}`}
          className={`absolute rounded-full shadow-md animate-glow transition-all duration-200 hover:brightness-110 ${(highlightedStone?.color === color && highlightedStone?.index === i) ? 'scale-105 ring-2 ring-white/50' : ''
            } ${(gameState.phase === 'combined' || isHistoryMode) ? 'cursor-pointer' : 'cursor-default'
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
          }}
          onClick={(e) => {
            e.stopPropagation(); // Prevent sheet click
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
          {/* Small handle */}
          <div
            style={{
              width: stonePixelSize * 2 / 5,
              height: stonePixelSize / 7,
              backgroundColor: darkerShade,
              borderRadius: stonePixelSize / 12,
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
            }}
          />
        </div>
      );
    });
  };

  return (
    <div className="fixed inset-0 h-[100dvh] md:relative md:inset-auto md:h-auto flex flex-col items-center w-full max-w-md mx-auto md:aspect-[9/16] md:min-h-[1000px] md:rounded-3xl md:shadow-2xl bg-[var(--icy-white)] backdrop-blur-md transition-all duration-300 overflow-hidden">
      {/* Full-height Sidelines (Mobile Only) */}
      <div
        className="absolute inset-y-0 border-x border-gray-200 md:border-none pointer-events-none z-0 left-1/2 -translate-x-1/2"
        style={{ width: sheetDimensions.width }}
      />

      {/* Main Game Area - Flex grow to take available space */}
      <div ref={containerRef} className="flex-grow w-full relative flex flex-col items-center justify-end min-h-0">

        <div
          className="relative z-10 border-x border-gray-200 md:border-none"
          style={{
            width: sheetDimensions.width,
            height: sheetDimensions.height,
            // No margin auto here, we want it to start from top if scrolling
          }}
        >
          <div ref={sheetRef} className="absolute inset-0" onClick={handleSheetClick}>
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
                key={`my - ${stone.index} -${stone.x} -${stone.y} `}
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
                onClick={(e) => e.stopPropagation()}
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

      {/* Controls Area - Floating Card */}
      <div className="w-full px-3">
        <div className="w-full max-w-md card-gradient backdrop-blur-md p-4 shrink-0 relative z-20 shadow-2xl border border-white/20 my-4 rounded-3xl mb-6">
          <div className="flex gap-2 min-h-[64px]">
            {/* Persistent Menu Button */}
            <div className="relative shrink-0 flex items-center">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="w-12 h-12 rounded-full bg-[var(--icy-button-bg)] text-[var(--icy-button-text)] flex items-center justify-center hover:scale-105 hover:shadow-lg shadow-md transition-all active:scale-95"
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
                    <Button
                      onClick={handleConfirmPlacement}
                      className="flex-grow h-12 text-base"
                    >
                      finish placement
                    </Button>
                  )}
                </div>
              )}

              {/* Placement Phase - Waiting */}
              {isReady && gameState.phase === 'placement' && (
                <div className="w-full p-4 bg-[var(--icy-blue-light)]/20 text-[var(--icy-blue-dark)] font-bold rounded-2xl text-center animate-pulse border border-[var(--icy-blue-light)]/30 lowercase tracking-tight">
                  waiting for opponent...
                </div>
              )}

              {gameState.phase === 'combined' && !isHistoryMode && (
                <div className="w-full flex gap-2">
                  <Button
                    onClick={() => setShowMeasurements(!showMeasurements)}
                    className={`w-12 h-12 rounded-2xl p-0 relative group ${showMeasurements ? '' : 'bg-gray-400 hover:bg-gray-500 text-white shadow-none'}`}
                    aria-label="Toggle measurements"
                  >
                    <Ruler size={20} />
                    {/* Tooltip */}
                    <div className="absolute bottom-full mb-2 hidden group-hover:block">
                      <div className="bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                        {showMeasurements ? 'Hide measurements' : 'Show measurements'}
                      </div>
                    </div>
                  </Button>
                  <Button
                    onClick={handleNextRound}
                    variant="destructive"
                    className="flex-grow h-12 text-base"
                  >
                    start new round
                  </Button>
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
                    className="flex-grow py-3 font-bold rounded-2xl shadow-md transition-all bg-[var(--icy-button-bg)] hover:brightness-110 text-[var(--icy-button-text)] flex items-center justify-center gap-2 leading-tight hover:shadow-lg active:scale-95 lowercase tracking-tight"
                  >
                    <X size={20} />
                    <span>exit history</span>
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
      </div>

      {/* Help Dialog */}
      <Dialog
        isOpen={showHelp}
        onClose={() => setShowHelp(false)}
        title="how to play"
      >
        <p>
          <strong className="text-gray-900">1. Place Stones:</strong> Click where you want to place your stone or drag your stones from the bottom bar onto the sheet.
        </p>
        <p>
          <strong className="text-gray-900">2. Confirm:</strong> Once all stones are placed, tap "Finish Placement" to lock them in.
        </p>
      </Dialog>
    </div>
  );
};

export default CurlingGame;
