import React, { useState } from "react";
import { ChevronLeft, BookOpen } from "lucide-react";
import { Button } from "./ui/Button";
import { Dialog } from "./ui/Dialog";
import { PHASE_TUTORIALS, PhaseTutorialConfig } from "./tutorial/PhaseTutorials";
import { TutorialDialog } from "./tutorial/TutorialDialog";
import { getGameType } from "../data/gameTypes";

interface PhaseHelpDialogProps {
  isOpen: boolean;
  onClose: () => void;
  phase: string;
  gameType: string;
}

type ViewMode = "phase" | "gameType";

export const PhaseHelpDialog: React.FC<PhaseHelpDialogProps> = ({
  isOpen,
  onClose,
  phase,
  gameType,
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>("phase");

  const tutorialConfig: PhaseTutorialConfig | null = PHASE_TUTORIALS[phase] || null;
  const gameTypeInfo = getGameType(gameType);

  const handleClose = () => {
    setViewMode("phase");
    onClose();
  };

  const handleShowGameType = () => {
    setViewMode("gameType");
  };

  const handleBackToPhase = () => {
    setViewMode("phase");
  };

  const getPhaseName = (phase: string): string => {
    switch (phase) {
      case "ban":
        return "ban phase";
      case "placement":
        return "placement phase";
      case "combined":
        return "measurement phase";
      default:
        return phase;
    }
  };

  // Show phase tutorial using TutorialDialog
  if (viewMode === "phase" && tutorialConfig) {
    return (
      <TutorialDialog
        tutorialId={`help-${tutorialConfig.id}`}
        steps={[
          ...tutorialConfig.steps,
          // Add a final step with game type button
          ...(gameTypeInfo ? [{
            id: "game-type-link",
            title: "learn more",
            description: `Want to learn more about ${gameTypeInfo.name}? Tap the button below to see the full game rules.`,
            animation: (
              <div className="flex flex-col items-center gap-4">
                <BookOpen size={64} className="text-gray-400" />
                <Button
                  variant="outline"
                  onClick={handleShowGameType}
                  className="h-12 px-6 lowercase"
                  noHoverAnimation
                >
                  <BookOpen size={18} className="mr-2" />
                  about {gameTypeInfo.name.toLowerCase()}
                </Button>
              </div>
            ),
          }] : []),
        ]}
        isOpen={isOpen}
        onClose={handleClose}
      />
    );
  }

  // Show game type info using Dialog with info variant
  if (viewMode === "gameType") {
    return (
      <Dialog
        isOpen={isOpen}
        onClose={handleClose}
        title={`about · ${gameTypeInfo?.name.toLowerCase() || "game type"}`}
        variant="info"
        headerIcon={<BookOpen size={48} className="text-gray-400" />}
      >
        <div className="space-y-5 px-2">
          <p className="text-base text-gray-700 leading-relaxed whitespace-pre-line">
            {gameTypeInfo?.longDescription || "No information available for this game type."}
          </p>
        </div>

        <div className="mt-6 pt-4 border-t border-gray-100">
          <Button
            onClick={handleBackToPhase}
            className="w-full h-12 lowercase"
            noHoverAnimation
          >
            <ChevronLeft size={18} className="mr-1" />
            back to {getPhaseName(phase)} help
          </Button>
        </div>
      </Dialog>
    );
  }

  // Fallback: no tutorial config - show simple dialog
  return (
    <Dialog
      isOpen={isOpen}
      onClose={handleClose}
      title={getPhaseName(phase)}
      variant="info"
      headerIcon={<BookOpen size={48} className="text-gray-400" />}
    >
      <div className="space-y-5 px-2">
        <p className="text-base text-gray-700 leading-relaxed">
          No help available for this phase yet.
        </p>
      </div>

      {gameTypeInfo && (
        <div className="mt-6 pt-4 border-t border-gray-100">
          <Button
            variant="outline"
            onClick={handleShowGameType}
            className="w-full h-12 lowercase"
            noHoverAnimation
          >
            <BookOpen size={18} className="mr-2" />
            about {gameTypeInfo.name.toLowerCase()}
          </Button>
        </div>
      )}
    </Dialog>
  );
};
