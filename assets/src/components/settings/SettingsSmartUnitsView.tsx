import React, { useEffect, useRef, useState } from 'react';
import { useSettings, defaultSmartUnits } from '../../contexts/SettingsContext';
import { Trash2, RotateCcw, ArrowRight } from 'lucide-react';
import { BroomIcon, StoneIcon, RulerIcon } from '../icons/Icons';
import { ConfirmDialog } from '../ui/ConfirmDialog';

export const SettingsSmartUnitsView: React.FC = () => {
    const { baseUnitSystem, smartUnits, updateSmartUnits } = useSettings();
    const prevBaseUnitSystem = useRef(baseUnitSystem);
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [editingValue, setEditingValue] = useState<string>('');
    const [updatedIndex, setUpdatedIndex] = useState<number | null>(null);
    const [showResetConfirm, setShowResetConfirm] = useState(false);
    const [duplicateIndices, setDuplicateIndices] = useState<Set<number>>(new Set());
    const [tooltipIndex, setTooltipIndex] = useState<number | null>(null);

    // Helper function to sort rules by maxDistance (ascending, with Infinity at the end)
    const sortRules = (rules: typeof smartUnits) => {
        return [...rules].sort((a, b) => {
            if (a.maxDistance === Infinity) return 1;
            if (b.maxDistance === Infinity) return -1;
            return a.maxDistance - b.maxDistance;
        });
    };

    // Detect duplicate maxDistance values
    useEffect(() => {
        const distanceMap = new Map<number, number[]>();

        // Group indices by maxDistance value
        smartUnits.forEach((rule, index) => {
            const distance = rule.maxDistance;
            if (!distanceMap.has(distance)) {
                distanceMap.set(distance, []);
            }
            distanceMap.get(distance)!.push(index);
        });

        // Find all indices that have duplicates
        const duplicates = new Set<number>();
        distanceMap.forEach((indices) => {
            if (indices.length > 1) {
                indices.forEach(idx => duplicates.add(idx));
            }
        });

        setDuplicateIndices(duplicates);
    }, [smartUnits]);

    // Update smart unit rules when base unit system changes
    useEffect(() => {
        if (prevBaseUnitSystem.current !== baseUnitSystem) {
            const updatedRules = smartUnits.map(rule => {
                // Convert metric to imperial or vice versa
                if (baseUnitSystem === 'imperial' && rule.unit === 'metric') {
                    return { ...rule, unit: 'imperial' as const };
                } else if (baseUnitSystem === 'metric' && rule.unit === 'imperial') {
                    return { ...rule, unit: 'metric' as const };
                }
                return rule;
            });
            updateSmartUnits(sortRules(updatedRules));
            prevBaseUnitSystem.current = baseUnitSystem;
        }
    }, [baseUnitSystem, smartUnits, updateSmartUnits]);

    // Convert display unit to cm for storage
    const fromDisplayUnit = (displayValue: number): number => {
        if (displayValue === Infinity) return Infinity;
        return baseUnitSystem === 'imperial' ? displayValue * 2.54 : displayValue;
    };

    // Convert cm to display unit based on baseUnitSystem
    const toDisplayUnit = (cm: number | null | undefined): number | null => {
        if (cm === null || cm === undefined || isNaN(cm)) return null;
        if (cm === Infinity) return Infinity;
        return baseUnitSystem === 'imperial' ? cm / 2.54 : cm;
    };

    const displayUnitLabel = baseUnitSystem === 'imperial' ? 'in' : 'cm';

    // Helper to trigger update animation after sorting
    const triggerUpdateAnimation = (maxDistance: number, sortedRules: typeof smartUnits) => {
        // Find the new index after sorting
        const newIndex = sortedRules.findIndex(r => r.maxDistance === maxDistance);
        if (newIndex !== -1) {
            // Small delay to ensure sorting completes
            setTimeout(() => {
                setUpdatedIndex(newIndex);
                setTimeout(() => setUpdatedIndex(null), 600); // Clear after animation
            }, 50);
        }
    };

    return (
        <div className="space-y-6">
            <div className="text-sm text-gray-600 space-y-1">
                <p>Define distance ranges and the units to use for each range. Rules are applied in order.</p>
                <p className="text-xs text-gray-500">Tip: Type a dot (.) to set a distance to infinity (∞)</p>
                {duplicateIndices.size > 0 && (
                    <p className="text-xs text-red-600 font-medium">
                        ⚠ Error: Duplicate distance values detected. Each rule must have a unique distance threshold.
                    </p>
                )}
            </div>

            <div className="space-y-3">
                {smartUnits.map((rule, index) => {
                    const isDuplicate = duplicateIndices.has(index);
                    const isUpdated = updatedIndex === index;

                    return (
                        <div key={`${index}-${baseUnitSystem}`} className="flex items-center gap-3">
                            <div
                                className={`flex-grow p-3 rounded-xl transition-all duration-300 ${isDuplicate
                                    ? 'bg-red-100 border-2 border-red-300'
                                    : isUpdated
                                        ? 'bg-lavender-100 scale-[1.02]'
                                        : 'bg-gray-50'
                                    }`}
                            >
                                <div className="grid grid-cols-2 gap-4 items-center">
                                    <div className="flex items-center gap-2">
                                        <div className="relative group">
                                            <button
                                                className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                                                onMouseEnter={() => setTooltipIndex(index)}
                                                onMouseLeave={() => setTooltipIndex(null)}
                                                onClick={() => setTooltipIndex(tooltipIndex === index ? null : index)}
                                            >
                                                <ArrowRight size={16} />
                                            </button>
                                            {tooltipIndex === index && (
                                                <div className="absolute left-0 top-full mt-1 z-10 bg-gray-900 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap shadow-lg">
                                                    Distance threshold for this rule
                                                    <div className="absolute -top-1 left-3 w-2 h-2 bg-gray-900 transform rotate-45"></div>
                                                </div>
                                            )}
                                        </div>
                                        <input
                                            type="text"
                                            inputMode="decimal"
                                            value={
                                                editingIndex === index
                                                    ? editingValue
                                                    : rule.maxDistance === Infinity
                                                        ? ''
                                                        : (toDisplayUnit(rule.maxDistance)?.toFixed(2) ?? '')
                                            }
                                            placeholder="∞"
                                            onFocus={() => {
                                                setEditingIndex(index);
                                                const displayVal = rule.maxDistance === Infinity
                                                    ? ''
                                                    : (toDisplayUnit(rule.maxDistance)?.toString() ?? '');
                                                setEditingValue(displayVal);
                                            }}
                                            onChange={(e) => {
                                                const input = e.target.value;

                                                // Only allow digits, dots, and empty
                                                if (input && !/^[\d.]*$/.test(input)) {
                                                    return;
                                                }

                                                // Update local editing state
                                                setEditingValue(input);
                                            }}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.currentTarget.blur();
                                                }
                                            }}
                                            onBlur={() => {
                                                const input = editingValue;

                                                // If just a dot or empty, set to infinity
                                                if (input === '.' || input === '') {
                                                    const newRules = [...smartUnits];
                                                    newRules[index] = { ...rule, maxDistance: Infinity };
                                                    const sorted = sortRules(newRules);
                                                    updateSmartUnits(sorted);
                                                    triggerUpdateAnimation(Infinity, sorted);
                                                    setEditingIndex(null);
                                                    setEditingValue('');
                                                    return;
                                                }

                                                // Parse the value
                                                const displayVal = parseFloat(input);
                                                if (!isNaN(displayVal)) {
                                                    const cmVal = fromDisplayUnit(displayVal);
                                                    const newRules = [...smartUnits];
                                                    newRules[index] = { ...rule, maxDistance: cmVal };
                                                    const sorted = sortRules(newRules);
                                                    updateSmartUnits(sorted);
                                                    triggerUpdateAnimation(cmVal, sorted);
                                                }

                                                setEditingIndex(null);
                                                setEditingValue('');
                                            }}
                                            className="w-20 px-2 py-1 rounded border-gray-300 text-sm"
                                        />
                                        <span className="text-sm text-gray-500">{displayUnitLabel}</span>
                                    </div>
                                    <select
                                        value={rule.unit}
                                        onChange={(e) => {
                                            const newRules = [...smartUnits];
                                            newRules[index] = { ...rule, unit: e.target.value as any };
                                            const sorted = sortRules(newRules);
                                            updateSmartUnits(sorted);
                                            triggerUpdateAnimation(rule.maxDistance, sorted);
                                        }}
                                        className="px-2 py-1 rounded border-gray-300 text-sm"
                                    >
                                        {baseUnitSystem === 'metric' ? (
                                            <option value="metric">Centimeters</option>
                                        ) : (
                                            <option value="imperial">Inches</option>
                                        )}
                                        <option value="stone">Stone Widths</option>
                                        <option value="broom">Broom Lengths</option>
                                    </select>
                                    <div className="text-gray-400">
                                        {rule.unit === 'stone' && <StoneIcon size={20} />}
                                        {rule.unit === 'broom' && <BroomIcon size={20} />}
                                        {(rule.unit === 'metric' || rule.unit === 'imperial') && <RulerIcon size={20} />}
                                    </div>
                                </div>
                            </div>
                            {smartUnits.length > 1 && (
                                <button
                                    onClick={() => {
                                        const newRules = [...smartUnits];
                                        newRules.splice(index, 1);
                                        updateSmartUnits(sortRules(newRules));
                                    }}
                                    className="p-2 text-icy-black hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                                >
                                    <Trash2 size={16} />
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Add Rule Button */}
            {smartUnits.length < 10 ? (
                <button
                    onClick={() => {
                        const newRule = {
                            maxDistance: Infinity,
                            unit: baseUnitSystem === 'imperial' ? 'imperial' as const : 'metric' as const
                        };
                        updateSmartUnits(sortRules([...smartUnits, newRule]));
                    }}
                    className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 font-medium hover:border-lavender-500 hover:text-lavender-600 transition-colors flex items-center justify-center gap-2"
                >
                    + Add Rule
                </button>
            ) : (
                <div className="w-full py-3 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 font-medium flex items-center justify-center gap-2 cursor-not-allowed">
                    Maximum of 10 rules reached
                </div>
            )}

            {/* Reset Button */}
            <div className="space-y-2">
                <button
                    onClick={() => setShowResetConfirm(true)}
                    className="w-full py-3 bg-red-50 hover:bg-red-100 rounded-xl text-red-700 font-medium transition-colors flex items-center justify-center gap-2 border-2 border-red-200 hover:border-red-300"
                >
                    <RotateCcw size={16} />
                    Reset to Default
                </button>
                <p className="text-xs text-gray-500 text-center">
                    Restores the standard configuration: inches for short distances, stone widths, broom lengths, and centimeters for long distances
                </p>
            </div>

            {/* Reset Confirmation Dialog */}
            <ConfirmDialog
                isOpen={showResetConfirm}
                onClose={() => setShowResetConfirm(false)}
                onConfirm={() => updateSmartUnits(sortRules(defaultSmartUnits))}
                title="reset to default?"
                message="This will replace your current smart units configuration with the default settings. This action cannot be undone."
                confirmText="Reset"
                cancelText="Cancel"
                variant="danger"
            />
        </div>
    );
};
