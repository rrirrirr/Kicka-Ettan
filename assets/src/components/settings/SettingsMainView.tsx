import React from 'react';
import { useSettings } from '../../contexts/SettingsContext';
import { Ruler, Grid, ChevronRight } from 'lucide-react';

interface SettingsMainViewProps {
    setView: (view: 'main' | 'measurements' | 'sheet' | 'smart-units') => void;
}

export const SettingsMainView: React.FC<SettingsMainViewProps> = ({ setView }) => {
    const { baseUnitSystem, unitSystem, updateUnitSystem, updateBaseUnitSystem } = useSettings();

    return (
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
                    onClick={() => updateBaseUnitSystem(baseUnitSystem === 'metric' ? 'imperial' : 'metric')}
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
                    <div className="w-10 h-10 rounded-full bg-lavender-100 text-lavender-600 flex items-center justify-center">
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
};
