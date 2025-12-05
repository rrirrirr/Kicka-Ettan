import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type MeasurementType = 'guard' | 't-line' | 'center-line' | 'closest-ring' | 'stone-to-stone';
export type UnitSystem = 'metric' | 'imperial' | 'smart';

export interface SmartUnitRule {
    maxDistance: number; // in cm
    unit: 'metric' | 'imperial' | 'stone' | 'broom';
}

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
        showBroomLength: boolean;
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
    stoneToStone?: {
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

export interface SheetStyle {
    id: string;
    name: string;
    colors: {
        ice: string;
        lines: string;
        hogLine: string;
        house: {
            ring12: string;
            ring8: string;
            ring4: string;
            button: string;
            stroke: string;
        };
        text: string;
    };
    markings?: Array<{ x: number; y: number }>;
}

export const SHEET_STYLES: SheetStyle[] = [
    {
        id: 'classic',
        name: 'Classic',
        colors: {
            ice: '#F0F8FF',
            lines: '#252333',
            hogLine: '#D22730',
            house: {
                ring12: '#185494',
                ring8: '#ffffff',
                ring4: '#D22730',
                button: '#ffffff',
                stroke: '#252333'
            },
            text: 'rgba(0,0,0,0.1)'
        }
    },

    {
        id: 'mixed-doubles',
        name: 'Mixed Doubles',
        colors: {
            ice: '#F0F8FF',
            lines: '#252333',
            hogLine: '#D22730',
            house: {
                ring12: '#185494',
                ring8: '#ffffff',
                ring4: '#D22730',
                button: '#ffffff',
                stroke: '#252333'
            },
            text: 'rgba(0,0,0,0.1)'
        },
        markings: [
            // Measurements from top of house (VIEW_TOP_OFFSET - HOUSE_RADIUS_12)
            // Top of house is at Y = VIEW_TOP_OFFSET - HOUSE_RADIUS_12 = 640 - 183 = 457

            // Centerline marks (x = SHEET_WIDTH / 2 = 237.5)
            { x: 237.5, y: 457 - 137.16 },  // 54" mark (137.16 cm)
            { x: 237.5, y: 457 - 228.6 },   // 90" mark (228.6 cm)
            { x: 237.5, y: 457 - 320.04 },  // 126" mark (320.04 cm)

            // Left power play line marks (approximately 60cm left of center)
            { x: 177.5, y: 457 - 137.16 },  // Position #4 (aligned with 54" mark)
            { x: 177.5, y: 457 - 228.6 },   // Position #3 (aligned with 90" mark)
            { x: 177.5, y: 457 - 320.04 },  // Position #5 (aligned with 126" mark)

            // Right power play line marks (approximately 60cm right of center)
            { x: 297.5, y: 457 - 137.16 },  // Position #4 (aligned with 54" mark)
            { x: 297.5, y: 457 - 228.6 },   // Position #3 (aligned with 90" mark)
            { x: 297.5, y: 457 - 320.04 },  // Position #5 (aligned with 126" mark)
        ]
    }
];

export interface SheetSettings {
    friction: number;
    styleId: string;
}

export const defaultSheetSettings: SheetSettings = {
    friction: 1.0,
    styleId: 'classic'
};

interface SettingsContextType {
    settings: MeasurementSettings;
    displaySettings: MeasurementDisplaySettings;
    toggleModeSettings: ToggleModeSettings;
    updateSettings: (newSettings: MeasurementSettings) => void;
    updateDisplaySettings: (newDisplaySettings: MeasurementDisplaySettings) => void;
    updateToggleModeSettings: (zone: keyof ToggleModeSettings, key: string, value: boolean) => void;
    sheetSettings: SheetSettings;
    updateSheetSettings: (newSettings: SheetSettings) => void;
    isSettingsOpen: boolean;
    openSettings: () => void;
    closeSettings: () => void;
    unitSystem: UnitSystem;
    baseUnitSystem: 'metric' | 'imperial';
    updateUnitSystem: (system: UnitSystem) => void;
    updateBaseUnitSystem: (system: 'metric' | 'imperial') => void;
    smartUnits: SmartUnitRule[];
    updateSmartUnits: (rules: SmartUnitRule[]) => void;
}

const defaultSettings: MeasurementSettings = {
    guardZone: [
        { id: 'g1', types: ['guard', 'center-line'] }
    ],
    houseZone: [
        { id: 'h1', types: ['closest-ring'] },
        { id: 'h2', types: ['t-line', 'center-line'] },
        { id: 'h3', types: ['stone-to-stone'] }
    ],
    nearHouseZone: [
        { id: 'n1', types: ['closest-ring', 'center-line'] }
    ]
};

const defaultDisplaySettings: MeasurementDisplaySettings = {
    guard: {
        showBraceLine: true,
        showPercentage: true,
        showDistance: true,
        showBroomLength: true
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
    stoneToStone: {
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

export const defaultSmartUnits: SmartUnitRule[] = [
    { maxDistance: 30.48, unit: 'imperial' }, // 0-1 ft -> Imperial
    { maxDistance: 60.96, unit: 'stone' },    // 1-2 ft -> Stone
    { maxDistance: 150, unit: 'imperial' },   // 2ft - ~5ft -> Imperial
    { maxDistance: 300, unit: 'broom' },      // ~5ft - ~10ft -> Broom
    { maxDistance: Infinity, unit: 'metric' } // > ~10ft -> Metric
];

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

const STORAGE_KEYS = {
    MEASUREMENT_SETTINGS: 'curling_measurement_settings',
    DISPLAY_SETTINGS: 'curling_display_settings',
    TOGGLE_MODE_SETTINGS: 'curling_toggle_mode_settings',
    SHEET_SETTINGS: 'curling_sheet_settings',
    UNIT_SYSTEM: 'curling_unit_system',
    SMART_UNITS: 'curling_smart_units'
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
        const defaultClosestRing = defaultDisplaySettings.closestRing || { showLine: true, showDistance: true };
        const storedClosestRing = stored.closestRing || {};

        const defaultStoneToStone = defaultDisplaySettings.stoneToStone || { showLine: true, showDistance: true };
        const storedStoneToStone = stored.stoneToStone || {};

        return {
            ...defaultDisplaySettings,
            ...stored,
            closestRing: { ...defaultClosestRing, ...storedClosestRing },
            stoneToStone: { ...defaultStoneToStone, ...storedStoneToStone }
        };
    });
    const [toggleModeSettings, setToggleModeSettings] = useState<ToggleModeSettings>(() => {
        const stored = loadFromStorage(STORAGE_KEYS.TOGGLE_MODE_SETTINGS, defaultToggleModeSettings);
        // Merge with defaults to ensure new keys are present
        return {
            ...defaultToggleModeSettings,
            ...stored,
            guardZone: { ...defaultToggleModeSettings.guardZone, ...stored.guardZone },
            houseZone: { ...defaultToggleModeSettings.houseZone, ...stored.houseZone },
            nearHouseZone: { ...defaultToggleModeSettings.nearHouseZone, ...stored.nearHouseZone }
        };
    });
    const [sheetSettings, setSheetSettings] = useState<SheetSettings>(() => {
        return loadFromStorage(STORAGE_KEYS.SHEET_SETTINGS, defaultSheetSettings);
    });
    const [unitSystem, setUnitSystem] = useState<UnitSystem>(() => {
        return loadFromStorage(STORAGE_KEYS.UNIT_SYSTEM, 'metric');
    });
    const [baseUnitSystem, setBaseUnitSystem] = useState<'metric' | 'imperial'>(() => {
        const stored = loadFromStorage<UnitSystem>(STORAGE_KEYS.UNIT_SYSTEM, 'metric');
        return stored === 'smart' ? 'metric' : stored;
    });
    const [smartUnits, setSmartUnits] = useState<SmartUnitRule[]>(() => {
        return loadFromStorage(STORAGE_KEYS.SMART_UNITS, defaultSmartUnits);
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

    useEffect(() => {
        saveToStorage(STORAGE_KEYS.SHEET_SETTINGS, sheetSettings);
    }, [sheetSettings]);

    useEffect(() => {
        saveToStorage(STORAGE_KEYS.UNIT_SYSTEM, unitSystem);
    }, [unitSystem]);

    useEffect(() => {
        saveToStorage(STORAGE_KEYS.SMART_UNITS, smartUnits);
    }, [smartUnits]);

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

    const updateSheetSettings = (newSettings: SheetSettings) => {
        setSheetSettings(newSettings);
    };

    const updateUnitSystem = (system: UnitSystem) => {
        setUnitSystem(system);
        // Update baseUnitSystem when switching between metric and imperial
        if (system === 'metric' || system === 'imperial') {
            setBaseUnitSystem(system);
        }
    };

    const updateBaseUnitSystem = (system: 'metric' | 'imperial') => {
        setBaseUnitSystem(system);
        // If currently using smart units, keep it enabled
        // If currently using metric/imperial directly, update to the new system
        if (unitSystem !== 'smart') {
            setUnitSystem(system);
        }
    };

    const updateSmartUnits = (rules: SmartUnitRule[]) => {
        setSmartUnits(rules);
    };

    const openSettings = () => setIsSettingsOpen(true);
    const closeSettings = () => setIsSettingsOpen(false);

    return (
        <SettingsContext.Provider value={{ settings, displaySettings, toggleModeSettings, sheetSettings, updateSettings, updateDisplaySettings, updateToggleModeSettings, updateSheetSettings, isSettingsOpen, openSettings, closeSettings, unitSystem, baseUnitSystem, updateUnitSystem, updateBaseUnitSystem, smartUnits, updateSmartUnits }}>
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
