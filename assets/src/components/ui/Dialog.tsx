import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { scaleIn } from '../../utils/animations';

interface DialogProps {
    isOpen: boolean;
    onClose: () => void;
    onEscape?: () => void; // Custom escape handler, defaults to onClose
    title: string;
    children: React.ReactNode;
    className?: string;
    headerClassName?: string;
    backButton?: React.ReactNode;
    fullScreen?: boolean;
}

export const Dialog: React.FC<DialogProps> = ({ isOpen, onClose, onEscape, title, children, className = '', headerClassName = '', backButton, fullScreen = false }) => {
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
                (onEscape || onClose)();
            }
        };

        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [isOpen, onClose, onEscape]);


    const containerClasses = fullScreen
        ? "fixed inset-0 z-[1000] flex items-center justify-center md:p-4"
        : "fixed inset-0 z-[1000] flex items-center justify-center p-4";

    const dialogClasses = fullScreen
        ? `relative z-10 card-gradient shadow-2xl p-8 w-full h-full flex flex-col md:rounded-3xl md:max-w-4xl md:max-h-[90vh] ${className}`
        : `relative z-10 card-gradient rounded-3xl shadow-2xl p-8 max-w-lg w-full flex flex-col max-h-[90vh] ${className}`;

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <div className={containerClasses}>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-0 bg-black/20 backdrop-blur-md"
                        onClick={onClose}
                    />
                    <motion.div
                        variants={scaleIn}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        className={dialogClasses}
                        onClick={e => e.stopPropagation()}
                    >
                        <div className={`flex justify-between items-center mb-6 ${headerClassName}`}>
                            <div className="flex items-center gap-2">
                                {backButton}
                                <h2 className="text-3xl font-black lowercase tracking-tighter text-gray-900">{title}</h2>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                                aria-label="Close"
                            >
                                <X size={20} className="text-gray-600" />
                            </button>
                        </div>

                        <div className="flex-1 min-h-0 flex flex-col space-y-4 text-gray-700 text-sm leading-relaxed overflow-y-auto">
                            {children}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>,
        document.body
    );
};
