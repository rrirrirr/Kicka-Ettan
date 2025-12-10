import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { scaleIn } from '../../utils/animations';

type DialogVariant = 'default' | 'info';

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
    /** Dialog variant - 'default' for standard dialogs, 'info' for help/info dialogs with header icon */
    variant?: DialogVariant;
    /** Icon to display in header area (only used with variant='info') */
    headerIcon?: React.ReactNode;
}

export const Dialog: React.FC<DialogProps> = ({
    isOpen,
    onClose,
    onEscape,
    title,
    children,
    className = '',
    headerClassName = '',
    backButton,
    fullScreen = false,
    variant = 'default',
    headerIcon,
}) => {
    const isInfo = variant === 'info';

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
        ? `relative z-10 card-gradient shadow-2xl ${isInfo ? '' : 'p-8'} w-full h-full flex flex-col md:rounded-3xl md:max-w-md md:max-h-[90vh] ${className}`
        : `relative z-10 card-gradient rounded-3xl shadow-2xl ${isInfo ? 'overflow-hidden' : 'p-8'} max-w-lg w-full flex flex-col max-h-[90vh] ${className}`;

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
                        role="dialog"
                        aria-modal="true"
                    >
                        {isInfo ? (
                            <>
                                {/* Close button - absolute positioned for info variant */}
                                <button
                                    onClick={onClose}
                                    className="absolute top-4 right-4 z-20 p-2 hover:bg-gray-100/80 rounded-full transition-colors"
                                    aria-label="Close"
                                >
                                    <X size={20} className="text-gray-500" />
                                </button>

                                {/* Header icon area */}
                                {headerIcon && (
                                    <div className="relative bg-gradient-to-b from-gray-100 to-gray-50 flex items-center justify-center overflow-hidden" style={{ height: 120 }}>
                                        {headerIcon}
                                    </div>
                                )}

                                {/* Content wrapper for info variant */}
                                <div className="p-6 flex flex-col flex-1 min-h-0">
                                    <div className={`mb-4 ${headerClassName}`}>
                                        <div className="flex items-center justify-center gap-2">
                                            {backButton}
                                            <h2 className="text-3xl font-black lowercase tracking-tighter text-gray-900 text-center">
                                                {title}
                                            </h2>
                                        </div>
                                    </div>

                                    <div className="flex-1 min-h-0 flex flex-col overflow-y-auto">
                                        {children}
                                    </div>
                                </div>
                            </>
                        ) : (
                            <>
                                {/* Default variant layout */}
                                <div className={`flex justify-between items-center mb-4 sm:mb-6 ${headerClassName}`}>
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
                            </>
                        )}
                    </motion.div>
                </div>
            )}
        </AnimatePresence>,
        document.body
    );
};
