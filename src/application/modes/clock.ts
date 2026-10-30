import { clock } from '../../domain'
import type { ModeModule } from './types'

export interface ClockStats {
  dartsThrown: number
  /** Darts that hit the current target. */
  hits: number
  /** Share of darts that hit the target, 0 to 1. */
  hitRate: number
}

/** A player's Around the Clock figures across the match history. */
export type ClockRecord = ClockStats & { matches: number }

const rate = (hits: number, darts: number) => (darts === 0 ? 0 : hits / darts)

export const clockModule: ModeModule<'clock'> = {
  id: 'clock',
  family: 'clock',
  rules: clock.mode,
  minSides: 1,
  deal: (_, sides) => ({ playerCount: sides, sequence: clock.CLOCK_SEQUENCE, skipAhead: true }),

  stats(log, setup) {
    const stats = setup.names.map(() => ({ dartsThrown: 0, hits: 0 }))
    for (const { side, player, before, after } of log) {
      stats[player]!.dartsThrown++
      // A skip-ahead double or triple moves several targets on but is one hit.
      if (after.players[side]!.progress > before.players[side]!.progress) stats[player]!.hits++
    }
    return stats.map((s) => ({ ...s, hitRate: rate(s.hits, s.dartsThrown) }))
  },

  history: {
    empty: { matches: 0, dartsThrown: 0, hits: 0, hitRate: 0 },
    add(record, stats) {
      const dartsThrown = record.dartsThrown + stats.dartsThrown
      const hits = record.hits + stats.hits
      return { matches: record.matches + 1, dartsThrown, hits, hitRate: rate(hits, dartsThrown) }
    },
  },
}
