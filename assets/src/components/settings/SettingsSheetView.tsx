import React from 'react';
import { useSettings } from '../../contexts/SettingsContext';
import { SheetStyleCarousel } from '../SheetStyleCarousel';

export const SettingsSheetView: React.FC = () => {
    const { sheetSettings, updateSheetSettings } = useSettings();

    return (
        <div className="space-y-6">
            <SheetStyleCarousel
                selectedStyleId={sheetSettings.styleId}
                onSelectStyle={(styleId) => updateSheetSettings({ ...sheetSettings, styleId })}
            />
        </div>
    );
};
