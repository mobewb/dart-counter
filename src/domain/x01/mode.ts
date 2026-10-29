import type { GameMode } from '../shared-kernel/game-mode'
import { withRoundLimit, type Limited } from '../shared-kernel/round-limit'
import { applyDart, newMatch, winLeg } from './match'
import { threeDartAverage } from './stats'
import type { X01Config, X01Match } from './types'

export const mode: GameMode<X01Config, Limited<X01Match>> = withRoundLimit(
  {
    newMatch,
    applyDart,
    tally: (state) => state.players.map((p) => ({ points: p.pointsScored, dartsThrown: p.dartsThrown })),
    headline: ({ points, dartsThrown }) => threeDartAverage({ pointsScored: points, dartsThrown }),
  },
  {
    // The limit is per leg: the lowest remaining score takes it.
    standing: (state, side) => [-state.players[side]!.remaining],
    award: (state, side) => {
      // The thrower's turn has already ended; the leg winner did not throw.
      const won = winLeg(state, side)
      return { ...won, events: won.events.filter((e) => e.type !== 'TurnEnded') }
    },
  },
)
