import React from 'react';
import { Users, Check, Loader2, Dices } from 'lucide-react';
import { Dialog } from './ui/Dialog';
import { Button } from './ui/Button';
import { DiceResultOverlay } from './DiceResultOverlay';

interface FirstPlayerDecisionProps {
    players: { id: string; name: string; color: 'red' | 'yellow' }[];
    teamColors: { red: string; yellow: string };
    myPlayerId: string;
    myVote: string | null;
    opponentHasVoted: boolean;
    onVote: (votedForId: string) => void;
    diceRolls?: Record<string, number>;
    firstPlayer?: string | null;
    onDiceClose?: () => void;
}

export const FirstPlayerDecision: React.FC<FirstPlayerDecisionProps> = ({
    players,
    teamColors,
    myPlayerId,
    myVote,
    opponentHasVoted,
    onVote,
    diceRolls,
    firstPlayer,
    onDiceClose,
}) => {
    const me = players.find(p => p.id === myPlayerId);
    const opponent = players.find(p => p.id !== myPlayerId);

    if (!me || !opponent) return null;

    // Show dice result overlay if dice were rolled
    const hasDiceRolls = diceRolls && Object.keys(diceRolls).length > 0 && firstPlayer;

    if (hasDiceRolls) {
        return (
            <DiceResultOverlay
                isVisible={true}
                myRoll={diceRolls[myPlayerId] || 0}
                opponentRoll={diceRolls[opponent.id] || 0}
                winnerId={firstPlayer}
                myPlayerId={myPlayerId}
                teamColors={teamColors}
                myColor={me.color}
                onClose={onDiceClose || (() => { })}
            />
        );
    }

    const getPlayerDisplayName = (player: typeof me) => {
        return player.id === myPlayerId ? 'I start' : 'Opponent starts';
    };

    // Get the actual team color (hex) for a player
    const getTeamColor = (player: typeof me) => {
        return teamColors[player.color] || (player.color === 'red' ? '#cc0000' : '#e6b800');
    };

    // Darken a hex color for hover/border
    const darkenColor = (hex: string, percent: number = 15) => {
        const num = parseInt(hex.replace('#', ''), 16);
        const r = Math.max(0, (num >> 16) - Math.round(255 * percent / 100));
        const g = Math.max(0, ((num >> 8) & 0x00FF) - Math.round(255 * percent / 100));
        const b = Math.max(0, (num & 0x0000FF) - Math.round(255 * percent / 100));
        return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, '0')}`;
    };

    // Create header icon for the dialog
    const headerIcon = (
        <div className="w-16 h-16 rounded-full bg-lavender-100 flex items-center justify-center">
            <Users className="text-lavender-500" size={32} />
        </div>
    );

    const isRandomizeSelected = myVote === 'randomize';

    return (
        <Dialog
            isOpen={true}
            onClose={() => { }} // Cannot close this dialog - must vote
            title="who starts?"
            variant="info"
            headerIcon={headerIcon}
        >
            <p className="text-gray-600 mb-6 text-center">
                Both players must agree on who places first.
            </p>

            <div className="space-y-3">
                {/* Vote for myself */}
                <Button
                    onClick={() => onVote(me.id)}
                    disabled={myVote === me.id}
                    variant={myVote === me.id ? 'outline' : 'primary'}
                    className={`w-full h-14 text-base font-semibold ${myVote === me.id
                        ? 'bg-green-50 border-green-500 text-green-700'
                        : ''
                        }`}
                    style={myVote !== me.id ? {
                        backgroundColor: getTeamColor(me),
                        borderColor: darkenColor(getTeamColor(me)),
                        color: 'white',
                    } : undefined}
                >
                    <span className="flex-grow text-left">{getPlayerDisplayName(me)}</span>
                    {myVote === me.id && <Check size={20} />}
                </Button>

                {/* Vote for opponent */}
                <Button
                    onClick={() => onVote(opponent.id)}
                    disabled={myVote === opponent.id}
                    variant={myVote === opponent.id ? 'outline' : 'primary'}
                    className={`w-full h-14 text-base font-semibold ${myVote === opponent.id
                        ? 'bg-green-50 border-green-500 text-green-700'
                        : ''
                        }`}
                    style={myVote !== opponent.id ? {
                        backgroundColor: getTeamColor(opponent),
                        borderColor: darkenColor(getTeamColor(opponent)),
                        color: 'white',
                    } : undefined}
                >
                    <span className="flex-grow text-left">{getPlayerDisplayName(opponent)}</span>
                    {myVote === opponent.id && <Check size={20} />}
                </Button>

                {/* Divider */}
                <div className="flex items-center gap-3 py-2">
                    <div className="flex-grow h-px bg-gray-200" />
                    <span className="text-gray-400 text-sm">or</span>
                    <div className="flex-grow h-px bg-gray-200" />
                </div>

                {/* Randomize button */}
                <Button
                    onClick={() => onVote('randomize')}
                    disabled={isRandomizeSelected}
                    variant={isRandomizeSelected ? 'outline' : 'ghost'}
                    className={`w-full h-14 text-base font-semibold ${isRandomizeSelected
                        ? 'bg-lavender-50 border-lavender-500 text-lavender-700'
                        : 'border border-gray-200 hover:border-lavender-300 hover:bg-lavender-50'
                        }`}
                >
                    <Dices size={22} className={isRandomizeSelected ? 'text-lavender-500' : 'text-gray-500'} />
                    <span className="flex-grow text-left">Roll dice</span>
                    {isRandomizeSelected && <Check size={20} />}
                </Button>
            </div>

            {/* Status */}
            <div className="mt-6 text-center">
                {myVote ? (
                    <div className="flex items-center justify-center gap-2 text-gray-500">
                        {opponentHasVoted ? (
                            <span className="text-amber-600 font-medium">
                                Votes don't match - try again!
                            </span>
                        ) : (
                            <>
                                <Loader2 size={16} className="animate-spin" />
                                <span>Waiting for opponent...</span>
                            </>
                        )}
                    </div>
                ) : (
                    <span className="text-gray-400">Select who should start</span>
                )}
            </div>
        </Dialog>
    );
};

export default FirstPlayerDecision;


