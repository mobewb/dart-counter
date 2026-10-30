import { cricket } from '../../domain'
import type { ModeModule, Random, Setup, StateOf, Step } from './types'

export interface CricketStats {
  dartsThrown: number
  points: number
  /** Marks hit on targets, scoring marks included. */
  marks: number
  /** Marks per round of 3 darts. */
  marksPerRound: number
}

/** A player's cricket figures across the match history, Crazy Cricket included. */
export interface CricketRecord {
  matches: number
  dartsThrown: number
  marks: number
  marksPerRound: number
}

const perThree = (total: number, darts: number) => (darts === 0 ? 0 : (total / darts) * 3)

/**
 * Crazy Cricket deals six random numbers (high to low) plus the bull, and
 * keeps the shuffled numbers left over as its reroll pool.
 */
function dealCrazy(playerCount: number, random: Random): cricket.CricketConfig {
  const numbers = Array.from({ length: 20 }, (_, i) => i + 1)
  for (let i = numbers.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[numbers[i], numbers[j]] = [numbers[j]!, numbers[i]!]
  }
  const targets = [...numbers.slice(0, 6).sort((a, b) => b - a), cricket.BULL]
  return { playerCount, targets, targetPolicy: { kind: 'reroll', pool: numbers.slice(6) } }
}

/** Shared by Cricket and Crazy Cricket. */
function stats(log: readonly Step<StateOf<'cricket'>>[], setup: Setup<'cricket' | 'crazy'>): CricketStats[] {
  const stats = setup.names.map(() => ({ dartsThrown: 0, points: 0, marks: 0 }))
  for (const { dart, side, player, before, after } of log) {
    const me = stats[player]!
    me.dartsThrown++
    if (dart.segment !== 0 && before.targets.includes(dart.segment)) me.marks += dart.multiplier
    me.points += after.players[side]!.points - before.players[side]!.points
  }
  return stats.map((s) => ({ ...s, marksPerRound: perThree(s.marks, s.dartsThrown) }))
}

/** Everything Cricket and Crazy Cricket share: all but the deal. */
const shared = {
  family: 'cricket',
  rules: cricket.mode,
  minSides: 1,
  stats,
  history: {
    empty: { matches: 0, dartsThrown: 0, marks: 0, marksPerRound: 0 },
    add(record, stats) {
      const dartsThrown = record.dartsThrown + stats.dartsThrown
      const marks = record.marks + stats.marks
      return { matches: record.matches + 1, dartsThrown, marks, marksPerRound: perThree(marks, dartsThrown) }
    },
  },
} satisfies Omit<ModeModule<'cricket'>, 'id' | 'deal'>

/** Standard cricket: 20 to 15 and the bull. */
export const cricketModule: ModeModule<'cricket'> = {
  ...shared,
  id: 'cricket',
  deal: (_, sides) => ({ playerCount: sides, targets: cricket.CRICKET_TARGETS, targetPolicy: { kind: 'fixed' } }),
}

/** Crazy Cricket: Cricket with random targets, dealt again for a rematch. */
export const crazyModule: ModeModule<'crazy'> = {
  ...shared,
  id: 'crazy',
  deal: (_, sides, random) => dealCrazy(sides, random),
  redeal: (config, random) => dealCrazy(config.playerCount, random),
}
