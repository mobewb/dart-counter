import type { GameMode } from '../shared-kernel/game-mode'
import { withRoundLimit, type Limited } from '../shared-kernel/round-limit'
import { applyDart, newMatch, type CricketConfig, type CricketMatch } from './cricket'

const totalMarks = (marks: Record<number, number>) => Object.values(marks).reduce((a, b) => a + b, 0)

/** Standard and crazy cricket alike; the config's target policy tells them apart. */
export const mode: GameMode<CricketConfig, Limited<CricketMatch>> = withRoundLimit(
  {
    newMatch,
    applyDart,
    tally: (state) => state.players.map((p) => ({ points: p.points, dartsThrown: p.dartsThrown })),
    headline: (tally) => tally.points,
  },
  // Most points, then most marks.
  { standing: (state, side) => [state.players[side]!.points, totalMarks(state.players[side]!.marks)] },
)
