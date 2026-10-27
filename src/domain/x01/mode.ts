import type { GameMode } from '../shared-kernel/game-mode'
import { applyDart, newMatch } from './match'
import { threeDartAverage } from './stats'
import type { X01Config, X01Match } from './types'

export const mode: GameMode<X01Config, X01Match> = {
  newMatch,
  applyDart,
  results: (state) => state.players.map((p) => ({ value: threeDartAverage(p), dartsThrown: p.dartsThrown })),
}
