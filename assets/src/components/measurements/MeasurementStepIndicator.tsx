import React, { useState, useEffect } from 'react';
import { Shield, Target, ArrowLeftRight } from 'lucide-react';
import { MeasurementType } from '../../contexts/SettingsContext';
import { StonePosition } from '../../types/game-types';
import { VIEW_TOP_OFFSET } from '../../utils/constants';

interface MeasurementStepIndicatorProps {
    highlightedStone: {
        color: "red" | "yellow";
        index: number;
        activeTypes?: MeasurementType[];
        stepIndex?: number;
    };
    settings: any; // Using any to match existing usage, ideally should be typed
    scale: number;
    sheetWidth: number;
    nearHouseThreshold: number;
    hogLineOffset: number;
    houseRadius12: number;
    stoneRadius: number;
    stones: { red: StonePosition[]; yellow: StonePosition[] };
    onToggleMeasurementType?: (type: MeasurementType) => void;
}

export const MeasurementStepIndicator: React.FC<MeasurementStepIndicatorProps> = ({
    highlightedStone,
    settings,
    scale,
    sheetWidth,
    nearHouseThreshold,
    hogLineOffset,
    houseRadius12,
    stoneRadius,
    stones,
    onToggleMeasurementType,
}) => {
    // Responsive mobile detection with resize listener
    const [isMobile, setIsMobile] = useState(
        typeof window !== 'undefined' && window.innerWidth < 768
    );

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 768);
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        // Check if user has seen the toast before
        const hasSeenToast = localStorage.getItem('hasSeenMeasurementTooltip');

        if (!hasSeenToast) {
            // Toast logic removed as it was unused/incomplete
            localStorage.setItem('hasSeenMeasurementTooltip', 'true');
        }
    }, []);
    // Determine Zone
    const stoneList = stones[highlightedStone.color];
    const stonePos = stoneList[highlightedStone.index];

    if (!stonePos) return null;

    const centerLineX = sheetWidth / 2;
    const teeLineY = VIEW_TOP_OFFSET;
    const deltaX = stonePos.x - centerLineX;
    const deltaY = stonePos.y - teeLineY;
    const distToCenterPoint = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    const hogLineY = teeLineY - hogLineOffset;

    const isTouchingHouse = distToCenterPoint <= houseRadius12 + stoneRadius;
    const isInNearHouseZone =
        !isTouchingHouse &&
        distToCenterPoint <= houseRadius12 + stoneRadius + nearHouseThreshold &&
        stonePos.y > hogLineY;
    const isInGuardZone =
        !isTouchingHouse && !isInNearHouseZone && stonePos.y > hogLineY;

    let steps: { types: MeasurementType[] }[] = [];
    if (isInGuardZone) {
        steps = settings.guardZone;
    } else if (isInNearHouseZone) {
        steps = settings.nearHouseZone;
    } else {
        steps = settings.houseZone;
    }

    if (steps.length === 0) return null;

    const ALL_MEASUREMENT_TYPES: MeasurementType[] = [
        'guard', 't-line', 'center-line', 'closest-ring', 'stone-to-stone'
    ];

    // Helper to get button content for each measurement type
    const getButtonContent = (type: MeasurementType) => {
        switch (type) {
            case "guard":
                return <Shield size={20} />;
            case "t-line":
                return <span className="text-2xl font-bold">T</span>;
            case "center-line":
                return (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 3v18" />
                    </svg>
                );
            case "closest-ring":
                return <Target size={20} />;
            case "stone-to-stone":
                return <ArrowLeftRight size={20} />;
        }
    };

    // Color class mappings for measurement types
    const colorClassMap: Record<MeasurementType, { active: string; inactive: string }> = {
        'guard': {
            active: "bg-lavender-500 hover:bg-lavender-600 text-white",
            inactive: "bg-white hover:bg-lavender-100 text-icy-black"
        },
        't-line': {
            active: "bg-amber-500 hover:bg-amber-400 text-white",
            inactive: "bg-white hover:bg-amber-100 text-icy-black"
        },
        'center-line': {
            active: "bg-amber-500 hover:bg-amber-400 text-white",
            inactive: "bg-white hover:bg-amber-100 text-icy-black"
        },
        'closest-ring': {
            active: "bg-cyan-500 hover:bg-cyan-600 text-white",
            inactive: "bg-white hover:bg-cyan-100 text-icy-black"
        },
        'stone-to-stone': {
            active: "bg-lime-600 hover:bg-lime-700 text-white",
            inactive: "bg-white hover:bg-lime-100 text-icy-black"
        },
    };

    // Helper to render buttons
    const renderButtons = (typesToRender: MeasurementType[], activeTypes: MeasurementType[]) => {
        return (
            <div className="flex flex-col gap-2">
                {typesToRender.map((type) => {
                    const isActive = activeTypes.includes(type);
                    const colorClasses = colorClassMap[type];

                    return (
                        <button
                            key={type}
                            onClick={(e) => {
                                e.stopPropagation();
                                if (onToggleMeasurementType) {
                                    onToggleMeasurementType(type);
                                }
                            }}
                            className={`flex items-center justify-center w-10 h-10 rounded-full shadow-lg transition-all duration-200 ${isActive ? colorClasses.active : colorClasses.inactive}`}
                            style={{ pointerEvents: 'auto' }}
                        >
                            {getButtonContent(type)}
                        </button>
                    );
                })}
            </div>
        );
    };

    const topOfHouseY = teeLineY - houseRadius12;

    // Check if stone is above the top of house line
    const isAboveHouse = stonePos.y < topOfHouseY;

    // Simple positioning approach:
    // Mobile: 8px from right edge
    // Desktop/Tablet: 20px from right edge (gives it space from edge)
    const rightPosition = isMobile ? '8px' : '20px';

    // When above house, add more offset on desktop (60px vs 10px on mobile) to move it down
    const topOffset = isAboveHouse ? (isMobile ? 10 : 60) : 0;

    const barPosition = isAboveHouse
        ? { position: 'fixed' as const, right: rightPosition, top: `${(topOfHouseY * scale) + topOffset}px`, zIndex: 10001 }
        : { position: 'fixed' as const, right: rightPosition, top: '35%', transform: 'translateY(-50%)', zIndex: 10001 };

    return (
        <>
            <div
                style={barPosition}
                className="card-gradient backdrop-blur-md px-2 py-4 rounded-full shadow-lg border border-white/50 flex items-center justify-center transition-all duration-300"
            >
                {/* Current Step Buttons */}
                {renderButtons(ALL_MEASUREMENT_TYPES, highlightedStone.activeTypes || [])}
            </div>
        </>
    );
};
