import React from 'react';

interface GameTitleProps {
  size?: 'small' | 'large';
  className?: string;
}

const GameTitle: React.FC<GameTitleProps> = ({ size = 'large', className = '' }) => {
  const baseSize = size === 'large' ? 'text-5xl md:text-7xl' : 'text-3xl md:text-4xl';

  return (
    <h1 className={`font-['Outfit'] font-black tracking-tighter lowercase select-none ${baseSize} ${className}`}>
      <span className="text-[var(--icy-black)]">kicka</span>
      <span className="mx-2 text-[var(--icy-red)]">·</span>
      <span className="text-[var(--icy-black)]">ettan</span>
    </h1>
  );
};

export default GameTitle;
