import React from 'react';
import CurlingSheet from './CurlingSheet';
import {
    SHEET_WIDTH,
    HOG_LINE_OFFSET,
    BACK_LINE_OFFSET,
    VIEW_TOP_OFFSET,
    HOUSE_RADIUS_12
} from '../utils/constants';

// Define zone colors
const ZONE_COLORS = {
    house: 'rgba(239, 68, 68, 0.3)', // Red-500 with opacity
    nearHouse: 'rgba(99, 102, 241, 0.3)', // Periwinkle-500 with opacity
    guard: 'rgba(139, 92, 246, 0.3)' // Lavender-500 with opacity
};

export const ZonesDiagram: React.FC = () => {
    // Dimensions calculation
    const cx = SHEET_WIDTH / 2;
    const teeY = VIEW_TOP_OFFSET;
    const hogY = teeY - HOG_LINE_OFFSET;
    const backY = teeY + BACK_LINE_OFFSET;

    // Radius definitions
    const houseRadius = HOUSE_RADIUS_12; // 6ft radius
    const nearHouseRadius = HOUSE_RADIUS_12 + 150; // Near house zone extends 1.5m from house edge

    // Path for Guard Zone (Rectangle minus Near House Circle)
    // Hole: Circle at (cx, teeY) with radius nearHouseRadius
    // SVG Path: M (start rect) ... Z M (start hole) ... Z (using evenodd fill rule or counter-clockwise hole)
    // Simpler approach: Use mask or just draw rectangle and rely on z-index if we were opaque, 
    // but since we are transparent, we need a proper path with a hole to avoid color mixing.

    // Path for Guard Zone
    // We want a shape that covers the top part of the sheet (Hog Line to T-Line)
    // BUT excludes the semi-circle of the Near House zone at the T-Line.
    // Path:
    // 1. Start at Top-Left (0, hogY)
    // 2. Line to Top-Right (SHEET_WIDTH, hogY)
    // 3. Line to Right T-Line edge (SHEET_WIDTH, teeY)
    // 4. Line to Near House outer edge at T-Line (cx + nearHouseRadius, teeY)
    // 5. Arc to Near House outer edge at Left T-Line (cx - nearHouseRadius, teeY) via Top
    //    (Sweep=0 for counter-clockwise in SVG Y-down coords? Let's verify: Right->Top->Left is counter-clockwise)
    // 6. Line to Left T-Line edge (0, teeY)
    // 7. Close path

    const guardZonePath = [
        `M 0 ${hogY}`,
        `L ${SHEET_WIDTH} ${hogY}`,
        `L ${SHEET_WIDTH} ${teeY}`,
        `L ${cx + nearHouseRadius} ${teeY}`,
        `A ${nearHouseRadius} ${nearHouseRadius} 0 0 0 ${cx - nearHouseRadius} ${teeY}`,
        `L 0 ${teeY}`,
        `Z`
    ].join(' ');

    // Path for Near House Zone (Ring)
    const nearHouseOuterPath = `M ${cx} ${teeY - nearHouseRadius} A ${nearHouseRadius} ${nearHouseRadius} 0 1 1 ${cx} ${teeY + nearHouseRadius} A ${nearHouseRadius} ${nearHouseRadius} 0 1 1 ${cx} ${teeY - nearHouseRadius}`;
    const nearHouseInnerPath = `M ${cx} ${teeY - houseRadius} A ${houseRadius} ${houseRadius} 0 1 0 ${cx} ${teeY + houseRadius} A ${houseRadius} ${houseRadius} 0 1 0 ${cx} ${teeY - houseRadius}`;

    const nearHouseZonePath = `${nearHouseOuterPath} ${nearHouseInnerPath}`;

    return (
        <div className="flex flex-col items-center gap-6">
            <div className="w-64 shadow-xl rounded-xl overflow-hidden bg-white">
                <CurlingSheet width="100%">
                    <defs>
                        <clipPath id="backLineClip">
                            <rect x="0" y="0" width={SHEET_WIDTH} height={backY} />
                        </clipPath>
                    </defs>

                    {/* Guard Zone */}
                    <path
                        d={guardZonePath}
                        fill={ZONE_COLORS.guard}
                        fillRule="evenodd"
                        stroke="none"
                        clipPath="url(#backLineClip)"
                    />

                    {/* Near House Zone */}
                    <path
                        d={nearHouseZonePath}
                        fill={ZONE_COLORS.nearHouse}
                        fillRule="evenodd"
                        stroke="none"
                        clipPath="url(#backLineClip)"
                    />

                    {/* House Zone - No Overlay */}
                </CurlingSheet>
            </div>

            {/* Legend */}
            <div className="w-full max-w-md bg-gray-50 rounded-xl p-4 space-y-3">
                <h3 className="heading-4 mb-2">Zone Legend</h3>

                <div className="flex items-center gap-3">
                    {/* Mini House Icon */}
                    <svg width="24" height="24" viewBox="0 0 24 24" className="rounded-full">
                        <circle cx="12" cy="12" r="12" fill="#185494" /> {/* Blue 12ft */}
                        <circle cx="12" cy="12" r="8" fill="#ffffff" />  {/* White 8ft */}
                        <circle cx="12" cy="12" r="4" fill="#D22730" />  {/* Red 4ft */}
                        <circle cx="12" cy="12" r="1" fill="#ffffff" />  {/* Button */}
                    </svg>
                    <div>
                        <span className="font-semibold text-icy-black">House Zone</span>
                        <p className="text-xs text-gray-500">Stones touching the house (12ft ring)</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded border border-blue-200" style={{ backgroundColor: ZONE_COLORS.nearHouse }} />
                    <div>
                        <span className="font-semibold text-icy-black">Near House Zone</span>
                        <p className="text-xs text-gray-500">Stones within 1.5m of the house</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded border border-lavender-200" style={{ backgroundColor: ZONE_COLORS.guard }} />
                    <div>
                        <span className="font-semibold text-icy-black">Guard Zone</span>
                        <p className="text-xs text-gray-500">Stones in play but not near the house</p>
                    </div>
                </div>
            </div>
        </div>
    );
};
