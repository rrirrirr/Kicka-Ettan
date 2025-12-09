import React, { useState } from 'react';
import { Dialog } from './ui/Dialog';

import { DialogBackButton } from './ui/DialogBackButton';
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
            headerClassName="shrink-0 px-6 py-4 sm:py-6"
            backButton={view !== 'main' ? (
                <DialogBackButton onClick={() => setView('main')} />
            ) : undefined}
        >
            <div className="flex-grow overflow-y-auto px-6 pt-2 pb-6 sm:p-6">
                {view === 'main' && <SettingsMainView setView={setView} />}
                {view === 'measurements' && <SettingsMeasurementsView />}
                {view === 'sheet' && <SettingsSheetView />}
                {view === 'smart-units' && <SettingsSmartUnitsView />}
                {view === 'tutorials' && <SettingsTutorialsView />}
            </div>
        </Dialog>
    );
};
