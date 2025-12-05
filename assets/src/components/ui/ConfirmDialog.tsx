import React from 'react';
import { Button } from './Button';

interface ConfirmDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'warning' | 'info';
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    variant = 'danger'
}) => {
    if (!isOpen) return null;

    const confirmVariant = variant === 'danger' ? 'destructive' : 'primary';

    return (
        <div
            className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/20 backdrop-blur-md p-4"
            onClick={onClose}
        >
            <div
                className="card-gradient rounded-2xl shadow-2xl p-8 max-w-md w-full animate-in fade-in zoom-in duration-200"
                onClick={e => e.stopPropagation()}
            >
                <h3 className="heading-3 mb-3">
                    {title}
                </h3>
                <p className="body-text-secondary mb-6">
                    {message}
                </p>
                <div className="flex gap-3">
                    <Button
                        onClick={onClose}
                        variant="outline"
                        size="lg"
                        className="flex-1"
                    >
                        {cancelText}
                    </Button>
                    <Button
                        onClick={() => {
                            onConfirm();
                            onClose();
                        }}
                        variant={confirmVariant}
                        size="lg"
                        className="flex-1"
                    >
                        {confirmText}
                    </Button>
                </div>
            </div>
        </div>
    );
};
