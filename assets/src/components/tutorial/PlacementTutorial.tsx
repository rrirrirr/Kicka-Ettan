import React from 'react';
import { TutorialDialog, TutorialStep } from './TutorialDialog';
import { PlacementMethodsDemo, LoupeEdgeDemo, CollisionHandlingDemo } from './TutorialAnimations';
import { useTutorial } from '../../contexts/TutorialContext';

const TUTORIAL_ID = 'placement-tutorial';

const tutorialSteps: TutorialStep[] = [
    {
        id: 'placement-methods',
        title: 'Place Your Stones',
        description: 'Drag stones from the bar at the bottom onto the sheet. You can also tap anywhere on the sheet to place a stone, then drag to adjust its position.',
        animation: <PlacementMethodsDemo />,
    },
    {
        id: 'loupe-behavior',
        title: 'Using the Loupe',
        description: 'When dragging, a magnifying loupe appears for precise placement. Near the edges, the loupe will squeeze to the side — you can still place stones at the edge, just keep moving your finger there.',
        animation: <LoupeEdgeDemo />,
    },
    {
        id: 'collision-handling',
        title: 'Collision Handling',
        description: 'If you place a stone on top of another, they will push each other away equally to make space.',
        animation: <CollisionHandlingDemo />,
    },
];

interface PlacementTutorialProps {
    isOpen: boolean;
    onClose: () => void;
}

export const PlacementTutorial: React.FC<PlacementTutorialProps> = ({
    isOpen,
    onClose,
}) => {
    return (
        <TutorialDialog
            tutorialId={TUTORIAL_ID}
            steps={tutorialSteps}
            isOpen={isOpen}
            onClose={onClose}
        />
    );
};

// Hook to manage showing the tutorial
export const usePlacementTutorial = () => {
    const { hasSeenTip } = useTutorial();
    const [isOpen, setIsOpen] = React.useState(false);

    const shouldShowTutorial = !hasSeenTip(TUTORIAL_ID);

    const showTutorial = React.useCallback(() => {
        setIsOpen(true);
    }, []);

    const closeTutorial = React.useCallback(() => {
        setIsOpen(false);
    }, []);

    // Auto-show when shouldShowTutorial becomes true
    const triggerIfNeeded = React.useCallback(() => {
        if (shouldShowTutorial) {
            // Small delay to let any transitions complete
            setTimeout(() => setIsOpen(true), 400);
        }
    }, [shouldShowTutorial]);

    return {
        isOpen,
        showTutorial,
        closeTutorial,
        triggerIfNeeded,
        hasSeenTutorial: !shouldShowTutorial,
    };
};
