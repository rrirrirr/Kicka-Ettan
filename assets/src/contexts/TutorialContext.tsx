import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

const STORAGE_KEY = 'curling_tutorial_seen';

interface TutorialContextType {
    hasSeenTip: (tipId: string) => boolean;
    markTipSeen: (tipId: string) => void;
    resetTip: (tipId: string) => void;
    resetAllTips: () => void;
    seenTips: Set<string>;
}

const TutorialContext = createContext<TutorialContextType | undefined>(undefined);

// Helper to load seen tips from localStorage
const loadSeenTips = (): Set<string> => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch (error) {
        console.error('Error loading tutorial state:', error);
        return new Set();
    }
};

// Helper to save seen tips to localStorage
const saveSeenTips = (tips: Set<string>): void => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify([...tips]));
    } catch (error) {
        console.error('Error saving tutorial state:', error);
    }
};

export const TutorialProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [seenTips, setSeenTips] = useState<Set<string>>(() => loadSeenTips());

    // Persist to localStorage when seenTips changes
    useEffect(() => {
        saveSeenTips(seenTips);
    }, [seenTips]);

    const hasSeenTip = useCallback((tipId: string) => {
        return seenTips.has(tipId);
    }, [seenTips]);

    const markTipSeen = useCallback((tipId: string) => {
        setSeenTips(prev => {
            const next = new Set(prev);
            next.add(tipId);
            return next;
        });
    }, []);

    const resetTip = useCallback((tipId: string) => {
        setSeenTips(prev => {
            const next = new Set(prev);
            next.delete(tipId);
            return next;
        });
    }, []);

    const resetAllTips = useCallback(() => {
        setSeenTips(new Set());
    }, []);

    return (
        <TutorialContext.Provider value={{ hasSeenTip, markTipSeen, resetTip, resetAllTips, seenTips }}>
            {children}
        </TutorialContext.Provider>
    );
};

export const useTutorial = () => {
    const context = useContext(TutorialContext);
    if (context === undefined) {
        throw new Error('useTutorial must be used within a TutorialProvider');
    }
    return context;
};
