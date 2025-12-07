import React from 'react';
import { motion } from 'framer-motion';

interface TutorialCursorProps {
    size?: number;
    className?: string;
}

export const TutorialCursor: React.FC<TutorialCursorProps> = ({
    size = 48,
    className = ''
}) => {
    return (
        <motion.div
            className={`pointer-events-none ${className}`}
            style={{ width: size, height: size }}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.2 }}
        >
            {/* Hand SVG with tap animation */}
            <motion.svg
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                style={{ width: '100%', height: '100%' }}
                animate={{
                    y: [0, 3, 0],
                    scale: [1, 0.95, 1],
                }}
                transition={{
                    duration: 0.8,
                    repeat: Infinity,
                    repeatDelay: 0.5,
                    ease: "easeInOut",
                }}
            >
                {/* Drop shadow filter */}
                <defs>
                    <filter id="cursor-shadow" x="-20%" y="-20%" width="140%" height="140%">
                        <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.3" />
                    </filter>
                </defs>

                {/* Hand pointing/tapping icon */}
                <g filter="url(#cursor-shadow)">
                    {/* Index finger */}
                    <path
                        d="M12 2C11.45 2 11 2.45 11 3V11.5C11 11.78 10.78 12 10.5 12C10.22 12 10 11.78 10 11.5V5C10 4.45 9.55 4 9 4C8.45 4 8 4.45 8 5V12.5C8 12.78 7.78 13 7.5 13C7.22 13 7 12.78 7 12.5V7C7 6.45 6.55 6 6 6C5.45 6 5 6.45 5 7V14C5 18.42 8.58 22 13 22C17.42 22 21 18.42 21 14V11C21 10.45 20.55 10 20 10C19.45 10 19 10.45 19 11V14H18V8C18 7.45 17.55 7 17 7C16.45 7 16 7.45 16 8V13H15V6C15 5.45 14.55 5 14 5C13.45 5 13 5.45 13 6V11.5C13 11.78 12.78 12 12.5 12C12.22 12 12 11.78 12 11.5V3C12 2.45 11.55 2 11 2H12Z"
                        fill="#1a1a1a"
                    />
                </g>
            </motion.svg>

            {/* Ripple effect on tap */}
            <motion.div
                className="absolute rounded-full bg-purple-500/30"
                style={{
                    width: size * 0.5,
                    height: size * 0.5,
                    left: '50%',
                    top: '70%',
                    marginLeft: -size * 0.25,
                    marginTop: -size * 0.25,
                }}
                animate={{
                    scale: [0, 1.5, 2],
                    opacity: [0.6, 0.3, 0],
                }}
                transition={{
                    duration: 0.8,
                    repeat: Infinity,
                    repeatDelay: 0.5,
                    ease: "easeOut",
                    times: [0, 0.3, 1],
                }}
            />
        </motion.div>
    );
};
