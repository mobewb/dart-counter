import { killer } from '../../domain'
import type { Call } from '../caller'
import type { ModeModule } from './types'

export interface KillerStats {
  dartsThrown: number
  /** Lives taken from opponents. */
  livesTaken: number
  /** Opponents knocked out. */
  eliminations: number
}

/** A player's Killer figures across the match history. */
export type KillerRecord = KillerStats & { matches: number }

export const killerModule: ModeModule<'killer'> = {
  id: 'killer',
  family: 'killer',
  rules: killer.mode,
  minSides: 2,
  deal: (options, sides) => ({ ...options, playerCount: sides }),

  stats(log, setup) {
    const stats = setup.names.map(() => ({ dartsThrown: 0, livesTaken: 0, eliminations: 0 }))
    for (const { side, player, before, after, events } of log) {
      const was = before.players[side]!
      const now = after.players[side]!
      const me = stats[player]!
      // Draw darts change nothing here: they are not counted.
      me.dartsThrown += now.dartsThrown - was.dartsThrown
      me.livesTaken += now.livesTaken - was.livesTaken
      me.eliminations += events.filter((e) => e.type === 'PlayerEliminated' && e.player !== side).length
    }
    return stats
  },

  /** Killer calls every draw, arming and knockout as it happens, then the winner. */
  calls: ({ last, sideNames }) =>
    last.events.flatMap((e): Call[] => {
      switch (e.type) {
        case 'NumberDrawn': return [{ type: 'drawn', player: sideNames[e.player]!, number: e.number }]
        case 'KillerArmed': return [{ type: 'killer', player: sideNames[e.player]! }]
        case 'PlayerEliminated': return [{ type: 'out', player: sideNames[e.player]! }]
        case 'MatchWon': return [{ type: 'winner', winner: sideNames[e.player]! }]
        default: return []
      }
    }),

  history: {
    empty: { matches: 0, dartsThrown: 0, livesTaken: 0, eliminations: 0 },
    add: (record, stats) => ({
      matches: record.matches + 1,
      dartsThrown: record.dartsThrown + stats.dartsThrown,
      livesTaken: record.livesTaken + stats.livesTaken,
      eliminations: record.eliminations + stats.eliminations,
    }),
  },
}
