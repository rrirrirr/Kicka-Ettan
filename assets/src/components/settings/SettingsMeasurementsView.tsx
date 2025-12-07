import React, { useState } from 'react';
import { useSettings, MeasurementStep, MeasurementType, ZONE_AVAILABLE_TYPES } from '../../contexts/SettingsContext';
import { Trash2, Target, Shield, ArrowLeftRight } from 'lucide-react';
import { ZonesDiagram } from '../ZonesDiagram';

type MeasurementTab = 'cycles' | 'toggle' | 'display' | 'zones';

export const SettingsMeasurementsView: React.FC = () => {
    const { settings, displaySettings, toggleModeSettings, updateSettings, updateDisplaySettings, updateToggleModeSettings } = useSettings();
    const [measurementTab, setMeasurementTab] = useState<MeasurementTab>('cycles');

    const getIcon = (type: MeasurementType) => {
        switch (type) {
            case 'closest-ring': return <Target size={16} />;
            case 'guard': return <Shield size={16} />;
            case 't-line': return <span className="text-xl font-bold">T</span>; // T-line icon
            case 'center-line': return (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 4.5v15" />
                </svg>
            ); // Thicker vertical line
            case 'stone-to-stone': return <ArrowLeftRight size={16} />;
            default: return null;
        }
    };

    const handleAddStep = (zone: 'guardZone' | 'houseZone' | 'nearHouseZone') => {
        const newStep: MeasurementStep = {
            id: Math.random().toString(36).substr(2, 9),
            types: zone === 'guardZone' ? ['guard'] : (zone === 'nearHouseZone' ? ['closest-ring'] : ['t-line', 'center-line'])
        };
        updateSettings({
            ...settings,
            [zone]: [...settings[zone], newStep]
        });
    };

    const handleRemoveStep = (zone: 'guardZone' | 'houseZone' | 'nearHouseZone', index: number) => {
        if (settings[zone].length <= 1) return;
        const newZoneSteps = [...settings[zone]];
        newZoneSteps.splice(index, 1);
        updateSettings({
            ...settings,
            [zone]: newZoneSteps
        });
    };

    const handleToggleType = (zone: 'guardZone' | 'houseZone' | 'nearHouseZone', stepIndex: number, type: MeasurementType) => {
        const newZoneSteps = [...settings[zone]];
        const step = { ...newZoneSteps[stepIndex] };

        if (step.types.includes(type)) {
            step.types = step.types.filter(t => t !== type);
        } else {
            step.types = [...step.types, type];
        }

        newZoneSteps[stepIndex] = step;
        updateSettings({
            ...settings,
            [zone]: newZoneSteps
        });
    };

    const renderStep = (step: MeasurementStep, index: number, zone: 'guardZone' | 'houseZone' | 'nearHouseZone') => {
        const getLabel = (type: MeasurementType) => {
            switch (type) {
                case 'closest-ring': return 'Ring';
                case 'guard': return 'Guard';
                case 't-line': return 'T-Line';
                case 'center-line': return 'Center';
                case 'stone-to-stone': return 'Stone to Stone';
                default: return type;
            }
        };

        return (
            <div key={step.id} className="flex items-center gap-3 mb-2">
                <div className="flex-grow flex gap-3 items-center p-3 bg-gray-50 rounded-xl">
                    <span className="font-bold text-gray-400 w-6">{index + 1}.</span>

                    <div className="flex gap-2">
                        {/* Render buttons for all available types in this zone */}
                        {ZONE_AVAILABLE_TYPES[zone].map((type) => (
                            <button
                                key={type}
                                onClick={() => handleToggleType(zone, index, type)}
                                className={`
                                    flex items-center justify-center w-10 h-10 rounded-full shadow-lg transition-all duration-200
                                    ${step.types.includes(type)
                                        ? 'bg-lavender-600 text-white hover:bg-lavender-700'
                                        : 'bg-white text-gray-500 hover:bg-gray-50 hover:text-lavender-600'
                                    }
                                `}
                                title={`Toggle ${getLabel(type)}`}
                            >
                                {getIcon(type)}
                            </button>
                        ))}
                    </div>
                </div>

                {settings[zone].length > 1 && (
                    <button
                        onClick={() => handleRemoveStep(zone, index)}
                        className="p-2 text-icy-black hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                        aria-label="Remove step"
                    >
                        <Trash2 size={16} />
                    </button>
                )}
            </div>
        );
    };

    return (
        <div className="h-full flex flex-col">
            {/* Sub-tabs */}
            <div className="flex gap-2 mb-4 shrink-0">
                <button
                    onClick={() => setMeasurementTab('cycles')}
                    className={`px-4 py-2 font-semibold text-sm transition-colors relative ${measurementTab === 'cycles'
                        ? 'text-lavender-700'
                        : 'text-gray-500 hover:text-gray-700'
                        }`}
                >
                    Cycles
                    {measurementTab === 'cycles' && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-lavender-700" />
                    )}
                </button>
                <button
                    onClick={() => setMeasurementTab('toggle')}
                    className={`px-4 py-2 font-semibold text-sm transition-colors relative ${measurementTab === 'toggle'
                        ? 'text-lavender-700'
                        : 'text-gray-500 hover:text-gray-700'
                        }`}
                >
                    Toggle Mode
                    {measurementTab === 'toggle' && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-lavender-700" />
                    )}
                </button>
                <button
                    onClick={() => setMeasurementTab('display')}
                    className={`px-4 py-2 font-semibold text-sm transition-colors relative ${measurementTab === 'display'
                        ? 'text-lavender-700'
                        : 'text-gray-500 hover:text-gray-700'
                        }`}
                >
                    Display
                    {measurementTab === 'display' && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-lavender-700" />
                    )}
                </button>
                <button
                    onClick={() => setMeasurementTab('zones')}
                    className={`px-4 py-2 font-semibold text-sm transition-colors relative ${measurementTab === 'zones'
                        ? 'text-lavender-700'
                        : 'text-gray-500 hover:text-gray-700'
                        }`}
                >
                    Zones Guide
                    {measurementTab === 'zones' && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-lavender-700" />
                    )}
                </button>
            </div>

            {/* Content Area */}
            <div className="flex-grow overflow-y-auto pr-2 pb-4">
                {measurementTab === 'cycles' && (
                    <div className="space-y-8">
                        {/* Icon Legend */}
                        <div className="bg-lavender-50 rounded-xl p-4">
                            <h3 className="font-semibold text-lavender-900 mb-3 text-sm">Measurement Icons</h3>
                            <div className="grid grid-cols-2 gap-3 text-xs">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm">
                                        {getIcon('guard')}
                                    </div>
                                    <span className="text-gray-700">Guard (Brace)</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm">
                                        {getIcon('closest-ring')}
                                    </div>
                                    <span className="text-gray-700">Closest Ring</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm">
                                        {getIcon('t-line')}
                                    </div>
                                    <span className="text-gray-700">T-Line (Horizontal)</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm">
                                        {getIcon('center-line')}
                                    </div>
                                    <span className="text-gray-700">Center Line (Vertical)</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm">
                                        {getIcon('stone-to-stone')}
                                    </div>
                                    <span className="text-gray-700">Stone to Stone</span>
                                </div>
                            </div>
                        </div>

                        {/* Guard Zone Section */}
                        <div className="space-y-4">
                            <h3 className="font-semibold text-gray-700 flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-lavender-500" />
                                Guard Zone
                            </h3>
                            {settings.guardZone.map((step, index) => renderStep(step, index, 'guardZone'))}
                            <button
                                onClick={() => handleAddStep('guardZone')}
                                className="mt-3 w-full min-h-[48px] py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 font-medium hover:border-lavender-500 hover:text-lavender-600 transition-colors flex items-center justify-center gap-2"
                            >
                                + Add Step
                            </button>

                            <h3 className="mt-8 font-semibold text-gray-700 flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-blue-500" />
                                Near House Zone (&lt; 1.5m from house)
                            </h3>
                            {settings.nearHouseZone.map((step, index) => renderStep(step, index, 'nearHouseZone'))}
                            <button
                                onClick={() => handleAddStep('nearHouseZone')}
                                className="mt-3 w-full min-h-[48px] py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 font-medium hover:border-lavender-500 hover:text-lavender-600 transition-colors flex items-center justify-center gap-2"
                            >
                                + Add Step
                            </button>

                            <h3 className="mt-8 font-semibold text-gray-700 flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-red-500" />
                                House Zone
                            </h3>
                            {settings.houseZone.map((step, index) => renderStep(step, index, 'houseZone'))}
                            <button
                                onClick={() => handleAddStep('houseZone')}
                                className="mt-3 w-full min-h-[48px] py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 font-medium hover:border-lavender-500 hover:text-lavender-600 transition-colors flex items-center justify-center gap-2"
                            >
                                + Add Step
                            </button>
                        </div>
                    </div>
                )}

                {
                    measurementTab === 'toggle' && (() => {
                        // Helper to get toggle setting key for a measurement type
                        const getToggleKey = (type: MeasurementType): string => {
                            switch (type) {
                                case 'guard': return 'showGuard';
                                case 't-line': return 'showTLine';
                                case 'center-line': return 'showCenterLine';
                                case 'closest-ring': return 'showClosestRing';
                                case 'stone-to-stone': return 'showStoneToStone';
                                default: return '';
                            }
                        };

                        // Helper to get label for a measurement type
                        const getToggleLabel = (type: MeasurementType): string => {
                            switch (type) {
                                case 'guard': return 'Show Guard Measurement';
                                case 't-line': return 'Show T-Line';
                                case 'center-line': return 'Show Center Line';
                                case 'closest-ring': return 'Show Closest Ring';
                                case 'stone-to-stone': return 'Show Stone to Stone';
                                default: return '';
                            }
                        };

                        // Helper to get setting value
                        const getToggleValue = (zone: 'guardZone' | 'nearHouseZone' | 'houseZone', type: MeasurementType): boolean => {
                            const key = getToggleKey(type);
                            const zoneSettings = toggleModeSettings[zone] as any;
                            return zoneSettings?.[key] ?? false;
                        };

                        // Render a toggle checkbox for a zone/type
                        const renderToggleCheckbox = (zone: 'guardZone' | 'nearHouseZone' | 'houseZone', type: MeasurementType) => (
                            <label key={type} className="flex items-center justify-between">
                                <span className="text-gray-600 flex items-center gap-2">
                                    {getIcon(type)}
                                    {getToggleLabel(type)}
                                </span>
                                <input
                                    type="checkbox"
                                    checked={getToggleValue(zone, type)}
                                    onChange={(e) => updateToggleModeSettings(zone, getToggleKey(type), e.target.checked)}
                                    className="w-5 h-5 rounded border-gray-300 text-lavender-600 focus:ring-lavender-500"
                                />
                            </label>
                        );

                        return (
                            <div className="space-y-6">
                                <p className="text-sm text-gray-600 mb-4">
                                    Configure which measurements are shown when the measurement toggle is ON (without selecting a stone).
                                </p>

                                <div className="bg-gray-50 p-4 rounded-xl">
                                    <h3 className="font-semibold text-gray-700 mb-3">Guard Zone Defaults</h3>
                                    <div className="space-y-3">
                                        {ZONE_AVAILABLE_TYPES.guardZone.map(type => renderToggleCheckbox('guardZone', type))}
                                    </div>
                                </div>

                                <div className="bg-gray-50 p-4 rounded-xl">
                                    <h3 className="font-semibold text-gray-700 mb-3">Near House Zone Defaults</h3>
                                    <div className="space-y-3">
                                        {ZONE_AVAILABLE_TYPES.nearHouseZone.map(type => renderToggleCheckbox('nearHouseZone', type))}
                                    </div>
                                </div>

                                <div className="bg-gray-50 p-4 rounded-xl">
                                    <h3 className="font-semibold text-gray-700 mb-3">House Zone Defaults</h3>
                                    <div className="space-y-3">
                                        {ZONE_AVAILABLE_TYPES.houseZone.map(type => renderToggleCheckbox('houseZone', type))}
                                    </div>
                                </div>
                            </div>
                        );
                    })()
                }

                {
                    measurementTab === 'display' && (
                        <div className="space-y-6">
                            <p className="text-sm text-gray-600 mb-4">
                                Choose which measurement details are visible on the canvas when measurements are active.
                            </p>

                            {/* Guard Measurements */}
                            <div className="bg-gray-50 p-4 rounded-xl">
                                <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                    {getIcon('guard')}
                                    Guard Measurements
                                </h3>
                                <div className="space-y-3">
                                    <label className="flex items-center justify-between cursor-pointer select-none">
                                        <span className="text-gray-600">Show Brace Line</span>
                                        <input
                                            type="checkbox"
                                            checked={displaySettings.guard.showBraceLine}
                                            onChange={(e) => updateDisplaySettings({
                                                ...displaySettings,
                                                guard: { ...displaySettings.guard, showBraceLine: e.target.checked }
                                            })}
                                            className="w-5 h-5 rounded border-gray-300 text-lavender-600 focus:ring-lavender-500"
                                        />
                                    </label>
                                    <label className="flex items-center justify-between cursor-pointer select-none">
                                        <span className="text-gray-600">Show Percentage</span>
                                        <input
                                            type="checkbox"
                                            checked={displaySettings.guard.showPercentage}
                                            onChange={(e) => updateDisplaySettings({
                                                ...displaySettings,
                                                guard: { ...displaySettings.guard, showPercentage: e.target.checked }
                                            })}
                                            className="w-5 h-5 rounded border-gray-300 text-lavender-600 focus:ring-lavender-500"
                                        />
                                    </label>
                                    <label className="flex items-center justify-between cursor-pointer select-none">
                                        <span className="text-gray-600">Show Distance (cm)</span>
                                        <input
                                            type="checkbox"
                                            checked={displaySettings.guard.showDistance}
                                            onChange={(e) => updateDisplaySettings({
                                                ...displaySettings,
                                                guard: { ...displaySettings.guard, showDistance: e.target.checked }
                                            })}
                                            className="w-5 h-5 rounded border-gray-300 text-lavender-600 focus:ring-lavender-500"
                                        />
                                    </label>
                                    <label className="flex items-center justify-between cursor-pointer select-none">
                                        <span className="text-gray-600">Show Broom Length (&gt; 1.5m)</span>
                                        <input
                                            type="checkbox"
                                            checked={displaySettings.guard.showBroomLength}
                                            onChange={(e) => updateDisplaySettings({
                                                ...displaySettings,
                                                guard: { ...displaySettings.guard, showBroomLength: e.target.checked }
                                            })}
                                            className="w-5 h-5 rounded border-gray-300 text-lavender-600 focus:ring-lavender-500"
                                        />
                                    </label>
                                </div>
                            </div>


                            {/* T-Line Measurements */}
                            <div className="bg-gray-50 p-4 rounded-xl">
                                <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                    {getIcon('t-line')}
                                    T-Line Measurements
                                </h3>
                                <div className="space-y-3">
                                    <label className="flex items-center justify-between cursor-pointer select-none">
                                        <span className="text-gray-600">Show Line</span>
                                        <input
                                            type="checkbox"
                                            checked={displaySettings.tLine.showLine}
                                            onChange={(e) => updateDisplaySettings({
                                                ...displaySettings,
                                                tLine: { ...displaySettings.tLine, showLine: e.target.checked }
                                            })}
                                            className="w-5 h-5 rounded border-gray-300 text-lavender-600 focus:ring-lavender-500"
                                        />
                                    </label>
                                    <label className="flex items-center justify-between cursor-pointer select-none">
                                        <span className="text-gray-600">Show Distance Label</span>
                                        <input
                                            type="checkbox"
                                            checked={displaySettings.tLine.showDistance}
                                            onChange={(e) => updateDisplaySettings({
                                                ...displaySettings,
                                                tLine: { ...displaySettings.tLine, showDistance: e.target.checked }
                                            })}
                                            className="w-5 h-5 rounded border-gray-300 text-lavender-600 focus:ring-lavender-500"
                                        />
                                    </label>
                                </div>
                            </div>


                            {/* Center Line Measurements */}
                            <div className="bg-gray-50 p-4 rounded-xl">
                                <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                    {getIcon('center-line')}
                                    Center Line Measurements
                                </h3>
                                <div className="space-y-3">
                                    <label className="flex items-center justify-between cursor-pointer select-none">
                                        <span className="text-gray-600">Show Line</span>
                                        <input
                                            type="checkbox"
                                            checked={displaySettings.centerLine.showLine}
                                            onChange={(e) => updateDisplaySettings({
                                                ...displaySettings,
                                                centerLine: { ...displaySettings.centerLine, showLine: e.target.checked }
                                            })}
                                            className="w-5 h-5 rounded border-gray-300 text-lavender-600 focus:ring-lavender-500"
                                        />
                                    </label>
                                    <label className="flex items-center justify-between cursor-pointer select-none">
                                        <span className="text-gray-600">Show Distance Label</span>
                                        <input
                                            type="checkbox"
                                            checked={displaySettings.centerLine.showDistance}
                                            onChange={(e) => updateDisplaySettings({
                                                ...displaySettings,
                                                centerLine: { ...displaySettings.centerLine, showDistance: e.target.checked }
                                            })}
                                            className="w-5 h-5 rounded border-gray-300 text-lavender-600 focus:ring-lavender-500"
                                        />
                                    </label>
                                </div>
                            </div>


                            {/* Closest Ring Measurements */}
                            <div className="bg-gray-50 p-4 rounded-xl">
                                <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                    {getIcon('closest-ring')}
                                    Closest Ring Measurements
                                </h3>
                                <div className="space-y-3">
                                    <label className="flex items-center justify-between cursor-pointer select-none">
                                        <span className="text-gray-600">Show Line</span>
                                        <input
                                            type="checkbox"
                                            checked={displaySettings.closestRing?.showLine ?? true}
                                            onChange={(e) => updateDisplaySettings({
                                                ...displaySettings,
                                                closestRing: {
                                                    showLine: e.target.checked,
                                                    showDistance: displaySettings.closestRing?.showDistance ?? true
                                                }
                                            })}
                                            className="w-5 h-5 rounded border-gray-300 text-lavender-600 focus:ring-lavender-500"
                                        />
                                    </label>
                                    <label className="flex items-center justify-between cursor-pointer select-none">
                                        <span className="text-gray-600">Show Distance Label</span>
                                        <input
                                            type="checkbox"
                                            checked={displaySettings.closestRing?.showDistance ?? true}
                                            onChange={(e) => updateDisplaySettings({
                                                ...displaySettings,
                                                closestRing: {
                                                    showLine: displaySettings.closestRing?.showLine ?? true,
                                                    showDistance: e.target.checked
                                                }
                                            })}
                                            className="w-5 h-5 rounded border-gray-300 text-lavender-600 focus:ring-lavender-500"
                                        />
                                    </label>
                                </div>
                            </div>

                            {/* Stone to Stone Measurements */}
                            <div className="bg-gray-50 p-4 rounded-xl">
                                <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                    {getIcon('stone-to-stone')}
                                    Stone to Stone Measurements
                                </h3>
                                <div className="space-y-3">
                                    <label className="flex items-center justify-between cursor-pointer select-none">
                                        <span className="text-gray-600">Show Line</span>
                                        <input
                                            type="checkbox"
                                            checked={displaySettings.stoneToStone?.showLine ?? true}
                                            onChange={(e) => updateDisplaySettings({
                                                ...displaySettings,
                                                stoneToStone: {
                                                    showLine: e.target.checked,
                                                    showDistance: displaySettings.stoneToStone?.showDistance ?? true
                                                }
                                            })}
                                            className="w-5 h-5 rounded border-gray-300 text-lavender-600 focus:ring-lavender-500"
                                        />
                                    </label>
                                    <label className="flex items-center justify-between cursor-pointer select-none">
                                        <span className="text-gray-600">Show Distance Label</span>
                                        <input
                                            type="checkbox"
                                            checked={displaySettings.stoneToStone?.showDistance ?? true}
                                            onChange={(e) => updateDisplaySettings({
                                                ...displaySettings,
                                                stoneToStone: {
                                                    showLine: displaySettings.stoneToStone?.showLine ?? true,
                                                    showDistance: e.target.checked
                                                }
                                            })}
                                            className="w-5 h-5 rounded border-gray-300 text-lavender-600 focus:ring-lavender-500"
                                        />
                                    </label>
                                </div>
                            </div>
                        </div>
                    )
                }

                {
                    measurementTab === 'zones' && (
                        <div className="h-full">
                            <ZonesDiagram />
                        </div>
                    )
                }
            </div >
        </div >
    );
};
