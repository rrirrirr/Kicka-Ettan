import React, { useEffect, useCallback } from "react";
import { TutorialDialog, TutorialStep } from "./TutorialDialog";
import { useTutorial } from "../../contexts/TutorialContext";
import {
  PlacementMethodsDemo,
  LoupeEdgeDemo,
  StoneTapDemo,
  MeasurementCycleDemo,
  StepIndicatorDemo,
} from "./TutorialAnimations";

// ============================================
// PHASE TUTORIAL REGISTRY
// ============================================
// To add a tutorial for a new phase, simply add an entry here.
// The tutorial will automatically show when entering that phase.

export interface PhaseTutorialConfig {
  id: string;
  steps: TutorialStep[];
  /** Delay before showing tutorial after phase change (ms) */
  delay?: number;
}

export const PHASE_TUTORIALS: Record<string, PhaseTutorialConfig> = {
  // Placement phase tutorial
  placement: {
    id: "placement-tutorial",
    delay: 400,
    steps: [
      {
        id: "placement-methods",
        title: "Place Your Stones",
        description:
          "Drag stones from the bar at the bottom onto the sheet. You can also tap anywhere on the sheet to place a stone, then drag to adjust its position.",
        animation: <PlacementMethodsDemo />,
      },
      {
        id: "loupe-behavior",
        title: "Using the Loupe",
        description:
          "When dragging, a magnifying loupe appears for precise placement. Near the edges, the loupe will squeeze to the side — you can still place stones at the edge, just keep moving your finger there.",
        animation: <LoupeEdgeDemo />,
      },
    ],
  },

  // Combined/measurement phase tutorial
  combined: {
    id: "measurements-tutorial",
    delay: 600,
    steps: [
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
    ],
  },

  // ============================================
  // ADD NEW PHASE TUTORIALS HERE
  // ============================================
  // Example:
  // 'shooting': {
  //     id: 'shooting-tutorial',
  //     delay: 500,
  //     steps: [
  //         {
  //             id: 'aim',
  //             title: 'Aim Your Shot',
  //             description: 'Drag to set the direction...',
  //             animation: <AimDemo />,
  //         },
  //     ],
  // },
};

// ============================================
// HOOK: usePhaseTutorial
// ============================================
// Manages showing tutorials based on current phase

interface UsePhaseTutorialOptions {
  /** Current game phase */
  phase: string;
  /** Additional conditions that must be true to show tutorial */
  canShow?: boolean;
}

interface UsePhaseTutorialReturn {
  /** Whether tutorial dialog is currently open */
  isOpen: boolean;
  /** Current tutorial config (if any) */
  currentTutorial: PhaseTutorialConfig | null;
  /** Close the tutorial */
  closeTutorial: () => void;
  /** Manually trigger tutorial for current phase */
  showTutorial: () => void;
}

export const usePhaseTutorial = ({
  phase,
  canShow = true,
}: UsePhaseTutorialOptions): UsePhaseTutorialReturn => {
  const { hasSeenTip, markTipSeen } = useTutorial();
  const [isOpen, setIsOpen] = React.useState(false);
  const [activePhase, setActivePhase] = React.useState<string | null>(null);

  const tutorialConfig = PHASE_TUTORIALS[phase] || null;
  const shouldShow =
    canShow && tutorialConfig && !hasSeenTip(tutorialConfig.id);

  // Trigger tutorial when phase changes
  useEffect(() => {
    if (shouldShow && phase !== activePhase) {
      const delay = tutorialConfig?.delay || 400;
      const timer = setTimeout(() => {
        setIsOpen(true);
        setActivePhase(phase);
      }, delay);
      return () => clearTimeout(timer);
    }
  }, [phase, shouldShow, activePhase, tutorialConfig?.delay]);

  const closeTutorial = useCallback(() => {
    setIsOpen(false);
    if (tutorialConfig) {
      markTipSeen(tutorialConfig.id);
    }
  }, [tutorialConfig, markTipSeen]);

  const showTutorial = useCallback(() => {
    if (tutorialConfig) {
      setIsOpen(true);
    }
  }, [tutorialConfig]);

  return {
    isOpen,
    currentTutorial: isOpen ? tutorialConfig : null,
    closeTutorial,
    showTutorial,
  };
};

// ============================================
// COMPONENT: PhaseTutorial
// ============================================
// Single component that renders the active phase tutorial

interface PhaseTutorialProps {
  /** Current game phase */
  phase: string;
  /** Additional conditions that must be true to show tutorial */
  canShow?: boolean;
}

export const PhaseTutorial: React.FC<PhaseTutorialProps> = ({
  phase,
  canShow = true,
}) => {
  const { isOpen, currentTutorial, closeTutorial } = usePhaseTutorial({
    phase,
    canShow,
  });

  if (!currentTutorial) return null;

  return (
    <TutorialDialog
      tutorialId={currentTutorial.id}
      steps={currentTutorial.steps}
      isOpen={isOpen}
      onClose={closeTutorial}
    />
  );
};

// ============================================
// HELPER: Get all phase tutorial IDs (for reset)
// ============================================
export const getAllPhaseTutorialIds = (): string[] => {
  return Object.values(PHASE_TUTORIALS).map((t) => t.id);
};
