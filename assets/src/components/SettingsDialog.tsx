import React, { useState } from 'react';
import { Dialog } from './ui/Dialog';
import { ChevronLeft } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';
import { SettingsMainView } from './settings/SettingsMainView';
import { SettingsMeasurementsView } from './settings/SettingsMeasurementsView';
import { SettingsSheetView } from './settings/SettingsSheetView';
import { SettingsSmartUnitsView } from './settings/SettingsSmartUnitsView';

interface SettingsDialogProps { }

export const SettingsDialog: React.FC<SettingsDialogProps> = () => {
    const { isSettingsOpen, closeSettings } = useSettings();
    const [view, setView] = useState<'main' | 'measurements' | 'sheet' | 'smart-units'>('main');

    const handleClose = () => {
        closeSettings();
        setTimeout(() => setView('main'), 300); // Reset view after animation
    };

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
            onClose={handleClose}
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
                {view === 'main' && <SettingsMainView setView={setView} />}
                {view === 'measurements' && <SettingsMeasurementsView />}
                {view === 'sheet' && <SettingsSheetView />}
                {view === 'smart-units' && <SettingsSmartUnitsView />}
            </div>
        </Dialog>
    );
};
