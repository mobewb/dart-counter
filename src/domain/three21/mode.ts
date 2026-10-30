import type { GameMode } from '../shared-kernel/game-mode'
import { applyDart, newMatch, type Three21Config, type Three21Match } from './three21'

export const mode: GameMode<Three21Config, Three21Match> = {
  newMatch,
  applyDart,
  // Points are the current score, so bounces and knock-backs take points away.
  tally: (state) => state.players.map((p) => ({ points: p.score, dartsThrown: p.dartsThrown })),
  headline: (tally) => tally.points,
}
