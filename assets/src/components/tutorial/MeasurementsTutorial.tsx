import React from "react";
import { TutorialDialog, TutorialStep } from "./TutorialDialog";
import {
  StoneTapDemo,
  MeasurementCycleDemo,
  StepIndicatorDemo,
} from "./TutorialAnimations";
import { useTutorial } from "../../contexts/TutorialContext";

const TUTORIAL_ID = "measurements-tutorial";

const tutorialSteps: TutorialStep[] = [
  {
    id: "tap-stone",
    title: "Tap a Stone",
    description:
      "Tap any stone on the sheet to select it and see its measurements.",
    animation: <StoneTapDemo />,
  },
  {
    id: "cycle-measurements",
    title: "Cycle Measurements",
    description:
      "Tap the same stone again to cycle through different measurement types: ring distance, T-line, and center line.",
    animation: <MeasurementCycleDemo />,
  },
  {
    id: "step-indicator",
    title: "Measurement Steps",
    description:
      "The indicator shows which measurement is active. Each zone (house, guard) has its own measurement sequence. You can change the active measurement types by clicking on any of the icons toggle.",
    animation: <StepIndicatorDemo />,
  },
];

interface MeasurementsTutorialProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MeasurementsTutorial: React.FC<MeasurementsTutorialProps> = ({
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
export const useMeasurementsTutorial = () => {
  const { hasSeenTip } = useTutorial();
  const [isOpen, setIsOpen] = React.useState(false);

  const shouldShowTutorial = !hasSeenTip(TUTORIAL_ID);

  const showTutorial = React.useCallback(() => {
    setIsOpen(true);
  }, []);

  const closeTutorial = React.useCallback(() => {
    setIsOpen(false);
  }, []);

  // Auto-show when shouldShowTutorial becomes true (e.g., entering combined phase)
  const triggerIfNeeded = React.useCallback(() => {
    if (shouldShowTutorial) {
      // Small delay to let the phase transition complete
      setTimeout(() => setIsOpen(true), 600);
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
