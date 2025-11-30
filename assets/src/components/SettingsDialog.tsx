import React, { useState } from 'react';
import { Dialog } from './ui/Dialog';
import { useSettings, MeasurementStep, MeasurementType } from '../contexts/SettingsContext';
import { Plus, Trash2, Target, Shield, AlignCenterVertical, AlignCenterHorizontal } from 'lucide-react';

export const SettingsDialog: React.FC = () => {
    const { isSettingsOpen, closeSettings, settings, displaySettings, toggleModeSettings, updateSettings, updateDisplaySettings, updateToggleModeSettings } = useSettings();
    const [activeTab, setActiveTab] = useState<'cycles' | 'display' | 'toggle'>('cycles');

    const getIcon = (type: MeasurementType) => {
        switch (type) {
            case 'closest-ring': return <Target size={16} />;
            case 'guard': return <Shield size={16} />;
            case 't-line': return <AlignCenterVertical size={16} className="rotate-90" />;
            case 'center-line': return <AlignCenterHorizontal size={16} className="rotate-90" />;
            default: return null;
        }
    };

    const handleAddStep = (zone: 'guardZone' | 'houseZone') => {
        const newStep: MeasurementStep = {
            id: Math.random().toString(36).substr(2, 9),
            types: zone === 'guardZone' ? ['guard'] : ['t-line', 'center-line']
        };
        updateSettings({
            ...settings,
            [zone]: [...settings[zone], newStep]
        });
    };

    const handleRemoveStep = (zone: 'guardZone' | 'houseZone', index: number) => {
        if (settings[zone].length <= 1) return;
        const newZoneSteps = [...settings[zone]];
        newZoneSteps.splice(index, 1);
        updateSettings({
            ...settings,
            [zone]: newZoneSteps
        });
    };

    const handleToggleType = (zone: 'guardZone' | 'houseZone', stepIndex: number, type: MeasurementType) => {
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
                default: return type;
            }
        };

        return (
            <div key={step.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl border border-gray-100 mb-2">
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
                                        ? 'bg-purple-600 text-white hover:bg-purple-700'
                                        : 'bg-white text-gray-500 hover:bg-gray-50 hover:text-purple-600'
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
                                    ? 'bg-purple-600 text-white hover:bg-purple-700'
                                    : 'bg-white text-gray-500 hover:bg-gray-50 hover:text-purple-600'
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
                                    ? 'bg-purple-600 text-white hover:bg-purple-700'
                                    : 'bg-white text-gray-500 hover:bg-gray-50 hover:text-purple-600'
                                }
                            `}
                            title={`Toggle ${getLabel('center-line')}`}
                        >
                            {getIcon('center-line')}
                        </button>

                        {/* Closest Ring Measurements Button */}
                        {zone === 'houseZone' && (
                            <button
                                onClick={() => handleToggleType(zone, index, 'closest-ring')}
                                className={`
                                    flex items-center justify-center w-10 h-10 rounded-full shadow-lg transition-all duration-200
                                    ${step.types.includes('closest-ring')
                                        ? 'bg-purple-600 text-white hover:bg-purple-700'
                                        : 'bg-white text-gray-500 hover:bg-gray-50 hover:text-purple-600'
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

    return (
        <Dialog
            isOpen={isSettingsOpen}
            onClose={closeSettings}
            title="measurement settings"
            className="max-w-2xl"
        >
            {/* Tab Navigation */}
            <div className="flex gap-2 mb-6 border-b border-gray-200">
                <button
                    onClick={() => setActiveTab('cycles')}
                    className={`px-4 py-2 font-semibold text-sm transition-colors relative ${activeTab === 'cycles'
                        ? 'text-purple-700'
                        : 'text-gray-500 hover:text-gray-700'
                        }`}
                >
                    Cycle Settings
                    {activeTab === 'cycles' && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-700" />
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('toggle')}
                    className={`px-4 py-2 font-semibold text-sm transition-colors relative ${activeTab === 'toggle'
                        ? 'text-purple-700'
                        : 'text-gray-500 hover:text-gray-700'
                        }`}
                >
                    Toggle Mode
                    {activeTab === 'toggle' && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-700" />
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('display')}
                    className={`px-4 py-2 font-semibold text-sm transition-colors relative ${activeTab === 'display'
                        ? 'text-purple-700'
                        : 'text-gray-500 hover:text-gray-700'
                        }`}
                >
                    Display Settings
                    {activeTab === 'display' && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-700" />
                    )}
                </button>
            </div>

            {/* Tab Content */}
            {activeTab === 'cycles' && (
                <div className="space-y-8 max-h-[70vh] overflow-y-auto pr-2">
                    {/* Icon Legend */}
                    <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                        <h3 className="font-semibold text-purple-900 mb-3 text-sm">Measurement Icons</h3>
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
                        </div>
                    </div>

                    {/* Guard Zone Section */}

                    <div className="space-y-4">
                        <h3 className="font-semibold text-gray-700 flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-purple-500" />
                            Guard Zone
                        </h3>
                        {settings.guardZone.map((step, index) => renderStep(step, index, 'guardZone'))}
                        <button
                            onClick={() => handleAddStep('guardZone')}
                            className="text-sm text-purple-600 font-medium hover:text-purple-700 flex items-center gap-1"
                        >
                            + Add Step
                        </button>

                        <div className="h-px bg-gray-200 my-4" />

                        <h3 className="font-semibold text-gray-700 flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-blue-500" />
                            Near House Zone (&lt; 2ft from house)
                        </h3>
                        {settings.nearHouseZone.map((step, index) => renderStep(step, index, 'nearHouseZone'))}
                        <button
                            onClick={() => handleAddStep('nearHouseZone')}
                            className="text-sm text-purple-600 font-medium hover:text-purple-700 flex items-center gap-1"
                        >
                            + Add Step
                        </button>

                        <div className="h-px bg-gray-200 my-4" />

                        <h3 className="font-semibold text-gray-700 flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-red-500" />
                            House Zone
                        </h3>
                        {settings.houseZone.map((step, index) => renderStep(step, index, 'houseZone'))}
                        <button
                            onClick={() => handleAddStep('houseZone')}
                            className="text-sm text-purple-600 font-medium hover:text-purple-700 flex items-center gap-1"
                        >
                            + Add Step
                        </button>
                    </div>
                </div>
            )}

            {activeTab === 'toggle' && (
                <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
                    <p className="text-sm text-gray-600 mb-4">
                        Configure which measurements are shown when the measurement toggle is ON (without selecting a stone).
                    </p>

                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
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
                                    className="w-5 h-5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
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
                                    className="w-5 h-5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
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
                                    className="w-5 h-5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                                />
                            </label>
                        </div>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
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
                                    className="w-5 h-5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
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
                                    className="w-5 h-5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
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
                                    className="w-5 h-5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                                />
                            </label>
                        </div>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
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
                                    className="w-5 h-5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
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
                                    className="w-5 h-5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
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
                                    className="w-5 h-5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                                />
                            </label>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'display' && (
                <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
                    {/* Guard Measurements */}
                    <div>
                        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
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
                                    className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
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
                                    className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
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
                                    className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                                />
                                <span className="text-sm text-gray-700">Show Distance (cm)</span>
                            </label>
                        </div>
                    </div>

                    <div className="h-px bg-gray-200" />

                    {/* T-Line Measurements */}
                    <div>
                        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
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
                                    className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
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
                                    className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                                />
                                <span className="text-sm text-gray-700">Show Distance Label</span>
                            </label>
                        </div>
                    </div>

                    <div className="h-px bg-gray-200" />

                    {/* Center Line Measurements */}
                    <div>
                        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
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
                                    className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
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
                                    className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                                />
                                <span className="text-sm text-gray-700">Show Distance Label</span>
                            </label>
                        </div>
                    </div>

                    <div className="h-px bg-gray-200" />

                    {/* Closest Ring Measurements */}
                    <div>
                        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                            {getIcon('closest-ring')}
                            Closest Ring Measurements
                        </h3>
                        <div className="space-y-3 pl-2">
                            <label className="flex items-center gap-2 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={displaySettings.closestRing.showLine}
                                    onChange={(e) => updateDisplaySettings({
                                        ...displaySettings,
                                        closestRing: { ...displaySettings.closestRing, showLine: e.target.checked }
                                    })}
                                    className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                                />
                                <span className="text-sm text-gray-700">Show Line</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={displaySettings.closestRing.showDistance}
                                    onChange={(e) => updateDisplaySettings({
                                        ...displaySettings,
                                        closestRing: { ...displaySettings.closestRing, showDistance: e.target.checked }
                                    })}
                                    className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                                />
                                <span className="text-sm text-gray-700">Show Distance Label</span>
                            </label>
                        </div>
                    </div>
                </div>
            )}
        </Dialog>
    );
};
