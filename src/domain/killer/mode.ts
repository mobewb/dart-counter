import type { GameMode } from '../shared-kernel/game-mode'
import { withRoundLimit, type Limited } from '../shared-kernel/round-limit'
import { applyDart, isAlive, newMatch, type KillerConfig, type KillerMatch } from './killer'

export const mode: GameMode<KillerConfig, Limited<KillerMatch>> = withRoundLimit(
  {
    newMatch,
    applyDart,
    // Lives lost belong to the victim, so a side's points are the lives it took.
    tally: (state) => state.players.map((p) => ({ points: p.livesTaken, dartsThrown: p.dartsThrown })),
    headline: (tally) => tally.points,
  },
  {
    // Most lives left.
    standing: (state, side) => [state.players[side]!.lives],
    inPlay: (state, side) => isAlive(state.players[side]!),
    // The draw for numbers is not a round.
    counts: (state) => state.phase === 'play',
  },
)
