import React from 'react';
import { useSettings } from '../../contexts/SettingsContext';
import { SheetStyleCarousel } from '../SheetStyleCarousel';
import { SHEET_WIDTH, HOG_LINE_OFFSET, BACK_LINE_OFFSET, STONE_RADIUS } from '../../utils/constants';

export const SettingsSheetView: React.FC = () => {
    const { sheetSettings, updateSheetSettings } = useSettings();

    return (
        <div className="space-y-6">
            <SheetStyleCarousel
                selectedStyleId={sheetSettings.styleId}
                onSelectStyle={(styleId) => updateSheetSettings({ ...sheetSettings, styleId })}
            />

            {/* Sheet Dimensions Info */}
            <div className="rounded-lg bg-gray-50 p-4 space-y-2">
                <h3 className="text-sm font-semibold text-gray-900">Sheet Dimensions</h3>
                <div className="text-sm text-gray-600 space-y-1">
                    <p>Width: {SHEET_WIDTH} cm (15 ft 7 in)</p>
                    <p>Length (Hog to Back): {HOG_LINE_OFFSET + BACK_LINE_OFFSET} cm (27 ft)</p>
                </div>

                <h3 className="text-sm font-semibold text-gray-900 pt-2">Stone Size</h3>
                <div className="text-sm text-gray-600">
                    <p>Diameter: {STONE_RADIUS * 2} cm (11.4 in)</p>
                </div>
            </div>
        </div>
    );
};
