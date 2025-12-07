import React, { useEffect, useState, useRef, RefObject } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useTutorial } from '../../contexts/TutorialContext';

export type TooltipPosition = 'top' | 'bottom' | 'left' | 'right';

interface TutorialTooltipProps {
    tipId: string;
    targetRef: RefObject<HTMLElement>;
    position?: TooltipPosition;
    children: React.ReactNode;
    offset?: number;
    showOnce?: boolean;
    forceShow?: boolean; // Override the "seen" check for testing
    onDismiss?: () => void;
    className?: string;
}

interface TooltipCoords {
    x: number;
    y: number;
    arrowX: number;
    arrowY: number;
    arrowRotation: number;
}

export const TutorialTooltip: React.FC<TutorialTooltipProps> = ({
    tipId,
    targetRef,
    position = 'top',
    children,
    offset = 12,
    showOnce = true,
    forceShow = false,
    onDismiss,
    className = ''
}) => {
    const { hasSeenTip, markTipSeen } = useTutorial();
    const [coords, setCoords] = useState<TooltipCoords | null>(null);
    const [isVisible, setIsVisible] = useState(false);
    const tooltipRef = useRef<HTMLDivElement>(null);

    // Check if we should show this tip
    const shouldShow = forceShow || !hasSeenTip(tipId);

    // Calculate position based on target element
    useEffect(() => {
        if (!shouldShow || !targetRef.current) return;

        const updatePosition = () => {
            const target = targetRef.current;
            const tooltip = tooltipRef.current;
            if (!target) return;

            const targetRect = target.getBoundingClientRect();
            const tooltipWidth = tooltip?.offsetWidth || 200;
            const tooltipHeight = tooltip?.offsetHeight || 80;

            let x = 0;
            let y = 0;
            let arrowX = 0;
            let arrowY = 0;
            let arrowRotation = 0;

            const arrowSize = 8;

            switch (position) {
                case 'top':
                    x = targetRect.left + targetRect.width / 2 - tooltipWidth / 2;
                    y = targetRect.top - tooltipHeight - offset - arrowSize;
                    arrowX = tooltipWidth / 2 - arrowSize;
                    arrowY = tooltipHeight;
                    arrowRotation = 180;
                    break;
                case 'bottom':
                    x = targetRect.left + targetRect.width / 2 - tooltipWidth / 2;
                    y = targetRect.bottom + offset + arrowSize;
                    arrowX = tooltipWidth / 2 - arrowSize;
                    arrowY = -arrowSize * 2;
                    arrowRotation = 0;
                    break;
                case 'left':
                    x = targetRect.left - tooltipWidth - offset - arrowSize;
                    y = targetRect.top + targetRect.height / 2 - tooltipHeight / 2;
                    arrowX = tooltipWidth;
                    arrowY = tooltipHeight / 2 - arrowSize;
                    arrowRotation = 90;
                    break;
                case 'right':
                    x = targetRect.right + offset + arrowSize;
                    y = targetRect.top + targetRect.height / 2 - tooltipHeight / 2;
                    arrowX = -arrowSize * 2;
                    arrowY = tooltipHeight / 2 - arrowSize;
                    arrowRotation = -90;
                    break;
            }

            // Clamp to viewport
            const padding = 16;
            x = Math.max(padding, Math.min(window.innerWidth - tooltipWidth - padding, x));
            y = Math.max(padding, Math.min(window.innerHeight - tooltipHeight - padding, y));

            setCoords({ x, y, arrowX, arrowY, arrowRotation });
        };

        // Initial calculation after a short delay to allow tooltip to render
        const timer = setTimeout(() => {
            updatePosition();
            setIsVisible(true);
        }, 100);

        // Update on resize/scroll
        window.addEventListener('resize', updatePosition);
        window.addEventListener('scroll', updatePosition, true);

        return () => {
            clearTimeout(timer);
            window.removeEventListener('resize', updatePosition);
            window.removeEventListener('scroll', updatePosition, true);
        };
    }, [shouldShow, targetRef, position, offset]);

    const handleDismiss = () => {
        setIsVisible(false);
        if (showOnce) {
            markTipSeen(tipId);
        }
        onDismiss?.();
    };

    if (!shouldShow) return null;

    return createPortal(
        <AnimatePresence>
            {isVisible && coords && (
                <motion.div
                    ref={tooltipRef}
                    className={`fixed z-[1100] ${className}`}
                    style={{
                        left: coords.x,
                        top: coords.y,
                    }}
                    initial={{ opacity: 0, scale: 0.9, y: position === 'top' ? 10 : position === 'bottom' ? -10 : 0 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                >
                    {/* Tooltip card */}
                    <div className="relative bg-gray-900 text-white rounded-2xl shadow-2xl px-4 py-3 max-w-xs">
                        {/* Close button */}
                        <button
                            onClick={handleDismiss}
                            className="absolute -top-2 -right-2 w-6 h-6 bg-gray-700 hover:bg-gray-600 rounded-full flex items-center justify-center transition-colors shadow-md"
                            aria-label="Dismiss tip"
                        >
                            <X size={14} />
                        </button>

                        {/* Content */}
                        <div className="text-sm leading-relaxed">
                            {children}
                        </div>

                        {/* Arrow */}
                        <div
                            className="absolute w-0 h-0"
                            style={{
                                left: coords.arrowX,
                                top: coords.arrowY,
                                borderLeft: '8px solid transparent',
                                borderRight: '8px solid transparent',
                                borderTop: '8px solid #111827',
                                transform: `rotate(${coords.arrowRotation}deg)`,
                                transformOrigin: 'center center',
                            }}
                        />
                    </div>
                </motion.div>
            )}
        </AnimatePresence>,
        document.body
    );
};
