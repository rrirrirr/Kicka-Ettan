import React from 'react';
import {
    SHEET_WIDTH,
    HOUSE_RADIUS_12,
    HOUSE_RADIUS_8,
    HOUSE_RADIUS_4,
    BUTTON_RADIUS,
    HOG_LINE_OFFSET,
    BACK_LINE_OFFSET,
    HOG_LINE_WIDTH,
    VIEW_TOP_OFFSET,
    VIEW_BOTTOM_OFFSET,
    COLOR_ICE,
    COLOR_RED,
    COLOR_BLUE,
    COLOR_WHITE,
    COLOR_BLACK
} from '../utils/constants';
import { SheetStyle } from '../contexts/SettingsContext';

interface CurlingSheetProps {
    width?: string | number;
    round?: number;
    phase?: string;
    style?: SheetStyle;
    children?: React.ReactNode;
}

const CurlingSheet: React.FC<CurlingSheetProps> = ({ width = '100%', round, phase, style, children }) => {
    // Use style colors if provided, otherwise fall back to constants
    const colors = style ? style.colors : {
        ice: COLOR_ICE,
        lines: COLOR_BLACK,
        hogLine: COLOR_RED,
        house: {
            ring12: COLOR_BLUE,
            ring8: COLOR_WHITE,
            ring4: COLOR_RED,
            button: COLOR_WHITE,
            stroke: COLOR_BLACK
        },
        text: 'rgba(0,0,0,0.1)'
    };
    // Coordinate system:
    // Origin (0,0) is the Tee Center
    // Y goes UP towards the start (so Hog Line is positive Y)
    // X goes RIGHT
    // But SVG coordinates have Y going DOWN.
    // So we need to map our logical coordinates to SVG coordinates.

    // Let's define the SVG viewBox to match our logical dimensions directly to simplify.
    // We'll make 0,0 the top-left of the VIEWABLE area.

    // Viewable area height
    const viewHeight = VIEW_TOP_OFFSET + VIEW_BOTTOM_OFFSET;

    // Center X in the SVG
    const cx = SHEET_WIDTH / 2;

    // Tee Line Y position in the SVG (relative to top of view)
    // Top of view is at Y = HOG_LINE_OFFSET + buffer
    // Tee Line is at Y = 0 in logical, but in SVG it will be down from the top.
    const teeY = VIEW_TOP_OFFSET;

    return (
        <div className="relative select-none" style={{ width, height: '100%' }}>
            <svg
                style={{ width: '100%', height: '100%' }}
                viewBox={`0 0 ${SHEET_WIDTH} ${viewHeight}`}
                className="bg-white block"
                preserveAspectRatio="none"
            >
                {/* Ice Background */}
                <rect x="0" y="0" width={SHEET_WIDTH} height={viewHeight} fill={colors.ice} />

                {/* Sidelines */}

                {/* House Rings */}
                <circle cx={cx} cy={teeY} r={HOUSE_RADIUS_12} fill={colors.house.ring12} stroke={colors.house.stroke} strokeWidth="1" />
                <circle cx={cx} cy={teeY} r={HOUSE_RADIUS_8} fill={colors.house.ring8} stroke={colors.house.stroke} strokeWidth="1" />
                <circle cx={cx} cy={teeY} r={HOUSE_RADIUS_4} fill={colors.house.ring4} stroke={colors.house.stroke} strokeWidth="1" />
                <circle cx={cx} cy={teeY} r={BUTTON_RADIUS} fill={colors.house.button} stroke={colors.house.stroke} strokeWidth="1" />

                {/* Center Line - stops at back line */}
                <line
                    x1={cx}
                    y1={0}
                    x2={cx}
                    y2={teeY + BACK_LINE_OFFSET}
                    stroke={colors.lines}
                    strokeWidth="2"
                />

                {/* Hog Line - drawn after center line so it appears on top */}
                <line
                    x1="0"
                    y1={teeY - HOG_LINE_OFFSET}
                    x2={SHEET_WIDTH}
                    y2={teeY - HOG_LINE_OFFSET}
                    stroke={colors.hogLine}
                    strokeWidth={HOG_LINE_WIDTH}
                />

                {/* Tee Line */}
                <line
                    x1="0"
                    y1={teeY}
                    x2={SHEET_WIDTH}
                    y2={teeY}
                    stroke={colors.lines}
                    strokeWidth="2"
                />

                {/* Back Line */}
                <line
                    x1="0"
                    y1={teeY + BACK_LINE_OFFSET}
                    x2={SHEET_WIDTH}
                    y2={teeY + BACK_LINE_OFFSET}
                    stroke={colors.lines}
                    strokeWidth="2"
                />

                {/* Mixed Doubles Markings */}
                {style?.markings?.map((marking, idx) => (
                    <circle
                        key={`marking-${idx}`}
                        cx={marking.x}
                        cy={marking.y}
                        r={3}
                        fill={colors.hogLine}
                        opacity={0.8}
                    />
                ))}

                {/* Status Text */}
                {round !== undefined && (
                    <text
                        x="20" // Upper left corner
                        y="15" // Above phase text
                        textAnchor="start"
                        dominantBaseline="hanging"
                        fill={colors.text}
                        fontSize="48"
                        fontWeight="900"
                        fontFamily="Outfit"
                        letterSpacing="-0.05em"
                        style={{ textTransform: 'lowercase' }}
                    >
                        round {round}
                    </text>
                )}

                {phase && (
                    <text
                        x="20" // Upper left corner
                        y="70" // Below round text
                        textAnchor="start"
                        dominantBaseline="hanging"
                        fill={colors.text}
                        fontSize="32"
                        fontWeight="900"
                        fontFamily="Outfit"
                        letterSpacing="-0.05em"
                        style={{ textTransform: 'lowercase' }}
                    >
                        {phase.toLowerCase()}
                    </text>
                )}

                {/* Overlays */}
                {children}
            </svg>
        </div>
    );
};

export default React.memo(CurlingSheet);
