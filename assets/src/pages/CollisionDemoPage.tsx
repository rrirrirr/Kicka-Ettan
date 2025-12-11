import React, { useState, useRef, useEffect } from 'react';

import { Link } from 'react-router-dom';
import { ChevronLeft, Play, RotateCcw, ArrowRightLeft } from 'lucide-react';
import CurlingSheet from '../components/CurlingSheet';
import {
    SHEET_WIDTH,
    VIEW_TOP_OFFSET,
    VIEW_BOTTOM_OFFSET,
    STONE_RADIUS,
} from '../utils/constants';

// Stone position type
interface StonePosition {
    x: number;
    y: number;
}

interface StonesState {
    red: StonePosition[];
    yellow: StonePosition[];
}

interface BanZone {
    x: number;
    y: number;
    radius: number;
}

interface BannedZones {
    red?: BanZone;
    yellow?: BanZone;
}

interface Scenario {
    name: string;
    description: string;
    stones: StonesState;
    bannedZones: BannedZones;
}

// Predefined collision scenarios
const SCENARIOS: Scenario[] = [
    {
        name: 'Head-on Collision',
        description: 'Two stones directly overlapping in the center',
        stones: {
            red: [{ x: 237, y: 640 }],
            yellow: [{ x: 245, y: 640 }],
        },
        bannedZones: {},
    },
    {
        name: 'Push Into Ban Ring',
        description: 'Stone collision that pushes into ban zone',
        stones: {
            red: [{ x: 200, y: 640 }],
            yellow: [{ x: 215, y: 640 }],
        },
        bannedZones: {
            red: { x: 170, y: 640, radius: 50 },
        },
    },
    {
        name: 'Multiple Collisions',
        description: 'Chain reaction of stone collisions',
        stones: {
            red: [{ x: 220, y: 640 }, { x: 250, y: 640 }, { x: 280, y: 640 }],
            yellow: [{ x: 235, y: 640 }, { x: 265, y: 640 }],
        },
        bannedZones: {},
    },
];

// Stone rendering component
const Stone: React.FC<{
    x: number;
    y: number;
    color: 'red' | 'yellow';
    opacity?: number;
    onMouseDown?: (e: React.MouseEvent) => void;
    isDraggable?: boolean;
}> = ({ x, y, color, opacity = 1, onMouseDown, isDraggable }) => {
    const svgY = VIEW_TOP_OFFSET - y + VIEW_TOP_OFFSET;
    const fillColor = color === 'red' ? '#D22730' : '#FFD700';
    const strokeColor = color === 'red' ? '#8B0000' : '#B8860B';

    return (
        <g
            opacity={opacity}
            onMouseDown={onMouseDown}
            style={{ cursor: isDraggable ? 'grab' : 'default' }}
        >
            <circle
                cx={x}
                cy={svgY}
                r={STONE_RADIUS}
                fill={fillColor}
                stroke={strokeColor}
                strokeWidth="2"
            />
            <circle
                cx={x}
                cy={svgY}
                r={STONE_RADIUS * 0.4}
                fill={strokeColor}
            />
        </g>
    );
};

// Ban zone rendering component
const BanZoneCircle: React.FC<{
    zone: BanZone;
    color: 'red' | 'yellow';
}> = ({ zone, color }) => {
    const svgY = VIEW_TOP_OFFSET - zone.y + VIEW_TOP_OFFSET;
    const fillColor = color === 'red' ? 'rgba(210, 39, 48, 0.2)' : 'rgba(255, 215, 0, 0.2)';
    const strokeColor = color === 'red' ? '#D22730' : '#FFD700';

    return (
        <circle
            cx={zone.x}
            cy={svgY}
            r={zone.radius}
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth="2"
            strokeDasharray="8,4"
        />
    );
};

