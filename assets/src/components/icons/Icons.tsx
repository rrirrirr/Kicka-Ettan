import React from 'react';

interface IconProps extends React.SVGProps<SVGSVGElement> {
    size?: number | string;
    strokeWidth?: number;
}

export const BrainIcon: React.FC<IconProps> = ({ size = 24, strokeWidth = 2, ...props }) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        {...props}
    >
        <path d="M9.5 3A6.5 6.5 0 0 0 3 9.5c0 3.5 1.5 6.5 4 8" />
        <path d="M14.5 3a6.5 6.5 0 0 1 6.5 6.5c0 3.5 -1.5 6.5 -4 8" />
        <path d="M9.5 3h5" />
        <path d="M7 17.5h10" />
        <circle cx="12" cy="10" r="2" />
        <path d="M12 12v5" />
    </svg>
);

export const BroomIcon: React.FC<IconProps> = ({ size = 24, strokeWidth = 2, ...props }) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        {...props}
    >
        {/* Handle */}
        <line x1="12" y1="2" x2="12" y2="13" />
        {/* Three Splayed Hairs */}
        <path d="M12 13 7 21" />
        <path d="M12 13 12 21" />
        <path d="M12 13 17 21" />
    </svg>
);

export const StoneIcon: React.FC<IconProps> = ({ size = 24, strokeWidth = 2, ...props }) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        {...props}
    >
        {/* Handle - Rounded L Shape */}
        <path d="M10 14V10a2 2 0 0 1 2-2h6" />
        {/* Stone Body - Rounded Rectangle */}
        <rect x="3" y="14" width="18" height="7" rx="3" />
        {/* Bottom Detail line */}
        <path d="M6 21h12" />
    </svg>
);

export const RulerIcon: React.FC<IconProps> = ({ size = 24, strokeWidth = 2, ...props }) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        {...props}
    >
        <rect x="2" y="8" width="20" height="8" rx="1" transform="rotate(-45 12 12)" />
        <path d="M9 9l-1 1" transform="rotate(-45 12 12)" />
        <path d="M12 9l-1 1" transform="rotate(-45 12 12)" />
        <path d="M15 9l-1 1" transform="rotate(-45 12 12)" />
    </svg>
);

export const SheetIcon: React.FC<IconProps> = ({ size = 24, strokeWidth = 2, ...props }) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        {...props}
    >
        <rect x="5" y="2" width="14" height="20" rx="2" />
        <circle cx="12" cy="18" r="3" />
    </svg>
);

export const StoneToStoneIcon: React.FC<IconProps> = ({ size = 24, strokeWidth = 2, ...props }) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        {...props}
    >
        {/* Connection Line */}
        <line x1="8.5" y1="15.5" x2="15.5" y2="8.5" strokeDasharray="1 3" strokeWidth={1.5} />

        {/* Bottom Left Stone - Top Down View */}
        <circle cx="6" cy="18" r="3" />
        <rect x="5" y="17" width="2" height="2" rx="0.5" fill="currentColor" opacity="0.5" />

        {/* Top Right Stone - Top Down View */}
        <circle cx="18" cy="6" r="3" />
        <rect x="17" y="5" width="2" height="2" rx="0.5" fill="currentColor" opacity="0.5" />
    </svg>
);

export const TargetIcon: React.FC<IconProps> = ({ size = 24, strokeWidth = 2, ...props }) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        {...props}
    >
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="12" r="6" />
        <circle cx="12" cy="12" r="2" fill="currentColor" />
    </svg>
);

export const GuardIcon: React.FC<IconProps> = ({ size = 24, strokeWidth = 2, ...props }) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        {...props}
    >
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <path d="M12 22V5" />
    </svg>
);

export const BanIcon: React.FC<IconProps> = ({ size = 24, strokeWidth = 2, ...props }) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        {...props}
    >
        {/* Dashed Circle */}
        <circle cx="12" cy="12" r="10" strokeDasharray="4 4" />
        {/* X in middle */}
        <path d="M8 8l8 8" />
        <path d="M16 8l-8 8" />
    </svg>
);
