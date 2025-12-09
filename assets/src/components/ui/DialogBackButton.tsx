import React from 'react';
import { Button } from './Button';
import { ChevronLeft } from 'lucide-react';

interface DialogBackButtonProps {
    onClick: () => void;
    className?: string;
}

export const DialogBackButton: React.FC<DialogBackButtonProps> = ({ onClick, className = '' }) => {
    return (
        <Button
            variant="ghost"
            shape="circle"
            size="icon"
            onClick={onClick}
            className={`-ml-2 hover:bg-gray-100 transition-colors ${className}`}
        >
            <ChevronLeft size={24} />
        </Button>
    );
};
