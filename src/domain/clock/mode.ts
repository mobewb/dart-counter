import type { GameMode } from '../shared-kernel/game-mode'
import { withRoundLimit, type Limited } from '../shared-kernel/round-limit'
import { applyDart, newMatch, type ClockConfig, type ClockMatch } from './clock'

export const mode: GameMode<ClockConfig, Limited<ClockMatch>> = withRoundLimit(
  {
    newMatch,
    applyDart,
    // Points are targets cleared; the headline is how far a side got.
    tally: (state) => state.players.map((p) => ({ points: p.progress, dartsThrown: p.dartsThrown })),
    headline: (tally) => tally.points,
  },
  // Furthest along the sequence.
  { standing: (state, side) => [state.players[side]!.progress] },
)
