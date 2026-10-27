import type { GameMode } from '../shared-kernel/game-mode'
import { applyDart, newMatch, type CricketConfig, type CricketMatch } from './cricket'

/** Standard and crazy cricket alike; the config's target policy tells them apart. */
export const mode: GameMode<CricketConfig, CricketMatch> = {
  newMatch,
  applyDart,
  results: (state) => state.players.map((p) => ({ value: p.points, dartsThrown: p.dartsThrown })),
}
