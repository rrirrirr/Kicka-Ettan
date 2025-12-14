// Game type definitions that mirror the backend
// The frontend can fetch these from /api/game_types, but we keep
// local definitions as fallbacks for offline/initial load

import { config } from '../config';

export type GameTypeVisibility = 'playable' | 'coming_soon' | 'hidden';

export interface GameTypeSetting {
    type: 'integer' | 'boolean' | 'select';
    label: string;
    description: string;
    min?: number;
    max?: number;
    default: number | boolean | string;
    options?: string[];
    optionValues?: Record<string, number>; // Map option labels to numeric values
    valueLabels?: Record<number, string>; // Map numeric values to display labels (e.g. 0 -> '∞')
    important?: boolean; // If true, shown on front page; otherwise hidden in "more settings"
}

export interface GameType {
    id: string;
    name: string;
    visibility: GameTypeVisibility;
    shortDescription: string;
    longDescription: string;
    settingsSchema: Record<string, GameTypeSetting>;
    defaultSettings: Record<string, number | boolean | string>;
}

// Fallback game types used for initial render before API response
export const FALLBACK_GAME_TYPES: GameType[] = [
    {
        id: 'blind_pick',
        name: 'Blind Pick',
        visibility: 'playable',
        shortDescription: 'Place stones without seeing your opponent',
        longDescription: `Both players place their stones simultaneously without seeing where their opponent places theirs.

Once both players confirm their placements, all stones are revealed and any collisions are resolved automatically.

Simple, fast, and all about reading your opponent's mind!`,
        settingsSchema: {
            stones_per_team: {
                type: 'integer',
                label: 'Stones per Team',
                description: 'Number of stones each team can place per round',
                min: 1,
                max: 8,
                default: 3,
                important: true
            },
            total_rounds: {
                type: 'integer',
                label: 'Number of Rounds',
                description: 'How many rounds to play',
                min: 0,
                max: 10,
                default: 0,
                valueLabels: {
                    0: '∞'
                },
                important: false
            }
        },
        defaultSettings: {
            stones_per_team: 3,
            total_rounds: 0
        }
    },
    {
        id: 'ban_pick',
        name: 'Ban Pick',
        visibility: 'playable',
        shortDescription: 'Ban a zone, then place stones blind',
        longDescription: `Ban Pick adds a strategic ban phase before stone placement.

Each player places a circular "ban zone" where their opponent cannot place any stones. This forces creative positioning and rewards smart area denial.

After banning, both players place their stones simultaneously without seeing the opponent's placements — just like Blind Pick. Once confirmed, all stones are revealed and collisions resolved.

The ban zones add a layer of strategic depth!`,
        settingsSchema: {
            stones_per_team: {
                type: 'integer',
                label: 'Stones per Team',
                description: 'Number of stones each team can place per round',
                min: 1,
                max: 8,
                default: 3,
                important: true
            },
            total_rounds: {
                type: 'integer',
                label: 'Number of Rounds',
                description: 'How many rounds to play',
                min: 0,
                max: 10,
                default: 0,
                valueLabels: {
                    0: '∞'
                },
                important: false
            },
            ban_circle_radius: {
                type: 'select',
                label: 'Ban Circle Size',
                description: 'Size of the banned zone circle',
                options: ['small', 'medium', 'large', 'xl'],
                optionValues: {
                    'small': 30,
                    'medium': 60,
                    'large': 90,
                    'xl': 120
                },
                default: 'medium',
                important: true
            }
        },
        defaultSettings: {
            stones_per_team: 3,
            total_rounds: 0,
            ban_circle_radius: 'medium'
        }
    },
    {
        id: 'turn_double_ban_open_pick',
        name: 'Turn Double Ban Open Pick',
        visibility: 'playable',
        shortDescription: '2 bans + increasing stones (Turn Based)',
        longDescription: `A strategic game mode with double ban zones and escalating stone counts!

Players alternate turns placing either a ban zone or a stone.
Visibility is OPEN - you see what your opponent places.

Stones increase each round:
- Round 1: 3 stones
- Round 2: 4 stones
- Round 3: 5 stones

Single unified bar controls everything!`,
        settingsSchema: {},
        defaultSettings: {
            stones_per_team: 3,
            total_rounds: 3,
            ban_circle_radius: 60,
            bans_per_team: 2
        }
    }
    // Future game types:
    // - turn_based: Take turns placing stones with visibility
];

// Current game types - starts with fallback, can be updated via fetchGameTypes
export let GAME_TYPES: GameType[] = [...FALLBACK_GAME_TYPES];

/**
 * Fetch game types from the API and update the GAME_TYPES list.
 * Returns the fetched game types, or fallback if fetch fails.
 */
export const fetchGameTypes = async (): Promise<GameType[]> => {
    try {
        const response = await fetch(`${config.apiUrl}/api/game_types`);
        if (!response.ok) {
            console.warn('Failed to fetch game types, using fallback');
            return FALLBACK_GAME_TYPES;
        }
        const data = await response.json();
        if (data.game_types && Array.isArray(data.game_types)) {
            GAME_TYPES = data.game_types;
            return GAME_TYPES;
        }
        return FALLBACK_GAME_TYPES;
    } catch (error) {
        console.warn('Error fetching game types:', error);
        return FALLBACK_GAME_TYPES;
    }
};

export const getGameType = (id: string): GameType | undefined => {
    return GAME_TYPES.find(gt => gt.id === id);
};

export const getDefaultGameType = (): GameType => {
    // Return the first playable game type
    const playable = GAME_TYPES.find(gt => gt.visibility === 'playable');
    return playable || GAME_TYPES[0];
};

/**
 * Get game types that should be shown in the selector (playable + coming_soon).
 */
export const getSelectableGameTypes = (): GameType[] => {
    return GAME_TYPES.filter(gt => gt.visibility !== 'hidden');
};

/**
 * Get only playable game types.
 */
export const getPlayableGameTypes = (): GameType[] => {
    return GAME_TYPES.filter(gt => gt.visibility === 'playable');
};

