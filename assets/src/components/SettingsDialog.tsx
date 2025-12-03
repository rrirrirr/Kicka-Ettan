import React, { useState, useEffect } from 'react';
import { Dialog } from './ui/Dialog';
import { useSettings, MeasurementStep, MeasurementType } from '../contexts/SettingsContext';
import { Trash2, Target, Shield, ChevronRight, ChevronLeft, Ruler, Grid, ArrowLeftRight } from 'lucide-react';
import { SheetStyleCarousel } from './SheetStyleCarousel';
import { ZonesDiagram } from './ZonesDiagram';

type View = 'main' | 'measurements' | 'sheet' | 'smart-units';
type MeasurementTab = 'cycles' | 'toggle' | 'display' | 'zones';

export const SettingsDialog: React.FC = () => {
    const { isSettingsOpen, closeSettings, settings, displaySettings, toggleModeSettings, sheetSettings, updateSettings, updateDisplaySettings, updateToggleModeSettings, updateSheetSettings, unitSystem, baseUnitSystem, updateUnitSystem, smartUnits, updateSmartUnits } = useSettings();
    const [view, setView] = useState<View>('main');
    const [measurementTab, setMeasurementTab] = useState<MeasurementTab>('cycles');

    // Handle Escape key to go back or close
    useEffect(() => {
        if (!isSettingsOpen) return;

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                if (view !== 'main') {
                    // Go back to main view
                    setView('main');
                } else {
                    // Close the dialog
                    closeSettings();
                }
            }
        };

        document.addEventListener('keydown', handleEscape);
        return () => {
            document.removeEventListener('keydown', handleEscape);
        };
    }, [isSettingsOpen, view, closeSettings]);

    const getIcon = (type: MeasurementType) => {
        switch (type) {
            case 'closest-ring': return <Target size={16} />;
            case 'guard': return <Shield size={16} />;
            case 't-line': return <span className="text-xl font-bold">T</span>; // T-line icon
            case 'center-line': return <span className="text-xl font-bold">│</span>; // Thicker vertical line
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
            <div key={step.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl mb-2">
                <div className="flex-grow flex gap-3 items-center">
                    <span className="font-bold text-gray-400 w-6">{index + 1}.</span>

                    <div className="flex gap-2">
                        {/* Guard Measurements Button */}
                        {zone === 'guardZone' && (
                            <button
                                onClick={() => handleToggleType(zone, index, 'guard')}
                                className={`
                                    flex items-center justify-center w-10 h-10 rounded-full shadow-lg transition-all duration-200
                                    ${step.types.includes('guard')
                                        ? 'bg-lavender-600 text-white hover:bg-lavender-700'
                                        : 'bg-white text-gray-500 hover:bg-gray-50 hover:text-lavender-600'
                                    }
                                `}
                                title={`Toggle ${getLabel('guard')}`}
                            >
                                {getIcon('guard')}
                            </button>
                        )}

                        {/* T-Line Measurements Button */}
                        <button
                            onClick={() => handleToggleType(zone, index, 't-line')}
                            className={`
                                flex items-center justify-center w-10 h-10 rounded-full shadow-lg transition-all duration-200
                                ${step.types.includes('t-line')
                                    ? 'bg-lavender-600 text-white hover:bg-lavender-700'
                                    : 'bg-white text-gray-500 hover:bg-gray-50 hover:text-lavender-600'
                                }
                            `}
                            title={`Toggle ${getLabel('t-line')}`}
                        >
                            {getIcon('t-line')}
                        </button>

                        {/* Center Line Measurements Button */}
                        <button
                            onClick={() => handleToggleType(zone, index, 'center-line')}
                            className={`
                                flex items-center justify-center w-10 h-10 rounded-full shadow-lg transition-all duration-200
                                ${step.types.includes('center-line')
                                    ? 'bg-lavender-600 text-white hover:bg-lavender-700'
                                    : 'bg-white text-gray-500 hover:bg-gray-50 hover:text-lavender-600'
                                }
                            `}
                            title={`Toggle ${getLabel('center-line')}`}
                        >
                            {getIcon('center-line')}
                        </button>

                        {/* Stone to Stone Measurements Button */}
                        <button
                            onClick={() => handleToggleType(zone, index, 'stone-to-stone')}
                            className={`
                                flex items-center justify-center w-10 h-10 rounded-full shadow-lg transition-all duration-200
                                ${step.types.includes('stone-to-stone')
                                    ? 'bg-lavender-600 text-white hover:bg-lavender-700'
                                    : 'bg-white text-gray-500 hover:bg-gray-50 hover:text-lavender-600'
                                }
                            `}
                            title={`Toggle ${getLabel('stone-to-stone')}`}
                        >
                            {getIcon('stone-to-stone')}
                        </button>

                        {/* Closest Ring Measurements Button */}
                        {(zone === 'houseZone' || zone === 'nearHouseZone') && (
                            <button
                                onClick={() => handleToggleType(zone, index, 'closest-ring')}
                                className={`
                                    flex items-center justify-center w-10 h-10 rounded-full shadow-lg transition-all duration-200
                                    ${step.types.includes('closest-ring')
                                        ? 'bg-lavender-600 text-white hover:bg-lavender-700'
                                        : 'bg-white text-gray-500 hover:bg-gray-50 hover:text-lavender-600'
                                    }
                                `}
                                title={`Toggle ${getLabel('closest-ring')}`}
                            >
                                {getIcon('closest-ring')}
                            </button>
                        )}
                    </div>
                </div>

                {settings[zone].length > 1 && (
                    <button
                        onClick={() => handleRemoveStep(zone, index)}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        aria-label="Remove step"
                    >
                        <Trash2 size={16} />
                    </button>
                )}
            </div>
        );
    };

    const renderMainView = () => (
        <div className="space-y-4">
            {/* Unit System Toggle */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl min-h-[72px]">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-lavender-100 text-lavender-600 flex items-center justify-center">
                        <span className="font-bold text-sm">{baseUnitSystem === 'metric' ? 'CM' : 'IN'}</span>
                    </div>
                    <div className="text-left">
                        <h3 className="text-lg font-bold text-icy-black">Unit System <span className="font-normal">({baseUnitSystem.charAt(0).toUpperCase() + baseUnitSystem.slice(1)})</span></h3>
                    </div>
                </div>
                <button
                    onClick={() => updateUnitSystem(baseUnitSystem === 'metric' ? 'imperial' : 'metric')}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-lavender-500 focus:ring-offset-2 ${baseUnitSystem === 'imperial' ? 'bg-lavender-600' : 'bg-gray-200'
                        }`}
                >
                    <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${baseUnitSystem === 'imperial' ? 'translate-x-6' : 'translate-x-1'
                            }`}
                    />
                </button>
            </div>

            {/* Smart Units Toggle */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl min-h-[72px]">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center">
                        <span className="font-bold text-lg">🧠</span>
                    </div>
                    <div className="text-left">
                        <h3 className="text-lg font-bold text-icy-black">Smart Units</h3>
                    </div>
                </div>
                <div className="flex items-center gap-3 min-w-[140px] justify-end">
                    <div className="w-[75px]">
                        {unitSystem === 'smart' && (
                            <button
                                onClick={() => setView('smart-units')}
                                className="text-sm text-lavender-600 font-medium hover:text-lavender-700"
                            >
                                Configure
                            </button>
                        )}
                    </div>
                    <button
                        onClick={() => updateUnitSystem(unitSystem === 'smart' ? baseUnitSystem : 'smart')}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-lavender-500 focus:ring-offset-2 ${unitSystem === 'smart' ? 'bg-lavender-600' : 'bg-gray-200'
                            }`}
                    >
                        <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${unitSystem === 'smart' ? 'translate-x-6' : 'translate-x-1'
                                }`}
                        />
                    </button>
                </div>
            </div>

            <button
                onClick={() => setView('measurements')}
                className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors group min-h-[72px]"
            >
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-lavender-100 text-lavender-600 flex items-center justify-center group-hover:bg-lavender-200 transition-colors">
                        <Ruler size={20} />
                    </div>
                    <div className="text-left">
                        <h3 className="text-lg font-bold text-icy-black">Measurements</h3>
                    </div>
                </div>
                <ChevronRight className="text-gray-400 group-hover:text-gray-600" />
            </button>

            <button
                onClick={() => setView('sheet')}
                className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors group min-h-[72px]"
            >
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                        <Grid size={20} />
                    </div>
                    <div className="text-left">
                        <h3 className="text-lg font-bold text-icy-black">Sheet</h3>
                    </div>
                </div>
                <ChevronRight className="text-gray-400 group-hover:text-gray-600" />
            </button>
        </div>
    );

    const renderMeasurementsView = () => (
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
                                className="text-sm text-lavender-600 font-medium hover:text-lavender-700 flex items-center gap-1"
                            >
                                + Add Step
                            </button>


                            <h3 className="font-semibold text-gray-700 flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-blue-500" />
                                Near House Zone (&lt; 1.5m from house)
                            </h3>
                            {settings.nearHouseZone.map((step, index) => renderStep(step, index, 'nearHouseZone'))}
                            <button
                                onClick={() => handleAddStep('nearHouseZone')}
                                className="text-sm text-lavender-600 font-medium hover:text-lavender-700 flex items-center gap-1"
                            >
                                + Add Step
                            </button>


                            <h3 className="font-semibold text-gray-700 flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-red-500" />
                                House Zone
                            </h3>
                            {settings.houseZone.map((step, index) => renderStep(step, index, 'houseZone'))}
                            <button
                                onClick={() => handleAddStep('houseZone')}
                                className="text-sm text-lavender-600 font-medium hover:text-lavender-700 flex items-center gap-1"
                            >
                                + Add Step
                            </button>
                        </div>
                    </div>
                )}

                {measurementTab === 'toggle' && (
                    <div className="space-y-6">
                        <p className="text-sm text-gray-600 mb-4">
                            Configure which measurements are shown when the measurement toggle is ON (without selecting a stone).
                        </p>

                        <div className="bg-gray-50 p-4 rounded-xl">
                            <h3 className="font-semibold text-gray-700 mb-3">Guard Zone Defaults</h3>
                            <div className="space-y-3">
                                <label className="flex items-center justify-between">
                                    <span className="text-gray-600 flex items-center gap-2">
                                        {getIcon('guard')}
                                        Show Guard Measurement
                                    </span>
                                    <input
                                        type="checkbox"
                                        checked={toggleModeSettings.guardZone.showGuard}
                                        onChange={(e) => updateToggleModeSettings('guardZone', 'showGuard', e.target.checked)}
                                        className="w-5 h-5 rounded border-gray-300 text-lavender-600 focus:ring-lavender-500"
                                    />
                                </label>
                                <label className="flex items-center justify-between">
                                    <span className="text-gray-600 flex items-center gap-2">
                                        {getIcon('t-line')}
                                        Show T-Line
                                    </span>
                                    <input
                                        type="checkbox"
                                        checked={toggleModeSettings.guardZone.showTLine}
                                        onChange={(e) => updateToggleModeSettings('guardZone', 'showTLine', e.target.checked)}
                                        className="w-5 h-5 rounded border-gray-300 text-lavender-600 focus:ring-lavender-500"
                                    />
                                </label>
                                <label className="flex items-center justify-between">
                                    <span className="text-gray-600 flex items-center gap-2">
                                        {getIcon('center-line')}
                                        Show Center Line
                                    </span>
                                    <input
                                        type="checkbox"
                                        checked={toggleModeSettings.guardZone.showCenterLine}
                                        onChange={(e) => updateToggleModeSettings('guardZone', 'showCenterLine', e.target.checked)}
                                        className="w-5 h-5 rounded border-gray-300 text-lavender-600 focus:ring-lavender-500"
                                    />
                                </label>
                            </div>
                        </div>

                        <div className="bg-gray-50 p-4 rounded-xl">
                            <h3 className="font-semibold text-gray-700 mb-3">Near House Zone Defaults</h3>
                            <div className="space-y-3">
                                <label className="flex items-center justify-between">
                                    <span className="text-gray-600 flex items-center gap-2">
                                        {getIcon('closest-ring')}
                                        Show Closest Ring
                                    </span>
                                    <input
                                        type="checkbox"
                                        checked={toggleModeSettings.nearHouseZone?.showClosestRing ?? true}
                                        onChange={(e) => updateToggleModeSettings('nearHouseZone', 'showClosestRing', e.target.checked)}
                                        className="w-5 h-5 rounded border-gray-300 text-lavender-600 focus:ring-lavender-500"
                                    />
                                </label>
                                <label className="flex items-center justify-between">
                                    <span className="text-gray-600 flex items-center gap-2">
                                        {getIcon('t-line')}
                                        Show T-Line
                                    </span>
                                    <input
                                        type="checkbox"
                                        checked={toggleModeSettings.nearHouseZone?.showTLine ?? false}
                                        onChange={(e) => updateToggleModeSettings('nearHouseZone', 'showTLine', e.target.checked)}
                                        className="w-5 h-5 rounded border-gray-300 text-lavender-600 focus:ring-lavender-500"
                                    />
                                </label>
                                <label className="flex items-center justify-between">
                                    <span className="text-gray-600 flex items-center gap-2">
                                        {getIcon('center-line')}
                                        Show Center Line
                                    </span>
                                    <input
                                        type="checkbox"
                                        checked={toggleModeSettings.nearHouseZone?.showCenterLine ?? false}
                                        onChange={(e) => updateToggleModeSettings('nearHouseZone', 'showCenterLine', e.target.checked)}
                                        className="w-5 h-5 rounded border-gray-300 text-lavender-600 focus:ring-lavender-500"
                                    />
                                </label>
                            </div>
                        </div>

                        <div className="bg-gray-50 p-4 rounded-xl">
                            <h3 className="font-semibold text-gray-700 mb-3">House Zone Defaults</h3>
                            <div className="space-y-3">
                                <label className="flex items-center justify-between">
                                    <span className="text-gray-600 flex items-center gap-2">
                                        {getIcon('closest-ring')}
                                        Show Closest Ring
                                    </span>
                                    <input
                                        type="checkbox"
                                        checked={toggleModeSettings.houseZone.showClosestRing ?? true}
                                        onChange={(e) => updateToggleModeSettings('houseZone', 'showClosestRing', e.target.checked)}
                                        className="w-5 h-5 rounded border-gray-300 text-lavender-600 focus:ring-lavender-500"
                                    />
                                </label>
                                <label className="flex items-center justify-between">
                                    <span className="text-gray-600 flex items-center gap-2">
                                        {getIcon('t-line')}
                                        Show T-Line
                                    </span>
                                    <input
                                        type="checkbox"
                                        checked={toggleModeSettings.houseZone.showTLine}
                                        onChange={(e) => updateToggleModeSettings('houseZone', 'showTLine', e.target.checked)}
                                        className="w-5 h-5 rounded border-gray-300 text-lavender-600 focus:ring-lavender-500"
                                    />
                                </label>
                                <label className="flex items-center justify-between">
                                    <span className="text-gray-600 flex items-center gap-2">
                                        {getIcon('center-line')}
                                        Show Center Line
                                    </span>
                                    <input
                                        type="checkbox"
                                        checked={toggleModeSettings.houseZone.showCenterLine}
                                        onChange={(e) => updateToggleModeSettings('houseZone', 'showCenterLine', e.target.checked)}
                                        className="w-5 h-5 rounded border-gray-300 text-lavender-600 focus:ring-lavender-500"
                                    />
                                </label>
                            </div>
                        </div>
                    </div>
                )}

                {measurementTab === 'display' && (
                    <div className="space-y-6">
                        {/* Guard Measurements */}
                        <div>
                            <h3 className="text-lg font-bold text-icy-black mb-4 flex items-center gap-2">
                                {getIcon('guard')}
                                Guard Measurements
                            </h3>
                            <div className="space-y-3 pl-2">
                                <label className="flex items-center gap-2 cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        checked={displaySettings.guard.showBraceLine}
                                        onChange={(e) => updateDisplaySettings({
                                            ...displaySettings,
                                            guard: { ...displaySettings.guard, showBraceLine: e.target.checked }
                                        })}
                                        className="w-4 h-4 rounded border-gray-300 text-lavender-600 focus:ring-lavender-500"
                                    />
                                    <span className="text-sm text-gray-700">Show Brace Line</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        checked={displaySettings.guard.showPercentage}
                                        onChange={(e) => updateDisplaySettings({
                                            ...displaySettings,
                                            guard: { ...displaySettings.guard, showPercentage: e.target.checked }
                                        })}
                                        className="w-4 h-4 rounded border-gray-300 text-lavender-600 focus:ring-lavender-500"
                                    />
                                    <span className="text-sm text-gray-700">Show Percentage</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        checked={displaySettings.guard.showDistance}
                                        onChange={(e) => updateDisplaySettings({
                                            ...displaySettings,
                                            guard: { ...displaySettings.guard, showDistance: e.target.checked }
                                        })}
                                        className="w-4 h-4 rounded border-gray-300 text-lavender-600 focus:ring-lavender-500"
                                    />
                                    <span className="text-sm text-gray-700">Show Distance (cm)</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        checked={displaySettings.guard.showBroomLength}
                                        onChange={(e) => updateDisplaySettings({
                                            ...displaySettings,
                                            guard: { ...displaySettings.guard, showBroomLength: e.target.checked }
                                        })}
                                        className="w-4 h-4 rounded border-gray-300 text-lavender-600 focus:ring-lavender-500"
                                    />
                                    <span className="text-sm text-gray-700">Show Broom Length (for distances &gt; 1.5m)</span>
                                </label>
                            </div>
                        </div>


                        {/* T-Line Measurements */}
                        <div>
                            <h3 className="text-lg font-bold text-icy-black mb-4 flex items-center gap-2">
                                {getIcon('t-line')}
                                T-Line Measurements
                            </h3>
                            <div className="space-y-3 pl-2">
                                <label className="flex items-center gap-2 cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        checked={displaySettings.tLine.showLine}
                                        onChange={(e) => updateDisplaySettings({
                                            ...displaySettings,
                                            tLine: { ...displaySettings.tLine, showLine: e.target.checked }
                                        })}
                                        className="w-4 h-4 rounded border-gray-300 text-lavender-600 focus:ring-lavender-500"
                                    />
                                    <span className="text-sm text-gray-700">Show Line</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        checked={displaySettings.tLine.showDistance}
                                        onChange={(e) => updateDisplaySettings({
                                            ...displaySettings,
                                            tLine: { ...displaySettings.tLine, showDistance: e.target.checked }
                                        })}
                                        className="w-4 h-4 rounded border-gray-300 text-lavender-600 focus:ring-lavender-500"
                                    />
                                    <span className="text-sm text-gray-700">Show Distance Label</span>
                                </label>
                            </div>
                        </div>


                        {/* Center Line Measurements */}
                        <div>
                            <h3 className="text-lg font-bold text-icy-black mb-4 flex items-center gap-2">
                                {getIcon('center-line')}
                                Center Line Measurements
                            </h3>
                            <div className="space-y-3 pl-2">
                                <label className="flex items-center gap-2 cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        checked={displaySettings.centerLine.showLine}
                                        onChange={(e) => updateDisplaySettings({
                                            ...displaySettings,
                                            centerLine: { ...displaySettings.centerLine, showLine: e.target.checked }
                                        })}
                                        className="w-4 h-4 rounded border-gray-300 text-lavender-600 focus:ring-lavender-500"
                                    />
                                    <span className="text-sm text-gray-700">Show Line</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        checked={displaySettings.centerLine.showDistance}
                                        onChange={(e) => updateDisplaySettings({
                                            ...displaySettings,
                                            centerLine: { ...displaySettings.centerLine, showDistance: e.target.checked }
                                        })}
                                        className="w-4 h-4 rounded border-gray-300 text-lavender-600 focus:ring-lavender-500"
                                    />
                                    <span className="text-sm text-gray-700">Show Distance Label</span>
                                </label>
                            </div>
                        </div>


                        {/* Closest Ring Measurements */}
                        <div>
                            <h3 className="text-lg font-bold text-icy-black mb-4 flex items-center gap-2">
                                {getIcon('closest-ring')}
                                Closest Ring Measurements
                            </h3>
                            <div className="space-y-3 pl-2">
                                <label className="flex items-center gap-2 cursor-pointer select-none">
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
                                        className="w-4 h-4 rounded border-gray-300 text-lavender-600 focus:ring-lavender-500"
                                    />
                                    <span className="text-sm text-gray-700">Show Line</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer select-none">
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
                                        className="w-4 h-4 rounded border-gray-300 text-lavender-600 focus:ring-lavender-500"
                                    />
                                    <span className="text-sm text-gray-700">Show Distance Label</span>
                                </label>
                            </div>
                        </div>

                        {/* Stone to Stone Measurements */}
                        <div>
                            <h3 className="text-lg font-bold text-icy-black mb-4 flex items-center gap-2">
                                {getIcon('stone-to-stone')}
                                Stone to Stone Measurements
                            </h3>
                            <div className="space-y-3 pl-2">
                                <label className="flex items-center gap-2 cursor-pointer select-none">
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
                                        className="w-4 h-4 rounded border-gray-300 text-lavender-600 focus:ring-lavender-500"
                                    />
                                    <span className="text-sm text-gray-700">Show Line</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer select-none">
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
                                        className="w-4 h-4 rounded border-gray-300 text-lavender-600 focus:ring-lavender-500"
                                    />
                                    <span className="text-sm text-gray-700">Show Distance Label</span>
                                </label>
                            </div>
                        </div>
                    </div>
                )}

                {measurementTab === 'zones' && (
                    <div className="h-full">
                        <ZonesDiagram />
                    </div>
                )}
            </div>
        </div>
    );

    const renderSheetView = () => (
        <div className="space-y-6">
            <SheetStyleCarousel
                selectedStyleId={sheetSettings.styleId}
                onSelectStyle={(styleId) => updateSheetSettings({ ...sheetSettings, styleId })}
            />


        </div>
    );

    const renderSmartUnitsView = () => (
        <div className="space-y-6">
            <p className="text-sm text-gray-600">
                Define distance ranges and the units to use for each range. Rules are applied in order.
            </p>

            <div className="space-y-3">
                {smartUnits.map((rule, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                        <div className="flex-grow grid grid-cols-2 gap-4 items-center">
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-500">Up to</span>
                                <input
                                    type="number"
                                    value={rule.maxDistance === Infinity ? '' : rule.maxDistance}
                                    placeholder="∞"
                                    onChange={(e) => {
                                        const val = e.target.value ? parseFloat(e.target.value) : Infinity;
                                        const newRules = [...smartUnits];
                                        newRules[index] = { ...rule, maxDistance: val };
                                        updateSmartUnits(newRules);
                                    }}
                                    className="w-24 px-2 py-1 rounded border-gray-300 text-sm"
                                />
                                <span className="text-sm text-gray-500">cm</span>
                            </div>
                            <select
                                value={rule.unit}
                                onChange={(e) => {
                                    const newRules = [...smartUnits];
                                    newRules[index] = { ...rule, unit: e.target.value as any };
                                    updateSmartUnits(newRules);
                                }}
                                className="px-2 py-1 rounded border-gray-300 text-sm"
                            >
                                <option value="metric">Metric (cm)</option>
                                <option value="imperial">Imperial (in)</option>
                                <option value="stone">Stone Widths</option>
                                <option value="broom">Broom Lengths</option>
                            </select>
                        </div>
                        <button
                            onClick={() => {
                                const newRules = [...smartUnits];
                                newRules.splice(index, 1);
                                updateSmartUnits(newRules);
                            }}
                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
                ))}
            </div>

            <button
                onClick={() => updateSmartUnits([...smartUnits, { maxDistance: 100, unit: 'metric' }])}
                className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 font-medium hover:border-lavender-500 hover:text-lavender-600 transition-colors flex items-center justify-center gap-2"
            >
                + Add Rule
            </button>
        </div>
    );



    const getTitle = () => {
        switch (view) {
            case 'measurements': return 'Measurements';
            case 'sheet': return 'Sheet Settings';
            case 'smart-units': return 'Smart Units Configuration';
            default: return 'Settings';
        }
    };

    return (
        <Dialog
            isOpen={isSettingsOpen}
            onClose={closeSettings}
            title={getTitle()}
            className="w-full h-full md:h-[85vh] md:max-w-4xl md:w-full md:rounded-2xl fixed inset-0 md:relative md:inset-auto flex flex-col !p-0 overflow-hidden"
            headerClassName="shrink-0 px-6 py-6"
            backButton={view !== 'main' ? (
                <button
                    onClick={() => setView('main')}
                    className="p-2 -ml-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100 transition-colors"
                >
                    <ChevronLeft size={24} />
                </button>
            ) : undefined}
        >
            <div className="flex-grow overflow-y-auto p-6">
                {view === 'main' && renderMainView()}
                {view === 'measurements' && renderMeasurementsView()}
                {view === 'sheet' && renderSheetView()}
                {view === 'smart-units' && renderSmartUnitsView()}
            </div>
        </Dialog>
    );
};
