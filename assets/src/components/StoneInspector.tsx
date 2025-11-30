import React from 'react';
import { Loupe } from './Loupe';
import { MeasurementType } from '../contexts/SettingsContext';
import { Target, Shield, AlignCenterVertical, AlignCenterHorizontal } from 'lucide-react';

interface StoneInspectorProps {
    x: number;
    y: number;
    fixedPosition?: { x: number; y: number };
    scale?: number;
    size?: number;
    content: React.ReactNode;
    activeTypes: MeasurementType[];
    availableTypes: MeasurementType[];
    onToggleType: (type: MeasurementType) => void;
}

export const StoneInspector: React.FC<StoneInspectorProps> = ({
    x,
    y,
    fixedPosition,
    scale = 1.8,
    size = 270,
    content,
    activeTypes,
    availableTypes,
    onToggleType
}) => {
    // Determine button position relative to the loupe
    // We'll place them to the right of the loupe
    const loupeX = fixedPosition ? fixedPosition.x : x;
    const loupeY = fixedPosition ? fixedPosition.y : y;
    const radius = size / 2;

    const buttonContainerStyle: React.CSSProperties = {
        position: 'fixed',
        left: loupeX + radius + 20,
        top: loupeY,
        transform: 'translateY(-50%)',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        zIndex: 10000, // Above everything
    };

    const getIcon = (type: MeasurementType) => {
        switch (type) {
            case 'closest-ring': return <Target size={20} />;
            case 'guard': return <Shield size={20} />;
            case 't-line': return <AlignCenterVertical size={20} className="rotate-90" />; // Horizontal line icon
            case 'center-line': return <AlignCenterHorizontal size={20} className="rotate-90" />; // Vertical line icon
            default: return null;
        }
    };

    const getLabel = (type: MeasurementType) => {
        switch (type) {
            case 'closest-ring': return 'Ring';
            case 'guard': return 'Guard';
            case 't-line': return 'T-Line';
            case 'center-line': return 'Center';
            default: return type;
        }
    };

    return (
        <>
            <Loupe
                x={x}
                y={y}
                fixedPosition={fixedPosition}
                scale={scale}
                size={size}
                content={content}
            />

            <div style={buttonContainerStyle}>
                {availableTypes.map(type => {
                    const isActive = activeTypes.includes(type);
                    return (
                        <button
                            key={type}
                            onClick={(e) => {
                                e.stopPropagation();
                                onToggleType(type);
                            }}
                            className={`
                                flex items-center justify-center w-10 h-10 rounded-full shadow-lg transition-all duration-200
                                ${isActive
                                    ? 'bg-purple-600 text-white hover:bg-purple-700'
                                    : 'bg-white text-gray-500 hover:bg-gray-50 hover:text-purple-600'
                                }
                            `}
                            title={`Toggle ${getLabel(type)}`}
                        >
                            {getIcon(type)}
                        </button>
                    );
                })}
            </div>
        </>
    );
};
