import { describe, expect, it } from 'vitest'
import {
  CRICKET_TARGETS,
  crazyDeal,
  crazyTargets,
  newCricket,
  replayCricket,
  throwCricketDart,
  type CricketConfig,
} from './cricket'
import type { Dart } from '../shared-kernel/dart'

const s = (n: number): Dart => ({ segment: n, multiplier: 1 })
const d = (n: number): Dart => ({ segment: n, multiplier: 2 })
const t = (n: number): Dart => ({ segment: n, multiplier: 3 })
const miss: Dart = { segment: 0, multiplier: 1 }

const config = (over: Partial<CricketConfig> = {}): CricketConfig => ({
  playerCount: 2,
  targets: CRICKET_TARGETS,
  ...over,
})

describe('marks', () => {
  it('adds one mark per multiplier', () => {
    const m = replayCricket(config(), [d(20)])
    expect(m.players[0]!.marks[20]).toBe(2)
  })

  it('closes a number with a triple', () => {
    const m = replayCricket(config(), [t(19)])
    expect(m.players[0]!.marks[19]).toBe(3)
    expect(m.players[0]!.points).toBe(0)
  })

  it('ignores numbers that are not targets and misses', () => {
    const m = replayCricket(config(), [s(14), miss, s(1)])
    expect(m.players[0]!.marks).toEqual({})
    expect(m.players[0]!.points).toBe(0)
  })

  it('treats the bull as 1 mark single and 2 marks double', () => {
    const m = replayCricket(config(), [s(25), d(25)])
    expect(m.players[0]!.marks[25]).toBe(3)
  })
})

describe('scoring', () => {
  it('scores overflow marks when opponents have not closed the number', () => {
    const m = replayCricket(config(), [t(20), t(20)])
    expect(m.players[0]!.points).toBe(60)
  })

  it('scores only the overflow of the dart that closes the number', () => {
    const m = replayCricket(config(), [s(20), t(20)])
    expect(m.players[0]!.marks[20]).toBe(3)
    expect(m.players[0]!.points).toBe(20 * 1)
  })

  it('scores the bull at 25 points per mark', () => {
    const m = replayCricket(config(), [d(25), d(25)])
    expect(m.players[0]!.points).toBe(25)
  })

  it('stops scoring once every opponent has closed the number', () => {
    // P0 closes 20, P1 closes 20, then P0 hits 20 again for nothing.
    const log = [t(20), miss, miss, t(20), miss, miss, t(20)]
    const m = replayCricket(config(), log)
    expect(m.players[0]!.points).toBe(0)
  })

  it('keeps scoring while at least one opponent is still open', () => {
    const three = replayCricket(config({ playerCount: 3 }), [
      t(20), miss, miss, // P0 closes
      t(20), miss, miss, // P1 closes
      miss, miss, miss,  // P2
      t(20),             // P0 again, P2 still open
    ])
    expect(three.players[0]!.points).toBe(60)
  })
})

describe('turns', () => {
  it('passes to the next player after three darts', () => {
    const m = replayCricket(config(), [s(20), s(20), s(20)])
    expect(m.currentPlayer).toBe(1)
    expect(m.turnDarts).toEqual([])
    expect(m.players[0]!.dartsThrown).toBe(3)
  })
})

describe('winning', () => {
  it('wins by closing everything with at least the opponents points', () => {
    const log: Dart[] = []
    const turns = [
      [t(20), t(19), t(18)],
      [t(17), t(16), t(15)],
      [d(25), s(25)],
    ]
    for (const turn of turns) {
      log.push(...turn)
      if (turn !== turns.at(-1)) log.push(miss, miss, miss)
    }
    const m = replayCricket(config(), log)
    expect(m.status).toBe('finished')
    expect(m.winner).toBe(0)
  })

  it('does not win while an opponent has more points', () => {
    const log: Dart[] = [
      miss, miss, miss,
      t(20), t(20), t(20), // P1 scores 120
      t(20), t(19), t(18),
      miss, miss, miss,
      t(17), t(16), t(15),
      miss, miss, miss,
      d(25), s(25), miss,
    ]
    const m = replayCricket(config(), log)
    expect(m.status).toBe('playing')
  })

  it('lets a solo player win by closing everything', () => {
    const log = [t(20), t(19), t(18), t(17), t(16), t(15), d(25), s(25)]
    const m = replayCricket(config({ playerCount: 1 }), log)
    expect(m.status).toBe('finished')
  })

  it('rejects darts after the game is over', () => {
    const m = replayCricket(config({ playerCount: 1 }), [t(20), t(19), t(18), t(17), t(16), t(15), d(25), s(25)])
    expect(() => throwCricketDart(m, s(1))).toThrow()
  })
})

