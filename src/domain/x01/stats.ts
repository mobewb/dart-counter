import type { PlayerState } from './types'

/** Points per 3 darts, counting darts of busted turns but not their points. */
export function threeDartAverage(player: PlayerState): number {
  if (player.dartsThrown === 0) return 0
  return (player.pointsScored / player.dartsThrown) * 3
}
