import React from 'react';

interface CardProps {
    children: React.ReactNode;
    className?: string;
    onClick?: (e: React.MouseEvent) => void;
}

export const Card: React.FC<CardProps> = ({ children, className = '', onClick }) => {
    return (
        <div
            className={`card-gradient backdrop-blur-md rounded-3xl shadow-2xl overflow-hidden relative ${onClick ? 'cursor-pointer animate-glow' : ''} ${className}`}
            onClick={onClick}
        >
            {children}
        </div>
    );
};
