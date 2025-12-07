import React, { RefObject } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { TutorialCursor } from './TutorialCursor';
import { TutorialTooltip, TooltipPosition } from './TutorialTooltip';
import { useTutorial } from '../../contexts/TutorialContext';

interface TutorialSpotlightProps {
    tipId: string;
    targetRef: RefObject<HTMLElement>;
    tooltipPosition?: TooltipPosition;
    tooltipContent: React.ReactNode;
    cursorOffset?: { x: number; y: number }; // Offset from center of target
    showCursor?: boolean;
    showOnce?: boolean;
    forceShow?: boolean;
    onDismiss?: () => void;
}

export const TutorialSpotlight: React.FC<TutorialSpotlightProps> = ({
    tipId,
    targetRef,
    tooltipPosition = 'top',
    tooltipContent,
    cursorOffset = { x: 0, y: 0 },
    showCursor = true,
    showOnce = true,
    forceShow = false,
    onDismiss
}) => {
    const { hasSeenTip } = useTutorial();
    const shouldShow = forceShow || !hasSeenTip(tipId);

    const [cursorCoords, setCursorCoords] = React.useState<{ x: number; y: number } | null>(null);

    // Calculate cursor position
    React.useEffect(() => {
        if (!shouldShow || !targetRef.current || !showCursor) return;

        const updateCursorPosition = () => {
            const target = targetRef.current;
            if (!target) return;

            const rect = target.getBoundingClientRect();
            setCursorCoords({
                x: rect.left + rect.width / 2 + cursorOffset.x,
                y: rect.top + rect.height / 2 + cursorOffset.y
            });
        };

        updateCursorPosition();
        window.addEventListener('resize', updateCursorPosition);
        window.addEventListener('scroll', updateCursorPosition, true);

        return () => {
            window.removeEventListener('resize', updateCursorPosition);
            window.removeEventListener('scroll', updateCursorPosition, true);
        };
    }, [shouldShow, targetRef, cursorOffset.x, cursorOffset.y, showCursor]);

    if (!shouldShow) return null;

    return (
        <>
            {/* Animated cursor overlay */}
            {showCursor && cursorCoords && createPortal(
                <AnimatePresence>
                    <motion.div
                        className="fixed z-[1099] pointer-events-none"
                        style={{
                            left: cursorCoords.x,
                            top: cursorCoords.y,
                            transform: 'translate(-50%, -30%)'
                        }}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <TutorialCursor size={48} />
                    </motion.div>
                </AnimatePresence>,
                document.body
            )}

            {/* Tooltip */}
            <TutorialTooltip
                tipId={tipId}
                targetRef={targetRef}
                position={tooltipPosition}
                showOnce={showOnce}
                forceShow={forceShow}
                onDismiss={onDismiss}
            >
                {tooltipContent}
            </TutorialTooltip>
        </>
    );
};
