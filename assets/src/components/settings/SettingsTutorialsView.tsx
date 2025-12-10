import React, { useState } from 'react';
import { Play, Check, RotateCcw } from 'lucide-react';
import { useTutorial } from '../../contexts/TutorialContext';
import { PHASE_TUTORIALS, PhaseTutorialConfig } from '../tutorial/PhaseTutorials';
import { TutorialDialog } from '../tutorial/TutorialDialog';

// Human-readable names for phases
const PHASE_NAMES: Record<string, string> = {
    'placement': 'stone placement',
    'combined': 'measurements',
    'ban': 'ban phase',
    // Add new phase names here as they're added
};

// Descriptions for each tutorial
const PHASE_DESCRIPTIONS: Record<string, string> = {
    'placement': 'learn how to place stones on the sheet',
    'combined': 'learn how to view and cycle through measurements',
    'ban': 'learn how to place your ban zone',
};

export const SettingsTutorialsView: React.FC = () => {
    const { hasSeenTip, resetAllTips } = useTutorial();
    const [activeTutorial, setActiveTutorial] = useState<PhaseTutorialConfig | null>(null);
    const [showResetConfirm, setShowResetConfirm] = useState(false);

    const tutorials = Object.entries(PHASE_TUTORIALS);
    const seenCount = tutorials.filter(([_, config]) => hasSeenTip(config.id)).length;

    const handleWatchTutorial = (config: PhaseTutorialConfig) => {
        setActiveTutorial(config);
    };

    const handleCloseTutorial = () => {
        setActiveTutorial(null);
    };

    const handleResetAll = () => {
        resetAllTips();
        setShowResetConfirm(true);
        setTimeout(() => setShowResetConfirm(false), 2000);
    };

    return (
        <div className="space-y-4">
            {/* Tutorial list */}
            {tutorials.map(([phase, config]) => {
                const hasSeen = hasSeenTip(config.id);
                const name = PHASE_NAMES[phase] || phase;
                const description = PHASE_DESCRIPTIONS[phase] || `Tutorial for ${phase} phase`;

                return (
                    <div
                        key={config.id}
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-xl"
                    >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                                hasSeen
                                    ? 'bg-green-100 text-green-600'
                                    : 'bg-lavender-100 text-lavender-600'
                            }`}>
                                {hasSeen ? <Check size={20} /> : <Play size={20} />}
                            </div>
                            <div className="min-w-0">
                                <h3 className="text-base font-bold text-icy-black">{name}</h3>
                                <p className="text-sm text-gray-500 truncate">{description}</p>
                            </div>
                        </div>
                        <button
                            onClick={() => handleWatchTutorial(config)}
                            className="px-4 py-2 text-sm font-semibold text-lavender-600 hover:text-lavender-700 hover:bg-lavender-50 rounded-lg transition-colors shrink-0 lowercase"
                        >
                            {hasSeen ? 'watch again' : 'watch'}
                        </button>
                    </div>
                );
            })}

            {/* Reset all section */}
            {seenCount > 0 && (
                <div className="pt-4 border-t border-gray-200">
                    <button
                        onClick={handleResetAll}
                        disabled={showResetConfirm}
                        className={`w-full flex items-center justify-between p-4 rounded-xl transition-colors ${
                            showResetConfirm
                                ? 'bg-green-50'
                                : 'bg-gray-50 hover:bg-gray-100'
                        }`}
                    >
                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                showResetConfirm
                                    ? 'bg-green-100 text-green-600'
                                    : 'bg-orange-100 text-orange-600'
                            }`}>
                                {showResetConfirm ? <Check size={20} /> : <RotateCcw size={20} />}
                            </div>
                            <div className="text-left">
                                <h3 className="text-base font-bold text-icy-black">
                                    {showResetConfirm ? 'tutorials reset!' : 'reset all tutorials'}
                                </h3>
                                <p className="text-sm text-gray-500">
                                    {showResetConfirm
                                        ? 'tutorials will show automatically again'
                                        : 'show all tutorials again when entering phases'
                                    }
                                </p>
                            </div>
                        </div>
                    </button>
                </div>
            )}

            {/* Empty state */}
            {tutorials.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                    no tutorials available
                </div>
            )}

            {/* Tutorial dialog */}
            {activeTutorial && (
                <TutorialDialog
                    tutorialId={`settings-preview-${activeTutorial.id}`}
                    steps={activeTutorial.steps}
                    isOpen={true}
                    onClose={handleCloseTutorial}
                />
            )}
        </div>
    );
};
