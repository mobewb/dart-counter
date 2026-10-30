import type { GameMode } from '../shared-kernel/game-mode'
import { withRoundLimit, type Limited } from '../shared-kernel/round-limit'
import { applyDart, newMatch, type Three21Config, type Three21Match } from './three21'

export const mode: GameMode<Three21Config, Limited<Three21Match>> = withRoundLimit(
  {
    newMatch,
    applyDart,
    // Points are the current score, so bounces and knock-backs take points away.
    tally: (state) => state.players.map((p) => ({ points: p.score, dartsThrown: p.dartsThrown })),
    headline: (tally) => tally.points,
  },
  // Closest to 321.
  { standing: (state, side) => [state.players[side]!.score] },
)