describe('targets', () => {
  it('standard cricket is 20 down to 15 plus the bull', () => {
    expect(CRICKET_TARGETS).toEqual([20, 19, 18, 17, 16, 15, 25])
  })

  it('crazy cricket picks six distinct numbers sorted high to low plus the bull', () => {
    const picked = crazyTargets(() => 0.42)
    expect(picked).toHaveLength(7)
    expect(picked.at(-1)).toBe(25)
    const numbers = picked.slice(0, -1)
    expect(new Set(numbers).size).toBe(6)
    expect([...numbers].sort((a, b) => b - a)).toEqual(numbers)
    expect(numbers.every((n) => n >= 1 && n <= 20)).toBe(true)
  })

  it('crazy cricket varies with the random source', () => {
    const a = crazyTargets(() => 0)
    const b = crazyTargets(() => 0.99)
    expect(a).not.toEqual(b)
  })

  it('works with custom targets', () => {
    const m = replayCricket(config({ targets: [7, 12, 25] }), [t(7), s(20)])
    expect(m.players[0]!.marks[7]).toBe(3)
    expect(m.players[0]!.marks[20]).toBeUndefined()
  })
})

describe('undo via replay', () => {
  it('replaying one dart fewer restores the earlier state', () => {
    const log = [t(20), s(19), d(18)]
    expect(replayCricket(config(), log.slice(0, 2))).toEqual(
      throwCricketDart(throwCricketDart(newCricket(config()), t(20)), s(19)),
    )
  })
})

describe('crazy rerolls', () => {
  const pool = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]
  const crazy = (over: Partial<CricketConfig> = {}) => config({ rerollPool: pool, ...over })

  it('does nothing before the round is complete', () => {
    const m = replayCricket(crazy(), [s(20), miss, miss])
    expect(m.targets).toEqual(CRICKET_TARGETS)
    expect(m.rollCount).toBe(0)
  })

  it('replaces numbers nobody marked once every player has thrown', () => {
    const m = replayCricket(crazy(), [s(20), miss, miss, miss, miss, miss])
    expect(m.targets).toEqual([20, 1, 2, 3, 4, 5, 25])
    expect(m.lastRoll).toEqual([1, 2, 3, 4, 5])
    expect(m.rollCount).toBe(1)
  })

  it('keeps numbers that have marks, even from a single player', () => {
    const m = replayCricket(crazy(), [miss, miss, miss, s(19), miss, miss])
    expect(m.targets).toEqual([1, 19, 2, 3, 4, 5, 25])
  })

  it('rerolls a number hit in an earlier round but not in the latest one', () => {
    // Round 1: P0 marks 20. Round 2: nobody touches 20 (or anything else).
    const m = replayCricket(crazy(), [s(20), miss, miss, miss, miss, miss, miss, miss, miss, miss, miss, miss])
    expect(m.targets[0]).not.toBe(20)
    expect(m.players[0]!.marks[20]).toBeUndefined()
  })

  it('keeps a number that is hit again in the latest round', () => {
    const m = replayCricket(crazy(), [s(20), miss, miss, miss, miss, miss, s(20), miss, miss, miss, miss, miss])
    expect(m.targets[0]).toBe(20)
    expect(m.players[0]!.marks[20]).toBe(2)
  })

  it('keeps points when a number is rerolled', () => {
    const m = replayCricket(crazy(), [t(20), t(20), miss, miss, miss, miss, miss, miss, miss, miss, miss, miss])
    expect(m.players[0]!.points).toBe(60)
    expect(m.players[0]!.marks[20]).toBeUndefined()
  })

  it('never replaces the bull', () => {
    const m = replayCricket(crazy(), [miss, miss, miss, miss, miss, miss])
    expect(m.targets.at(-1)).toBe(25)
  })

  it('does not reroll in standard cricket', () => {
    const m = replayCricket(config(), [s(20), miss, miss, miss, miss, miss])
    expect(m.targets).toEqual(CRICKET_TARGETS)
    expect(m.rollCount).toBe(0)
  })

  it('marks land on the new numbers', () => {
    const m = replayCricket(crazy(), [miss, miss, miss, miss, miss, miss, t(1)])
    expect(m.players[0]!.marks[1]).toBe(3)
  })

  it('stops rerolling when the pool runs out', () => {
    const small = crazy({ rerollPool: [1, 2] })
    const m = replayCricket(small, [miss, miss, miss, miss, miss, miss])
    expect(m.targets).toEqual([1, 2, 18, 17, 16, 15, 25])
  })

  it('is deterministic so undo by replay survives a reroll', () => {
    const log = [s(20), miss, miss, miss, miss, miss, s(1)]
    const before = replayCricket(crazy(), log.slice(0, -1))
    expect(replayCricket(crazy(), log.slice(0, -1))).toEqual(before)
    expect(before.rollCount).toBe(1)
  })

  it('crazyDeal pairs six targets with a pool of the unused numbers', () => {
    const { targets, rerollPool } = crazyDeal(() => 0.3)
    const numbers = targets.slice(0, -1)
    expect(rerollPool).toHaveLength(14)
    expect(new Set([...numbers, ...rerollPool]).size).toBe(20)
  })
})
