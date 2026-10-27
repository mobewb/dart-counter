import type { GameMode } from '../shared-kernel/game-mode'
import { applyDart, newMatch } from './match'
import { threeDartAverage } from './stats'
import type { X01Config, X01Match } from './types'

export const mode: GameMode<X01Config, X01Match> = {
  newMatch,
  applyDart,
  tally: (state) => state.players.map((p) => ({ points: p.pointsScored, dartsThrown: p.dartsThrown })),
  headline: ({ points, dartsThrown }) => threeDartAverage({ pointsScored: points, dartsThrown }),
}
