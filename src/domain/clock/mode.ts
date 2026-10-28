import type { GameMode } from '../shared-kernel/game-mode'
import { applyDart, newMatch, type ClockConfig, type ClockMatch } from './clock'

export const mode: GameMode<ClockConfig, ClockMatch> = {
  newMatch,
  applyDart,
  // Points are targets cleared; the headline is how far a side got.
  tally: (state) => state.players.map((p) => ({ points: p.progress, dartsThrown: p.dartsThrown })),
  headline: (tally) => tally.points,
}
