import React from 'react';
import { X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { scaleIn } from '../../utils/animations';

interface DialogProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    className?: string;
    headerClassName?: string;
    backButton?: React.ReactNode;
}

export const Dialog: React.FC<DialogProps> = ({ isOpen, onClose, title, children, className = '', headerClassName = '', backButton }) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
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
                        className={`relative z-10 card-gradient rounded-3xl shadow-2xl p-8 max-w-lg w-full flex flex-col max-h-[90vh] ${className}`}
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
        </AnimatePresence>
    );
};
