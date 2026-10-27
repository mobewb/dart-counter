import type { GameMode } from '../shared-kernel/game-mode'
import { applyDart, newMatch, type CricketConfig, type CricketMatch } from './cricket'

/** Standard and crazy cricket alike; the config's target policy tells them apart. */
export const mode: GameMode<CricketConfig, CricketMatch> = {
  newMatch,
  applyDart,
  tally: (state) => state.players.map((p) => ({ points: p.points, dartsThrown: p.dartsThrown })),
  headline: (tally) => tally.points,
}
