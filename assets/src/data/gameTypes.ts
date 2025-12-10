// Game type definitions that mirror the backend
// These will be loaded from the server in the future

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
    shortDescription: string;
    longDescription: string;
    settingsSchema: Record<string, GameTypeSetting>;
    defaultSettings: Record<string, number | boolean | string>;
}

export const GAME_TYPES: GameType[] = [
    {
        id: 'blind_pick',
        name: 'Blind Pick',
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
    }
    // Future game types:
    // - turn_based: Take turns placing stones with visibility
];

export const getGameType = (id: string): GameType | undefined => {
    return GAME_TYPES.find(gt => gt.id === id);
};

export const getDefaultGameType = (): GameType => {
    return GAME_TYPES[0];
};