const CollisionDemoPage: React.FC = () => {
    const [selectedScenario, setSelectedScenario] = useState<number>(0);
    const [currentStones, setCurrentStones] = useState<StonesState>(SCENARIOS[0].stones);
    const [bannedZones, setBannedZones] = useState<BannedZones>(SCENARIOS[0].bannedZones);
    const [resolvedStones, setResolvedStones] = useState<StonesState | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Dragging state
    const [dragging, setDragging] = useState<{ color: 'red' | 'yellow'; index: number } | null>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);

    const viewHeight = VIEW_TOP_OFFSET + VIEW_BOTTOM_OFFSET;
    // Aspect ratio for container: Width / Height
    const aspectRatio = SHEET_WIDTH / viewHeight;

    useEffect(() => {
        // Reset state when scenario changes
        setCurrentStones(SCENARIOS[selectedScenario].stones);
        setBannedZones(SCENARIOS[selectedScenario].bannedZones);
        setResolvedStones(null);
        setError(null);
    }, [selectedScenario]);

    const handleSwapRoles = () => {
        setCurrentStones(prev => ({
            red: prev.yellow,
            yellow: prev.red
        }));
        setResolvedStones(null);
    };

    const handleResolve = async () => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/collisions/resolve', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    stones: currentStones,
                    banned_zones: bannedZones,
                }),
            });

            if (!response.ok) {
                throw new Error(`Failed to resolve collisions: ${response.statusText}`);
            }

            const data = await response.json();
            setResolvedStones(data.resolved_stones);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleReset = () => {
        setCurrentStones(SCENARIOS[selectedScenario].stones);
        setResolvedStones(null);
        setError(null);
    };

    // Drag handlers
    const handleMouseDown = (color: 'red' | 'yellow', index: number, e: React.MouseEvent) => {
        e.preventDefault();
        setDragging({ color, index });
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!dragging || !wrapperRef.current) return;

        const rect = wrapperRef.current.getBoundingClientRect();
        const xRatio = (e.clientX - rect.left) / rect.width;
        const yRatio = (e.clientY - rect.top) / rect.height;

        // Convert to game coordinates
        let newX = xRatio * SHEET_WIDTH;
        let newSvgY = yRatio * viewHeight;
        // Remember SVG Y is inverted relative to Game Y (except offsets)
        // Game Y = VIEW_TOP_OFFSET + VIEW_TOP_OFFSET - SvgY
        // Wait, let's recheck rendering logic:
        // const svgY = VIEW_TOP_OFFSET - y + VIEW_TOP_OFFSET;
        // So:
        // y = VIEW_TOP_OFFSET + VIEW_TOP_OFFSET - svgY
        // y = 2 * VIEW_TOP_OFFSET - svgY

        let newY = 2 * VIEW_TOP_OFFSET - newSvgY;

        // Clamp values
        newX = Math.max(0, Math.min(SHEET_WIDTH, newX));
        // newY range is large, just clamp to reasonable bounds if needed, but let's allow free movement

        setCurrentStones(prev => {
            const newStones = { ...prev };
            const list = [...newStones[dragging.color]];
            list[dragging.index] = { x: newX, y: newY };
            newStones[dragging.color] = list;
            return newStones;
        });

        // Clear resolved state if we move stones
        if (resolvedStones) {
            setResolvedStones(null);
        }
    };

    const handleMouseUp = () => {
        setDragging(null);
    };

    return (
        <div
            className="min-h-screen bg-gray-900 text-white p-4"
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
        >
            {/* Header */}
            <div className="max-w-7xl mx-auto">
                <div className="flex items-center gap-4 mb-6">
                    <Link
                        to="/dev"
                        className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
                    >
                        <ChevronLeft size={20} />
                        Back to Dev
                    </Link>
                    <h1 className="text-2xl font-bold">Collision Demo</h1>
                </div>

                {/* Scenario Selector */}
                <div className="mb-6">
                    <h2 className="text-lg font-semibold mb-3">Select Scenario</h2>
                    <div className="flex flex-wrap gap-2">
                        {SCENARIOS.map((scenario, index) => (
                            <button
                                key={index}
                                onClick={() => setSelectedScenario(index)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${selectedScenario === index
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                    }`}
                            >
                                {scenario.name}
                            </button>
                        ))}
                    </div>
                    <p className="text-gray-400 mt-2">{SCENARIOS[selectedScenario].description}</p>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-4 mb-6">
                    <button
                        onClick={handleResolve}
                        disabled={isLoading}
                        className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-500 disabled:bg-gray-600 rounded-lg font-medium transition-colors"
                    >
                        <Play size={20} />
                        {isLoading ? 'Resolving...' : 'Resolve Collisions'}
                    </button>
                    <button
                        onClick={handleSwapRoles}
                        className="flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-500 rounded-lg font-medium transition-colors"
                    >
                        <ArrowRightLeft size={20} />
                        Swap Colors
                    </button>
                    <button
                        onClick={handleReset}
                        className="flex items-center gap-2 px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium transition-colors"
                    >
                        <RotateCcw size={20} />
                        Reset
                    </button>
                </div>

                {error && (
                    <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded-lg mb-6">
                        {error}
                    </div>
                )}

                {/* Side-by-Side Comparison */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Before (Interactive) */}
                    <div className="flex flex-col items-center">
                        <h3 className="text-lg font-semibold mb-3 text-center">Before (Drag to Edit)</h3>
                        <div
                            ref={wrapperRef}
                            className="bg-gray-800 rounded-lg overflow-hidden shadow-lg border border-gray-700"
                            style={{ width: '300px', height: `${300 / aspectRatio}px` }}
                        >
                            <CurlingSheet width="100%">
                                {/* Ban zones */}
                                {bannedZones.red && (
                                    <BanZoneCircle zone={bannedZones.red} color="red" />
                                )}
                                {bannedZones.yellow && (
                                    <BanZoneCircle zone={bannedZones.yellow} color="yellow" />
                                )}
                                {/* Stones */}
                                {currentStones.red.map((stone, i) => (
                                    <Stone
                                        key={`red-${i}`}
                                        x={stone.x}
                                        y={stone.y}
                                        color="red"
                                        onMouseDown={(e) => handleMouseDown('red', i, e)}
                                        isDraggable
                                    />
                                ))}
                                {currentStones.yellow.map((stone, i) => (
                                    <Stone
                                        key={`yellow-${i}`}
                                        x={stone.x}
                                        y={stone.y}
                                        color="yellow"
                                        onMouseDown={(e) => handleMouseDown('yellow', i, e)}
                                        isDraggable
                                    />
                                ))}
                            </CurlingSheet>
                        </div>
                    </div>

                    {/* After (Resolved) */}
                    <div className="flex flex-col items-center">
                        <h3 className="text-lg font-semibold mb-3 text-center">After</h3>
                        <div
                            className="bg-gray-800 rounded-lg overflow-hidden shadow-lg border border-gray-700"
                            style={{ width: '300px', height: `${300 / aspectRatio}px` }}
                        >
                            <CurlingSheet width="100%">
                                {/* Ban zones */}
                                {bannedZones.red && (
                                    <BanZoneCircle zone={bannedZones.red} color="red" />
                                )}
                                {bannedZones.yellow && (
                                    <BanZoneCircle zone={bannedZones.yellow} color="yellow" />
                                )}
                                {/* Stones (Solid) */}
                                {resolvedStones ? (
                                    <>
                                        {resolvedStones.red.map((stone, i) => (
                                            <Stone key={`red-${i}`} x={stone.x} y={stone.y} color="red" opacity={1} />
                                        ))}
                                        {resolvedStones.yellow.map((stone, i) => (
                                            <Stone key={`yellow-${i}`} x={stone.x} y={stone.y} color="yellow" opacity={1} />
                                        ))}
                                    </>
                                ) : (
                                    <>
                                        {/* Ghost positions showing original to indicate waiting for resolve */}
                                        {currentStones.red.map((stone, i) => (
                                            <Stone key={`red-${i}`} x={stone.x} y={stone.y} color="red" opacity={0.3} />
                                        ))}
                                        {currentStones.yellow.map((stone, i) => (
                                            <Stone key={`yellow-${i}`} x={stone.x} y={stone.y} color="yellow" opacity={0.3} />
                                        ))}
                                    </>
                                )}
                            </CurlingSheet>
                        </div>
                    </div>
                </div>

                {/* Position Details - Improved Text Container */}
                <div className="mt-8 bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-700">
                    <h4 className="text-xl font-bold mb-4 flex items-center gap-2">
                        <span className="bg-blue-600 w-1 h-6 rounded-full"></span>
                        Coordinates
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Before Coords */}
                        <div>
                            <div className="flex justify-between items-center mb-2 border-b border-gray-700 pb-2">
                                <h5 className="font-semibold text-gray-300">Before</h5>
                                <span className="text-xs text-gray-500 uppercase">x / y</span>
                            </div>
                            <div className="space-y-3 font-mono text-sm">
                                <div>
                                    <span className="text-red-400 font-bold block mb-1">Red</span>
                                    {currentStones.red.length === 0 && <span className="text-gray-600 italic">None</span>}
                                    {currentStones.red.map((s, i) => (
                                        <div key={i} className="flex justify-between px-2 py-1 bg-gray-900/50 rounded hover:bg-gray-900 transition-colors">
                                            <span>#{i}</span>
                                            <span>{s.x.toFixed(1)} / {s.y.toFixed(1)}</span>
                                        </div>
                                    ))}
                                </div>
                                <div>
                                    <span className="text-yellow-400 font-bold block mb-1">Yellow</span>
                                    {currentStones.yellow.length === 0 && <span className="text-gray-600 italic">None</span>}
                                    {currentStones.yellow.map((s, i) => (
                                        <div key={i} className="flex justify-between px-2 py-1 bg-gray-900/50 rounded hover:bg-gray-900 transition-colors">
                                            <span>#{i}</span>
                                            <span>{s.x.toFixed(1)} / {s.y.toFixed(1)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* After Coords */}
                        <div>
                            <div className="flex justify-between items-center mb-2 border-b border-gray-700 pb-2">
                                <h5 className="font-semibold text-gray-300">After Resolution</h5>
                                <span className="text-xs text-gray-500 uppercase">x / y</span>
                            </div>
                            {resolvedStones ? (
                                <div className="space-y-3 font-mono text-sm">
                                    <div>
                                        <span className="text-red-400 font-bold block mb-1">Red</span>
                                        {resolvedStones.red.length === 0 && <span className="text-gray-600 italic">None</span>}
                                        {resolvedStones.red.map((s, i) => (
                                            <div key={i} className="flex justify-between px-2 py-1 bg-gray-900/50 rounded hover:bg-gray-900 transition-colors">
                                                <span>#{i}</span>
                                                <span>{s.x.toFixed(1)} / {s.y.toFixed(1)}</span>
                                            </div>
                                        ))}
                                    </div>
                                    <div>
                                        <span className="text-yellow-400 font-bold block mb-1">Yellow</span>
                                        {resolvedStones.yellow.length === 0 && <span className="text-gray-600 italic">None</span>}
                                        {resolvedStones.yellow.map((s, i) => (
                                            <div key={i} className="flex justify-between px-2 py-1 bg-gray-900/50 rounded hover:bg-gray-900 transition-colors">
                                                <span>#{i}</span>
                                                <span>{s.x.toFixed(1)} / {s.y.toFixed(1)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="h-full flex items-center justify-center text-gray-600 italic">
                                    Run resolve to see results
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CollisionDemoPage;
