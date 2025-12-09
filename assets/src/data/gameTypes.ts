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
        longDescription: `In Blind Pick mode, both players place their stones simultaneously 
without being able to see where their opponent places theirs. 
Once both players confirm their placements, all stones are revealed 
and any collisions are resolved.`,
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
                min: 1,
                max: 10,
                default: 3,
                important: false
            }
        },
        defaultSettings: {
            stones_per_team: 3,
            total_rounds: 3
        }
    }
    // Future game types will be added here:
    // - ban_mode: Pick and ban stones before placement
    // - turn_based: Take turns placing stones with visibility
];

export const getGameType = (id: string): GameType | undefined => {
    return GAME_TYPES.find(gt => gt.id === id);
};

export const getDefaultGameType = (): GameType => {
    return GAME_TYPES[0];
};
