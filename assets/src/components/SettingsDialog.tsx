import React, { useState } from 'react';
import { Dialog } from './ui/Dialog';
import { ChevronLeft } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';
import { SettingsMainView } from './settings/SettingsMainView';
import { SettingsMeasurementsView } from './settings/SettingsMeasurementsView';
import { SettingsSheetView } from './settings/SettingsSheetView';
import { SettingsSmartUnitsView } from './settings/SettingsSmartUnitsView';
import { SettingsTutorialsView } from './settings/SettingsTutorialsView';

interface SettingsDialogProps { }

export const SettingsDialog: React.FC<SettingsDialogProps> = () => {
    const { isSettingsOpen, closeSettings } = useSettings();
    const [view, setView] = useState<'main' | 'measurements' | 'sheet' | 'smart-units' | 'tutorials'>('main');

    const handleClose = () => {
        closeSettings();
        setTimeout(() => setView('main'), 300); // Reset view after animation
    };

    const handleEscape = () => {
        if (view !== 'main') {
            setView('main'); // Go back to main view
        } else {
            handleClose(); // Close the dialog
        }
    };

    const getTitle = () => {
        switch (view) {
            case 'measurements': return 'Measurements';
            case 'sheet': return 'Sheet Settings';
            case 'smart-units': return 'Smart Units Configuration';
            case 'tutorials': return 'Tutorials';
            default: return 'Settings';
        }
    };

    return (
        <Dialog
            isOpen={isSettingsOpen}
            onClose={handleClose}
            onEscape={handleEscape}
            title={getTitle()}
            fullScreen
            className="!p-0 overflow-hidden"
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
                {view === 'tutorials' && <SettingsTutorialsView />}
            </div>
        </Dialog>
    );
};
