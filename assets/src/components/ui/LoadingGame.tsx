import React from 'react';
import { motion } from 'framer-motion';

export const LoadingGame: React.FC = () => {
    // Text to display once
    const textSnippet = "loading game";

    return (
        <div className="flex items-center justify-center w-full h-full min-h-[300px]">
            {/* Center Red Dot Container */}
            <div className="relative flex items-center justify-center w-40 h-40 bg-red-600 rounded-full shadow-sm overflow-hidden z-10">

                {/* Ticker Text (Inside the dot) */}
                <motion.div
                    className="absolute whitespace-nowrap font-['Outfit'] font-bold text-2xl tracking-widest lowercase text-icy-black"
                    initial={{ x: "-150%" }}
                    animate={{ x: "150%" }}
                    transition={{
                        duration: 3,
                        ease: "linear",
                        repeat: Infinity
                    }}
                >
                    {textSnippet}
                </motion.div>
            </div>
        </div>
    );
};
