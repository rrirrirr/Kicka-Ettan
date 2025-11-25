import React from 'react';
import { X } from 'lucide-react';

interface DialogProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    className?: string;
}

export const Dialog: React.FC<DialogProps> = ({ isOpen, onClose, title, children, className = '' }) => {
    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/20 backdrop-blur-md p-4"
            onClick={onClose}
        >
            <div
                className={`card-gradient rounded-3xl shadow-2xl p-8 max-w-lg w-full animate-in fade-in zoom-in duration-200 ${className}`}
                onClick={e => e.stopPropagation()}
            >
                <div className="flex justify-between items-start mb-6">
                    <h2 className="text-3xl font-black lowercase tracking-tighter text-gray-900">{title}</h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                        aria-label="Close"
                    >
                        <X size={20} className="text-gray-600" />
                    </button>
                </div>

                <div className="space-y-4 text-gray-700 text-sm leading-relaxed">
                    {children}
                </div>
            </div>
        </div>
    );
};
