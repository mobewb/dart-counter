import { three21 } from '../../domain'
import type { ModeModule } from './types'

export interface Three21Stats {
  dartsThrown: number
  /** Opponents sent back to 0 by landing on their score. */
  knockBacks: number
  /** Darts that went over 321 and bounced back. */
  bounces: number
}

/** A player's 321 figures across the match history. */
export type Three21Record = Three21Stats & { matches: number }

export const three21Module: ModeModule<'three21'> = {
  id: 'three21',
  family: 'three21',
  rules: three21.mode,
  minSides: 1,
  deal: (_, sides) => ({ playerCount: sides }),

  stats(log, setup) {
    const stats = setup.names.map(() => ({ dartsThrown: 0, knockBacks: 0, bounces: 0 }))
    for (const { player, events } of log) {
      stats[player]!.dartsThrown++
      for (const event of events) {
        if (event.type === 'KnockedBack') stats[player]!.knockBacks += event.players.length
        if (event.type === 'Bounced') stats[player]!.bounces++
      }
    }
    return stats
  },

  history: {
    empty: { matches: 0, dartsThrown: 0, knockBacks: 0, bounces: 0 },
    add: (record, stats) => ({
      matches: record.matches + 1,
      dartsThrown: record.dartsThrown + stats.dartsThrown,
      knockBacks: record.knockBacks + stats.knockBacks,
      bounces: record.bounces + stats.bounces,
    }),
  },
}
