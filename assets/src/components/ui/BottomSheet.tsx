import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';

interface BottomSheetProps {
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
    title?: string;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({ isOpen, onClose, children, title }) => {
    // Lock body scroll when open
    useEffect(() => {
        if (!isOpen) return;

        const originalOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        return () => {
            document.body.style.overflow = originalOverflow;
        };
    }, [isOpen]);

    // Close on Escape key
    useEffect(() => {
        if (!isOpen) return;

        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [isOpen, onClose]);

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-0 z-[1000] bg-black/30 backdrop-blur-sm"
                        onClick={onClose}
                    />

                    {/* Sheet */}
                    <motion.div
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 30, stiffness: 400 }}
                        className="fixed bottom-0 left-1/2 -translate-x-1/2 z-[1001] w-full md:max-w-md card-gradient rounded-t-3xl shadow-2xl max-h-[85vh] overflow-hidden border-t border-x border-white/30"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Drag Handle */}
                        <div className="flex justify-center pt-3 pb-2">
                            <div className="w-10 h-1 bg-gray-400/50 rounded-full" />
                        </div>

                        {/* Title */}
                        {title && (
                            <div className="px-6 pb-2">
                                <h2 className="text-xl font-bold text-gray-900 lowercase tracking-tight">{title}</h2>
                            </div>
                        )}

                        {/* Content */}
                        <div className="px-5 pb-10 md:px-6 md:pb-8 overflow-y-auto" style={{ paddingBottom: 'max(2.5rem, env(safe-area-inset-bottom))' }}>
                            {children}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>,
        document.body
    );
};
