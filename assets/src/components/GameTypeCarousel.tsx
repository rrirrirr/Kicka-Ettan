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
    getGameSettings: (gameTypeId: string) => Record<string, number | boolean | string>;
    getTeamColors: (gameTypeId: string) => { team1: string; team2: string };
    onOpenColorPicker: (gameTypeId: string, team: 'team1' | 'team2') => void;
    updateGameSetting: (gameTypeId: string, key: string, value: number | boolean | string) => void;
    onOpenBanInfo: () => void;
    onOpenStonesInfo: () => void;
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
    getGameSettings,
    getTeamColors,
    onOpenColorPicker,
    updateGameSetting,
    onOpenBanInfo,
    onOpenStonesInfo,
}) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [dragX, setDragX] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const [isAnimating, setIsAnimating] = useState(false);
    const [swipingCard, setSwipingCard] = useState<number | null>(null);
    const [pastThreshold, setPastThreshold] = useState(false);
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

        return {
            transform: `translateX(${translateX}px) translateY(${translateY}px) rotate(${rotation}deg) scale(${scale})`,
            zIndex,
            opacity: Math.abs(relativePos) > 3 ? 0 : 1,
        };
    }, [currentIndex, cardCount, dragX, isDragging, pastThreshold, swipingCard, isAnimating]);

    if (gameTypes.length === 0) return null;

    return (
        <div className="relative w-full">
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
                    const gameSettings = getGameSettings(gameType.id);
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
                                {/* Top Right Controls */}
                                {!isComingSoon && (
                                    <div className="absolute top-4 right-4 flex gap-2 z-20">
                                        <Button
                                            variant="outline"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onOpenSettings(gameType);
                                            }}
                                            className="bg-white/80 hover:bg-white !p-2 h-10 w-10 !rounded-xl flex items-center justify-center animate-glow border border-white/50 shadow-sm"
                                            title="Game Settings"
                                        >
                                            <Settings size={18} className="text-gray-500" />
                                        </Button>
                                        <Button
                                            variant="outline"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onOpenInfo(gameType);
                                            }}
                                            className="bg-white/80 hover:bg-white !p-2 h-10 w-10 !rounded-xl flex items-center justify-center animate-glow border border-white/50 shadow-sm"
                                            title="Game Info"
                                        >
                                            <Info size={18} className="text-gray-500" />
                                        </Button>
                                    </div>
                                )}

                                {/* Game Type Header */}
                                <div className="pr-28 mb-4">
                                    <label className="block text-sm font-bold text-gray-500 mb-1 ml-1 lowercase tracking-tight">
                                        game type
                                    </label>
                                    <h2 className="text-2xl font-black text-gray-900 lowercase tracking-tighter leading-tight">
                                        {gameType.name}
                                    </h2>
                                    <p className="text-sm text-gray-600 mt-2">
                                        {gameType.shortDescription}
                                    </p>
                                    {isComingSoon && (
                                        <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full font-medium mt-2 inline-block">
                                            Coming Soon
                                        </span>
                                    )}
                                </div>

                                {/* Settings Content */}
                                {!isComingSoon && (
                                    <div className="flex-grow space-y-4 overflow-y-auto scrollbar-hide">
                                        {Object.entries(gameType.settingsSchema)
                                            .filter(([_, setting]) => setting.important)
                                            .map(([key, setting]) => (
                                                <div key={key}>
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <span className="text-sm font-bold text-gray-700 lowercase tracking-tight">
                                                            {setting.label.toLowerCase()}
                                                        </span>
                                                        {key === 'ban_circle_radius' && (
                                                            <Button
                                                                variant="outline"
                                                                shape="circle"
                                                                size="sm"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    onOpenBanInfo();
                                                                }}
                                                                className="!w-5 !h-5 !bg-white/90 hover:!bg-gray-100 !shadow flex-shrink-0 !p-0 !border-gray-200/50"
                                                            >
                                                                <Info size={14} className="text-gray-700" />
                                                            </Button>
                                                        )}
                                                        {key === 'stones_per_team' && (
                                                            <Button
                                                                variant="outline"
                                                                shape="circle"
                                                                size="sm"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    onOpenStonesInfo();
                                                                }}
                                                                className="!w-5 !h-5 !bg-white/90 hover:!bg-gray-100 !shadow flex-shrink-0 !p-0 !border-gray-200/50"
                                                            >
                                                                <Info size={14} className="text-gray-700" />
                                                            </Button>
                                                        )}
                                                    </div>

                                                    {setting.type === 'integer' && (
                                                        <div className="flex items-center gap-3 bg-white/50 p-3 rounded-xl">
                                                            <input
                                                                type="range"
                                                                min={setting.min ?? 1}
                                                                max={setting.max || 10}
                                                                value={gameSettings[key] as number}
                                                                onChange={(e) => {
                                                                    updateGameSetting(gameType.id, key, parseInt(e.target.value));
                                                                }}
                                                                onPointerDown={(e) => e.stopPropagation()}
                                                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-icy-button-bg"
                                                            />
                                                            <span className="font-bold text-xl text-icy-button-bg min-w-[2rem] text-center">
                                                                {setting.valueLabels && setting.valueLabels[gameSettings[key] as number]
                                                                    ? setting.valueLabels[gameSettings[key] as number]
                                                                    : gameSettings[key] as number}
                                                            </span>
                                                        </div>
                                                    )}

                                                    {setting.type === 'select' && setting.options && (
                                                        <div className="flex gap-2">
                                                            {setting.options.map((option) => {
                                                                const isActive = gameSettings[key] === option;
                                                                return (
                                                                    <Button
                                                                        key={option}
                                                                        variant="outline"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            updateGameSetting(gameType.id, key, option);
                                                                        }}
                                                                        className={cn(
                                                                            "flex-1 h-10",
                                                                            isActive
                                                                                ? "!bg-active text-white hover:!bg-lavender-600 !border-active"
                                                                                : "bg-white/50 hover:bg-white text-gray-700 border-gray-200"
                                                                        )}
                                                                    >
                                                                        {option}
                                                                    </Button>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}

                                        {/* Team Colors */}
                                        <div>
                                            <span className="text-sm font-bold text-gray-700 lowercase tracking-tight block mb-2">
                                                team colors
                                            </span>
                                            <div className="flex gap-3">
                                                <Button
                                                    variant="outline"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onOpenColorPicker(gameType.id, 'team1');
                                                    }}
                                                    className="flex-1 bg-white/50 hover:bg-white !p-3 h-auto !rounded-xl flex items-center justify-center gap-2 border-0"
                                                >
                                                    <div
                                                        className="w-8 h-8 rounded-full shadow-sm border border-black/5"
                                                        style={{ backgroundColor: colors.team1 }}
                                                    />
                                                    <span className="font-bold text-gray-700 lowercase text-sm">team 1</span>
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onOpenColorPicker(gameType.id, 'team2');
                                                    }}
                                                    className="flex-1 bg-white/50 hover:bg-white !p-3 h-auto !rounded-xl flex items-center justify-center gap-2 border-0"
                                                >
                                                    <div
                                                        className="w-8 h-8 rounded-full shadow-sm border border-black/5"
                                                        style={{ backgroundColor: colors.team2 }}
                                                    />
                                                    <span className="font-bold text-gray-700 lowercase text-sm">team 2</span>
                                                </Button>
                                            </div>
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
