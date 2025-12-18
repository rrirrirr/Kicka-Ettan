import { useState, useRef, useCallback, useEffect } from 'react';
import { Settings, Info, Play, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './ui';
import { GameType } from '../data/gameTypes';
import { cn } from '../lib/utils';

interface GameTypeCarouselProps {
    gameTypes: GameType[];
    onCreateGame: (gameType: GameType) => void;
    onOpenSettings: (gameType: GameType) => void;
    onOpenInfo: (gameType: GameType) => void;
    isLoading: string | null;
    getTeamColors: (gameTypeId: string) => { team1: string; team2: string };
    onOpenColorPicker: (gameTypeId: string, team: 'team1' | 'team2') => void;
}

// Different colors for each card
const CARD_COLORS = [
    'linear-gradient(135deg, #e9d5ff 0%, #fecaca 100%)', // lavender → red
    'linear-gradient(135deg, #a5f3fc 0%, #c4b5fd 100%)', // cyan → purple
    'linear-gradient(135deg, #fef3c7 0%, #fda4af 100%)', // amber → pink
    'linear-gradient(135deg, #bbf7d0 0%, #93c5fd 100%)', // green → blue
    'linear-gradient(135deg, #fecdd3 0%, #c7d2fe 100%)', // pink → indigo
];

const THRESHOLD = 80;

export const GameTypeCarousel: React.FC<GameTypeCarouselProps> = ({
    gameTypes,
    onCreateGame,
    onOpenSettings,
    onOpenInfo,
    isLoading,
    getTeamColors,
    onOpenColorPicker,
}) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [dragX, setDragX] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const [isAnimating, setIsAnimating] = useState(false);
    const [swipingCard, setSwipingCard] = useState<number | null>(null);
    const [pastThreshold, setPastThreshold] = useState(false);
    const [hasMounted, setHasMounted] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            setHasMounted(true);
        }, 500);
        return () => clearTimeout(timer);
    }, []);

    const startX = useRef(0);
    const containerRef = useRef<HTMLDivElement>(null);

    const cardCount = gameTypes.length;

    const handleDragStart = useCallback((clientX: number) => {
        if (isAnimating) return;
        setIsDragging(true);
        startX.current = clientX;
    }, [isAnimating]);

    const handleDragMove = useCallback((clientX: number) => {
        if (!isDragging || isAnimating) return;
        const diff = clientX - startX.current;
        setDragX(diff);
        setPastThreshold(Math.abs(diff) > THRESHOLD);
    }, [isDragging, isAnimating]);

    const rotateCarousel = useCallback((direction: number) => {
        setIsAnimating(true);
        setCurrentIndex((prev) => (prev + direction + cardCount) % cardCount);
        setTimeout(() => {
            setIsAnimating(false);
            setSwipingCard(null);
        }, 400);
    }, [cardCount]);

    const handleDragEnd = useCallback(() => {
        if (!isDragging || isAnimating) return;
        setIsDragging(false);
        setPastThreshold(false);

        if (dragX > THRESHOLD) {
            setSwipingCard(currentIndex);
            rotateCarousel(-1);
        } else if (dragX < -THRESHOLD) {
            setSwipingCard(currentIndex);
            rotateCarousel(1);
        }
        setDragX(0);
    }, [isDragging, isAnimating, dragX, currentIndex, rotateCarousel]);

    // Pointer events (unified mouse + touch)
    const handlePointerDown = useCallback((e: React.PointerEvent) => {
        // Don't start drag if clicking on interactive element
        if ((e.target as HTMLElement).closest('button, input')) return;
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        handleDragStart(e.clientX);
    }, [handleDragStart]);

    const handlePointerMove = useCallback((e: React.PointerEvent) => {
        handleDragMove(e.clientX);
    }, [handleDragMove]);

    const handlePointerUp = useCallback(() => {
        handleDragEnd();
    }, [handleDragEnd]);

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (isAnimating) return;
            if (e.key === 'ArrowLeft') {
                rotateCarousel(-1);
            } else if (e.key === 'ArrowRight') {
                rotateCarousel(1);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isAnimating, rotateCarousel]);

    const getCardStyle = useCallback((index: number) => {
        let relativePos = index - currentIndex;
        if (relativePos > cardCount / 2) relativePos -= cardCount;
        if (relativePos < -cardCount / 2) relativePos += cardCount;

        const isTop = relativePos === 0;
        const isSwipingAway = swipingCard === index && isAnimating;

        const dragDirection = dragX > 0 ? -1 : 1;
        const nextCardIndex = (currentIndex + dragDirection + cardCount) % cardCount;
        const isNextCard = index === nextCardIndex;

        const dragProgress = Math.min(Math.abs(dragX) / 150, 1);
        const isPastThreshold = pastThreshold && isDragging;

        // Z-index management
        let zIndex = cardCount - Math.abs(relativePos);

        // As soon as dragging starts, bring the "next" card to second-highest z-level
        if (isDragging && isNextCard) {
            zIndex = cardCount; // Second highest (top card will get +1 or stay on top)
        }
        if (isTop) {
            zIndex = cardCount + 1; // Always on top while dragging
        }
        // After threshold, swap: next card becomes highest, current drops
        if (isPastThreshold) {
            if (isTop) {
                zIndex = cardCount - 1;
            }
            if (isNextCard) {
                zIndex = cardCount + 1;
            }
        }

        // Rotation - cards fan out
        let rotation = relativePos * 12;
        if (isNextCard && isDragging) {
            rotation = rotation * (1 - dragProgress);
        }

        // Position offsets
        let translateX = relativePos * 15;
        let translateY = Math.abs(relativePos) * 8;
        if (isNextCard && isDragging) {
            translateX = translateX * (1 - dragProgress);
            translateY = translateY * (1 - dragProgress);
        }

        // Scale
        let baseScale = 1 - Math.abs(relativePos) * 0.08;
        if (isTop && isDragging) {
            const targetScale = isPastThreshold ? 0.92 : 1 - dragProgress * 0.08;
            baseScale = targetScale;
        }
        if (isNextCard && isDragging) {
            baseScale = baseScale + (1 - baseScale) * dragProgress;
        }
        const scale = isSwipingAway ? baseScale - 0.05 : baseScale;

        // Initial "Deal" Animation State
        if (!hasMounted) {
            return {
                transform: `translateX(0px) translateY(0px) rotate(0deg) scale(${baseScale})`,
                zIndex,
                opacity: Math.abs(relativePos) > 3 ? 0 : 1,
            };
        }

        return {
            transform: `translateX(${translateX}px) translateY(${translateY}px) rotate(${rotation}deg) scale(${scale})`,
            zIndex,
            opacity: Math.abs(relativePos) > 3 ? 0 : 1,
        };
    }, [currentIndex, cardCount, dragX, isDragging, pastThreshold, swipingCard, isAnimating, hasMounted]);

    if (gameTypes.length === 0) return null;

    return (
        <div className="relative w-full z-20">
            {/* Card Stack */}
            <div
                ref={containerRef}
                className="relative w-full h-[420px] mx-auto cursor-grab active:cursor-grabbing select-none flex items-center justify-center"
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                style={{ touchAction: 'pan-y' }}
            >
                {gameTypes.map((gameType, index) => {
                    const style = getCardStyle(index);
                    const isTop = index === currentIndex;
                    const isComingSoon = gameType.visibility === 'coming_soon';
                    const colors = getTeamColors(gameType.id);
                    const colorIndex = index % CARD_COLORS.length;

                    return (
                        <div
                            key={gameType.id}
                            className={cn(
                                "absolute w-[calc(100%-2rem)] max-w-[340px] h-[400px]",
                                "rounded-3xl border border-white/50 shadow-xl overflow-hidden",
                                isAnimating
                                    ? "transition-all duration-400 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
                                    : isDragging
                                        ? "transition-none"
                                        : "transition-all duration-300 ease-out",
                                isComingSoon && "opacity-60"
                            )}
                            style={{
                                ...style,
                                transform: isTop && isDragging
                                    ? `translateX(${dragX}px) translateY(${style.transform.match(/translateY\(([^)]+)\)/)?.[1] || '0px'}) rotate(${dragX * 0.08}deg) scale(${style.transform.match(/scale\(([^)]+)\)/)?.[1] || '1'})`
                                    : style.transform,
                                background: CARD_COLORS[colorIndex],
                            }}
                        >
                            {/* Card Content */}
                            <div className="relative z-10 p-6 flex flex-col h-full overflow-hidden">
                                {/* Top Row - Game Type label and buttons */}
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                                        game type
                                    </span>
                                    {!isComingSoon && (
                                        <div className="flex gap-2">
                                            <Button
                                                variant="outline"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onOpenSettings(gameType);
                                                }}
                                                className="bg-white/80 hover:bg-white !p-2 h-9 w-9 !rounded-xl flex items-center justify-center border border-white/50 shadow-sm"
                                                title="Game Settings"
                                            >
                                                <Settings size={16} className="text-gray-600" />
                                            </Button>
                                            <Button
                                                variant="outline"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onOpenInfo(gameType);
                                                }}
                                                className="bg-white/80 hover:bg-white !p-2 h-9 w-9 !rounded-xl flex items-center justify-center border border-white/50 shadow-sm"
                                                title="Game Info"
                                            >
                                                <Info size={16} className="text-gray-600" />
                                            </Button>
                                        </div>
                                    )}
                                </div>

                                {/* Game Title */}
                                <div className="mb-4 text-left">
                                    <h2 className="text-2xl font-black text-gray-900 lowercase tracking-tighter leading-tight">
                                        {gameType.name}
                                    </h2>
                                    <p className="text-sm text-gray-600 mt-1">
                                        {gameType.shortDescription}
                                    </p>
                                    {isComingSoon && (
                                        <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full font-medium mt-2 inline-block">
                                            Coming Soon
                                        </span>
                                    )}
                                </div>

                                {/* Game Specifics */}
                                {!isComingSoon && (
                                    <div className="flex flex-wrap gap-2 mb-4">
                                        {gameType.defaultSettings?.stones_per_team && (
                                            <span className="text-xs font-semibold text-gray-600 bg-white/50 px-2 py-1 rounded-full lowercase">
                                                {gameType.defaultSettings.stones_per_team} stones/team
                                            </span>
                                        )}
                                        {gameType.defaultSettings?.ban_circle_radius && (
                                            <span className="text-xs font-semibold text-gray-600 bg-white/50 px-2 py-1 rounded-full lowercase">
                                                ban: {gameType.settingsSchema?.ban_circle_radius?.valueLabels?.[gameType.defaultSettings.ban_circle_radius as number] || gameType.defaultSettings.ban_circle_radius}
                                            </span>
                                        )}
                                    </div>
                                )}

                                {/* Team Colors - matching lobby style */}
                                {!isComingSoon && (
                                    <div className="flex-grow flex items-center justify-center">
                                        <div className="flex gap-8">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onOpenColorPicker(gameType.id, 'team1');
                                                }}
                                                className="flex flex-col items-center gap-2 group"
                                            >
                                                <div
                                                    className="w-10 h-10 rounded-full border-2 border-gray-800 shadow-md group-hover:scale-110 transition-transform"
                                                    style={{ backgroundColor: colors.team1 }}
                                                />
                                                <span className="text-xs font-bold text-gray-700 lowercase">team 1</span>
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onOpenColorPicker(gameType.id, 'team2');
                                                }}
                                                className="flex flex-col items-center gap-2 group"
                                            >
                                                <div
                                                    className="w-10 h-10 rounded-full border-2 border-gray-800 shadow-md group-hover:scale-110 transition-transform"
                                                    style={{ backgroundColor: colors.team2 }}
                                                />
                                                <span className="text-xs font-bold text-gray-700 lowercase">team 2</span>
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Start Button */}
                                {!isComingSoon && (
                                    <Button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onCreateGame(gameType);
                                        }}
                                        isLoading={isLoading === gameType.id}
                                        shape="pill"
                                        size="xl"
                                        className="w-full bg-icy-accent hover:bg-icy-accent-hover text-white shadow-none animate-glow text-lg py-4 mt-4 flex-shrink-0"
                                    >
                                        <Play size={20} fill="currentColor" />
                                        create game
                                    </Button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Swipe hint */}
            <p className="text-sm text-gray-500/70 text-center mt-3 mb-2">
                ← swipe left for next • swipe right for previous →
            </p>

            {/* Navigation */}
            <div className="flex justify-center items-center gap-3">
                <Button
                    variant="ghost"
                    onClick={() => rotateCarousel(-1)}
                    disabled={isAnimating}
                    className="rounded-full px-3 py-2"
                >
                    <ChevronLeft size={20} />
                </Button>

                {/* Indicators */}
                <div className="flex items-center gap-2">
                    {gameTypes.map((_, index) => (
                        <button
                            key={index}
                            onClick={() => {
                                if (!isAnimating) {
                                    const diff = index - currentIndex;
                                    if (diff !== 0) {
                                        setCurrentIndex(index);
                                        setIsAnimating(true);
                                        setTimeout(() => setIsAnimating(false), 400);
                                    }
                                }
                            }}
                            className={cn(
                                "h-2 rounded-full transition-all duration-200",
                                currentIndex === index
                                    ? "bg-icy-accent w-6"
                                    : "bg-gray-300 hover:bg-gray-400 w-2"
                            )}
                        />
                    ))}
                </div>

                <Button
                    variant="ghost"
                    onClick={() => rotateCarousel(1)}
                    disabled={isAnimating}
                    className="rounded-full px-3 py-2"
                >
                    <ChevronRight size={20} />
                </Button>
            </div>
        </div>
    );
};

export default GameTypeCarousel;
