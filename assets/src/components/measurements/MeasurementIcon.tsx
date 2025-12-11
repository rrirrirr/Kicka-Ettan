import React from 'react';

interface MeasurementIconProps {
  type: 'stone' | 'broom';
  color: string;
  opacity?: string;
  /** If true, wraps in <svg> for use in HTML context. If false, returns <g> for use inside existing SVG */
  standalone?: boolean;
}

/**
 * Renders a small inline SVG icon for measurements (broom or stone)
 * Designed to be used next to measurement text labels
 */
export const MeasurementIcon: React.FC<MeasurementIconProps> = ({ type, color, opacity, standalone = false }) => {
  const content = type === 'broom' ? (
    <g opacity={opacity}>
      <line x1="5" y1="1" x2="5" y2="6" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M5 6 L3 9" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M5 6 L5 9" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M5 6 L7 9" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </g>
  ) : (
    <g opacity={opacity}>
      <path d="M3 6 L3 4 Q3 3 4 3 L7 3" stroke={color} strokeWidth="1.5" strokeLinecap="round" fill="none" />
      <rect x="1" y="6" width="8" height="3" rx="1" stroke={color} strokeWidth="1.5" fill="none" />
    </g>
  );

  if (standalone) {
    return (
      <svg width="10" height="10" viewBox="0 0 10 10" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
        {content}
      </svg>
    );
  }

  return content;
};
