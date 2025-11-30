import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type MeasurementType = 'guard' | 't-line' | 'center-line' | 'closest-ring';

export interface MeasurementStep {
    id: string;
    types: MeasurementType[];
}

export interface MeasurementSettings {
    guardZone: MeasurementStep[];
    houseZone: MeasurementStep[];
    nearHouseZone: MeasurementStep[];
}

export interface MeasurementDisplaySettings {
    guard: {
        showBraceLine: boolean;
        showPercentage: boolean;
        showDistance: boolean;
    };
    tLine: {
        showLine: boolean;
        showDistance: boolean;
    };
    centerLine: {
        showLine: boolean;
        showDistance: boolean;
    };
    closestRing?: {
        showLine: boolean;
        showDistance: boolean;
    };
    nearHouseZone?: {
        showTLine: boolean;
        showCenterLine: boolean;
        showClosestRing: boolean;
    };
}

export interface ToggleModeSettings {
    guardZone: {
        showGuard: boolean;
        showTLine: boolean;
        showCenterLine: boolean;
    };
    houseZone: {
        showTLine: boolean;
        showCenterLine: boolean;
        showClosestRing?: boolean;
    };
    nearHouseZone: {
        showTLine: boolean;
        showCenterLine: boolean;
        showClosestRing: boolean;
    };
}

interface SettingsContextType {
    settings: MeasurementSettings;
    displaySettings: MeasurementDisplaySettings;
    toggleModeSettings: ToggleModeSettings;
    updateSettings: (newSettings: MeasurementSettings) => void;
    updateDisplaySettings: (newDisplaySettings: MeasurementDisplaySettings) => void;
    updateToggleModeSettings: (zone: keyof ToggleModeSettings, key: string, value: boolean) => void;
    isSettingsOpen: boolean;
    openSettings: () => void;
    closeSettings: () => void;
}

const defaultSettings: MeasurementSettings = {
    guardZone: [
        { id: 'g1', types: ['guard'] },
        { id: 'g2', types: ['t-line', 'center-line'] }
    ],
    houseZone: [
        { id: 'h1', types: ['t-line', 'center-line', 'closest-ring'] }
    ],
    nearHouseZone: [
        { id: 'n1', types: ['closest-ring'] },
        { id: 'n2', types: ['t-line', 'center-line'] }
    ]
};

const defaultDisplaySettings: MeasurementDisplaySettings = {
    guard: {
        showBraceLine: true,
        showPercentage: true,
        showDistance: true
    },
    tLine: {
        showLine: true,
        showDistance: true
    },
    centerLine: {
        showLine: true,
        showDistance: true
    },
    closestRing: {
        showLine: true,
        showDistance: true
    },
    nearHouseZone: {
        showTLine: false,
        showCenterLine: false,
        showClosestRing: true
    }
};

const defaultToggleModeSettings: ToggleModeSettings = {
    guardZone: {
        showGuard: true,
        showTLine: false,
        showCenterLine: false
    },
    houseZone: {
        showTLine: true,
        showCenterLine: true,
        showClosestRing: true
    },
    nearHouseZone: {
        showTLine: false,
        showCenterLine: false,
        showClosestRing: true
    }
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

const STORAGE_KEYS = {
    MEASUREMENT_SETTINGS: 'curling_measurement_settings',
    DISPLAY_SETTINGS: 'curling_display_settings',
    TOGGLE_MODE_SETTINGS: 'curling_toggle_mode_settings'
};

// Helper to safely load from localStorage
const loadFromStorage = <T,>(key: string, defaultValue: T): T => {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
        console.error(`Error loading ${key} from localStorage:`, error);
        return defaultValue;
    }
};

// Helper to safely save to localStorage
const saveToStorage = <T,>(key: string, value: T): void => {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
        console.error(`Error saving ${key} to localStorage:`, error);
    }
};

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [settings, setSettings] = useState<MeasurementSettings>(() => {
        const stored = loadFromStorage(STORAGE_KEYS.MEASUREMENT_SETTINGS, defaultSettings);
        // Merge with defaults to ensure new keys (like nearHouseZone) are present
        return {
            ...defaultSettings,
            ...stored,
            // Ensure arrays are present if stored object is partial
            guardZone: stored.guardZone || defaultSettings.guardZone,
            houseZone: stored.houseZone || defaultSettings.houseZone,
            nearHouseZone: stored.nearHouseZone || defaultSettings.nearHouseZone
        };
    });
    const [displaySettings, setDisplaySettings] = useState<MeasurementDisplaySettings>(() => {
        const stored = loadFromStorage(STORAGE_KEYS.DISPLAY_SETTINGS, defaultDisplaySettings);
        // Merge with defaults to ensure new keys (like closestRing) are present
        return { ...defaultDisplaySettings, ...stored, closestRing: { ...defaultDisplaySettings.closestRing, ...stored.closestRing } };
    });
    const [toggleModeSettings, setToggleModeSettings] = useState<ToggleModeSettings>(() => {
        const stored = loadFromStorage(STORAGE_KEYS.TOGGLE_MODE_SETTINGS, defaultToggleModeSettings);
        // Merge with defaults to ensure new keys are present
        return {
            ...defaultToggleModeSettings,
            ...stored,
            houseZone: { ...defaultToggleModeSettings.houseZone, ...stored.houseZone }
        };
    });
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    // Save to localStorage whenever settings change
    useEffect(() => {
        saveToStorage(STORAGE_KEYS.MEASUREMENT_SETTINGS, settings);
    }, [settings]);

    useEffect(() => {
        saveToStorage(STORAGE_KEYS.DISPLAY_SETTINGS, displaySettings);
    }, [displaySettings]);

    useEffect(() => {
        saveToStorage(STORAGE_KEYS.TOGGLE_MODE_SETTINGS, toggleModeSettings);
    }, [toggleModeSettings]);

    const updateSettings = (newSettings: MeasurementSettings) => {
        setSettings(newSettings);
    };

    const updateDisplaySettings = (newDisplaySettings: MeasurementDisplaySettings) => {
        setDisplaySettings(newDisplaySettings);
    };

    const updateToggleModeSettings = (zone: keyof ToggleModeSettings, key: string, value: boolean) => {
        setToggleModeSettings(prev => ({
            ...prev,
            [zone]: {
                ...prev[zone],
                [key]: value
            }
        }));
    };

    const openSettings = () => setIsSettingsOpen(true);
    const closeSettings = () => setIsSettingsOpen(false);

    return (
        <SettingsContext.Provider value={{ settings, displaySettings, toggleModeSettings, updateSettings, updateDisplaySettings, updateToggleModeSettings, isSettingsOpen, openSettings, closeSettings }}>
            {children}
        </SettingsContext.Provider>
    );
};

export const useSettings = () => {
    const context = useContext(SettingsContext);
    if (context === undefined) {
        throw new Error('useSettings must be used within a SettingsProvider');
    }
    return context;
};
