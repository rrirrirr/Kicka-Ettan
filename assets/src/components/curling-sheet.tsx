import React from 'react';
import {
    SHEET_WIDTH,
    HOUSE_RADIUS_12,
    HOUSE_RADIUS_8,
    HOUSE_RADIUS_4,
    BUTTON_RADIUS,
    HOG_LINE_OFFSET,
    BACK_LINE_OFFSET,
    VIEW_TOP_OFFSET,
    VIEW_BOTTOM_OFFSET,
    COLOR_ICE,
    COLOR_RED,
    COLOR_BLUE,
    COLOR_WHITE,
    COLOR_BLACK
} from '../utils/constants';

interface CurlingSheetProps {
    width?: string | number;
    round?: number;
    phase?: string;
}

const CurlingSheet: React.FC<CurlingSheetProps> = ({ width = '100%', round, phase }) => {
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
        <div className="relative select-none w-full" style={{ width, aspectRatio: `${SHEET_WIDTH}/${viewHeight}` }}>
            <svg
                width="100%"
                height="100%"
                viewBox={`0 0 ${SHEET_WIDTH} ${viewHeight}`}
                className="bg-white block"
                preserveAspectRatio="xMidYMid meet"
            >
                {/* Ice Background */}
                <rect x="0" y="0" width={SHEET_WIDTH} height={viewHeight} fill={COLOR_ICE} />

                {/* Sidelines */}

                {/* House Rings */}
                <circle cx={cx} cy={teeY} r={HOUSE_RADIUS_12} fill={COLOR_BLUE} stroke={COLOR_BLACK} strokeWidth="1" />
                <circle cx={cx} cy={teeY} r={HOUSE_RADIUS_8} fill={COLOR_WHITE} stroke={COLOR_BLACK} strokeWidth="1" />
                <circle cx={cx} cy={teeY} r={HOUSE_RADIUS_4} fill={COLOR_RED} stroke={COLOR_BLACK} strokeWidth="1" />
                <circle cx={cx} cy={teeY} r={BUTTON_RADIUS} fill={COLOR_WHITE} stroke={COLOR_BLACK} strokeWidth="1" />

                {/* Center Line - stops at back line */}
                <line
                    x1={cx}
                    y1={0}
                    x2={cx}
                    y2={teeY + BACK_LINE_OFFSET}
                    stroke={COLOR_BLACK}
                    strokeWidth="2"
                />

                {/* Hog Line - drawn after center line so it appears on top */}
                <line
                    x1="0"
                    y1={teeY - HOG_LINE_OFFSET}
                    x2={SHEET_WIDTH}
                    y2={teeY - HOG_LINE_OFFSET}
                    stroke={COLOR_RED}
                    strokeWidth="10" // Hog line is wide
                />

                {/* Tee Line */}
                <line
                    x1="0"
                    y1={teeY}
                    x2={SHEET_WIDTH}
                    y2={teeY}
                    stroke={COLOR_BLACK}
                    strokeWidth="2"
                />

                {/* Back Line */}
                <line
                    x1="0"
                    y1={teeY + BACK_LINE_OFFSET}
                    x2={SHEET_WIDTH}
                    y2={teeY + BACK_LINE_OFFSET}
                    stroke={COLOR_BLACK}
                    strokeWidth="2"
                />

                {/* Status Text */}
                {round !== undefined && (
                    <text
                        x={cx - 60} // Left of center
                        y={teeY - HOG_LINE_OFFSET} // Near Hog Line
                        textAnchor="end" // End at the Y coordinate (which is top because of rotation?)
                        // Wait, rotation is -90.
                        // Normal: X is horizontal, Y is vertical.
                        // Rotated -90: X becomes Up, Y becomes Right?
                        // Let's visualize.
                        // transform={`rotate(-90, ${x}, ${y})`}
                        // If I draw at (x, y) and rotate around (x, y):
                        // The text baseline starts at (x, y) and goes UP.
                        // "textAnchor=end" means the END of the string is at (x, y).
                        // So the text will extend DOWN from (x, y).
                        // We want it to end at the Hog Line (Top).
                        // So (x, y) should be near the Hog Line.
                        // And textAnchor="end" means the text ends there.
                        // So it will extend downwards (towards Tee Line).
                        // This seems correct.
                        dominantBaseline="middle"
                        fill="rgba(0,0,0,0.1)"
                        fontSize="80"
                        fontWeight="bold"
                        transform={`rotate(-90, ${cx - 60}, ${teeY - HOG_LINE_OFFSET + 20})`}
                    >
                        ROUND {round}
                    </text>
                )}

                {phase && (
                    <>
                        {/* Phase value */}
                        <text
                            x={cx + 60} // Right of center
                            y={teeY - HOG_LINE_OFFSET + 40} // Near Hog Line
                            textAnchor="end"
                            dominantBaseline="middle"
                            fill="rgba(0,0,0,0.1)"
                            fontSize="40"
                            fontWeight="bold"
                            transform={`rotate(-90, ${cx + 60}, ${teeY - HOG_LINE_OFFSET + 20})`}
                        >
                            {phase.toUpperCase()}
                        </text>
                        {/* Phase label */}
                        <text
                            x={cx + 60} // Right of center
                            y={teeY - HOG_LINE_OFFSET + 100} // Below phase value
                            textAnchor="end"
                            dominantBaseline="middle"
                            fill="rgba(0,0,0,0.1)"
                            fontSize="40"
                            fontWeight="bold"
                            transform={`rotate(-90, ${cx + 60}, ${teeY - HOG_LINE_OFFSET + 20})`}
                        >
                            PHASE
                        </text>
                    </>
                )}
            </svg>
        </div>
    );
};

export default CurlingSheet;
