import React, { useEffect, useRef, useState } from 'react';
import { useSettings, defaultSmartUnits } from '../../contexts/SettingsContext';
import { Trash2, RotateCcw } from 'lucide-react';

export const SettingsSmartUnitsView: React.FC = () => {
    const { baseUnitSystem, smartUnits, updateSmartUnits } = useSettings();
    const prevBaseUnitSystem = useRef(baseUnitSystem);
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [editingValue, setEditingValue] = useState<string>('');
    const [updatedIndex, setUpdatedIndex] = useState<number | null>(null);

    // Helper function to sort rules by maxDistance (ascending, with Infinity at the end)
    const sortRules = (rules: typeof smartUnits) => {
        return [...rules].sort((a, b) => {
            if (a.maxDistance === Infinity) return 1;
            if (b.maxDistance === Infinity) return -1;
            return a.maxDistance - b.maxDistance;
        });
    };

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
            </div>

            <div className="space-y-3">
                {smartUnits.map((rule, index) => (
                    <div
                        key={`${index}-${baseUnitSystem}`}
                        className={`flex items-center gap-3 p-3 rounded-xl transition-all duration-300 ${
                            updatedIndex === index
                                ? 'bg-lavender-100 scale-[1.02]'
                                : 'bg-gray-50'
                        }`}
                    >
                        <div className="flex-grow grid grid-cols-2 gap-4 items-center">
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-500">Up to</span>
                                <div className="flex items-center gap-1">
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
                                                updateSmartUnits(sortRules(newRules));
                                                triggerUpdateAnimation(index);
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
                                                updateSmartUnits(sortRules(newRules));
                                                triggerUpdateAnimation(index);
                                            }

                                            setEditingIndex(null);
                                            setEditingValue('');
                                        }}
                                        className="w-20 px-2 py-1 rounded border-gray-300 text-sm"
                                    />
                                    <button
                                        onClick={() => {
                                            const newRules = [...smartUnits];
                                            newRules[index] = { ...rule, maxDistance: Infinity };
                                            updateSmartUnits(sortRules(newRules));
                                            triggerUpdateAnimation(index);
                                            // Clear editing state if this field was being edited
                                            if (editingIndex === index) {
                                                setEditingIndex(null);
                                                setEditingValue('');
                                            }
                                        }}
                                        className="px-2 py-1 text-xs font-bold text-gray-500 hover:text-lavender-600 hover:bg-lavender-50 rounded transition-colors"
                                        title="Set to infinity"
                                    >
                                        ∞
                                    </button>
                                </div>
                                <span className="text-sm text-gray-500">{displayUnitLabel}</span>
                            </div>
                            <select
                                value={rule.unit}
                                onChange={(e) => {
                                    const newRules = [...smartUnits];
                                    newRules[index] = { ...rule, unit: e.target.value as any };
                                    updateSmartUnits(sortRules(newRules));
                                    triggerUpdateAnimation(index);
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
                        </div>
                        {smartUnits.length > 1 && (
                            <button
                                onClick={() => {
                                    const newRules = [...smartUnits];
                                    newRules.splice(index, 1);
                                    updateSmartUnits(sortRules(newRules));
                                }}
                                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            >
                                <Trash2 size={16} />
                            </button>
                        )}
                    </div>
                ))}
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
                    onClick={() => {
                        updateSmartUnits(sortRules(defaultSmartUnits));
                    }}
                    className="w-full py-3 bg-gray-100 hover:bg-gray-200 rounded-xl text-gray-700 font-medium transition-colors flex items-center justify-center gap-2"
                >
                    <RotateCcw size={16} />
                    Reset to Default
                </button>
                <p className="text-xs text-gray-500 text-center">
                    Restores the standard configuration: inches for short distances, stone widths, broom lengths, and centimeters for long distances
                </p>
            </div>
        </div>
    );
};
