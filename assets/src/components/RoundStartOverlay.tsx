import { motion, AnimatePresence } from 'framer-motion';
import { overlayBackdrop, roundStartContainer, roundStartText } from '../utils/animations';

interface RoundStartOverlayProps {
    isVisible: boolean;
    roundNumber: number;
    onComplete?: () => void;
}

export const RoundStartOverlay = ({ isVisible, roundNumber, onComplete }: RoundStartOverlayProps) => {
    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    className="fixed inset-0 z-[100] flex items-center justify-center"
                    variants={overlayBackdrop}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    onAnimationComplete={(definition) => {
                        // Call onComplete after the animate phase finishes (not exit)
                        if (definition === 'animate' && onComplete) {
                            // Auto-dismiss after 1.5 seconds
                            setTimeout(onComplete, 1500);
                        }
                    }}
                >
                    {/* Backdrop */}
                    <div className="absolute inset-0 bg-gradient-to-b from-[var(--icy-black)]/80 to-[var(--icy-black)]/90 backdrop-blur-sm" />

                    {/* Content */}
                    <motion.div
                        className="relative z-10 flex flex-col items-center text-center px-8"
                        variants={roundStartContainer}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                    >
                        {/* Round Number */}
                        <motion.h1
                            className="text-6xl md:text-8xl font-black text-white lowercase tracking-tighter mb-4"
                            variants={roundStartText}
                            style={{
                                textShadow: '0 4px 20px rgba(0, 0, 0, 0.3), 0 2px 8px rgba(0, 0, 0, 0.2)'
                            }}
                        >
                            round #{roundNumber}
                        </motion.h1>

                        {/* Phase Type */}
                        <motion.p
                            className="text-xl md:text-2xl font-medium text-white/80 lowercase tracking-wide"
                            variants={roundStartText}
                        >
                            blind placement phase
                        </motion.p>

                        {/* Decorative Line */}
                        <motion.div
                            className="mt-6 w-24 h-1 rounded-full bg-gradient-to-r from-[var(--lavender-400)] to-[var(--periwinkle-400)]"
                            variants={roundStartText}
                        />
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
