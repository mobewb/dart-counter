import { describe, expect, it } from 'vitest'
import type { Dart } from '../domain'
import { startMatch } from './match-setup'
import { matchStats } from './match-stats'

const s = (n: number): Dart => ({ segment: n, multiplier: 1 })
const d = (n: number): Dart => ({ segment: n, multiplier: 2 })
const t = (n: number): Dart => ({ segment: n, multiplier: 3 })
const miss: Dart = { segment: 0, multiplier: 1 }
const repeat = (dart: Dart, n: number) => Array.from({ length: n }, () => dart)

const rules = { startScore: 501, doubleIn: false, doubleOut: true, legsToWinSet: 1, setsToWinMatch: 1 }
const x01 = (names: string[], over: Partial<typeof rules> = {}, teams?: number[]) =>
  startMatch({ mode: 'x01', names, rules: { ...rules, ...over }, teams })

describe('X01 stats', () => {
  it('scores a 9-darter-ish leg: 180, 180, 141 checkout', () => {
    const log = [...repeat(t(20), 3), ...repeat(s(20), 3), ...repeat(t(20), 3), ...repeat(s(20), 3), t(20), t(19), d(12)]
    const [ann, bob] = matchStats(x01(['Ann', 'Bob']), log)
    expect(ann).toEqual({
      kind: 'x01', dartsThrown: 9, points: 501, average: 167, firstNine: 167, highestVisit: 180,
      tons: 0, tonForties: 1, oneEighties: 2, checkoutDarts: 1, checkouts: 1, highestCheckout: 141, bestLeg: 9,
    })
    expect(bob).toMatchObject({ dartsThrown: 6, average: 60, highestVisit: 60, checkoutDarts: 0, checkouts: 0, bestLeg: null })
  })

  it('counts a busted visit as darts without points', () => {
    // 40 left: S20 then T20 busts; Ann checks out D20 on her next visit.
    const [ann] = matchStats(x01(['Ann', 'Bob'], { startScore: 40 }), [s(20), t(20), ...repeat(s(1), 3), d(20)])
    expect(ann).toMatchObject({ dartsThrown: 3, average: 40, highestVisit: 40, checkoutDarts: 3, checkouts: 1, highestCheckout: 40, bestLeg: 3 })
  })

  it('keeps the first nine to the first three visits of each leg', () => {
    const log = [...repeat(s(20), 9), ...repeat(t(20), 3)]
    const [solo] = matchStats(x01(['Ann']), log)
    expect(solo).toMatchObject({ firstNine: 60, average: 90, highestVisit: 180, oneEighties: 1 })
  })

  it('restarts the first nine and best leg every leg', () => {
    // Leg 1: Ann D20. Leg 2 is started by Bob: S20 S10 S6, then Ann misses, Bob D2.
    const [ann, bob] = matchStats(x01(['Ann', 'Bob'], { startScore: 40, legsToWinSet: 2 }), [d(20), s(20), s(10), s(6), ...repeat(miss, 3), d(2)])
    // Ann's first nine spans both legs: D20 (40 in 1 dart), then 3 misses.
    expect(ann).toMatchObject({ checkouts: 1, bestLeg: 1, firstNine: 30 })
    expect(bob).toMatchObject({ checkouts: 1, bestLeg: 4, highestCheckout: 4, firstNine: 30 })
  })

  it('counts the first visits of a new leg after a long leg', () => {
    // Leg 1 takes 4 visits (60, 3, 3, then S1 D7 = 15); leg 2 is T20 S1 D10 = 81.
    const leg1 = [...repeat(s(20), 3), ...repeat(s(1), 6), s(1), d(7)]
    const [solo] = matchStats(x01(['Ann'], { startScore: 81, legsToWinSet: 2 }), [...leg1, t(20), s(1), d(10)])
    // First nine = leg 1's first 3 visits (66 in 9 darts) + leg 2's visit (81 in 3 darts).
    expect(solo).toMatchObject({ firstNine: (147 / 12) * 3, bestLeg: 3, checkouts: 2, highestCheckout: 81 })
  })

  it('has no checkout rate without double-out', () => {
    const [ann] = matchStats(x01(['Ann'], { startScore: 20, doubleOut: false }), [s(20)])
    expect(ann).toMatchObject({ checkoutDarts: null, checkouts: 1, highestCheckout: 20 })
  })

  it('credits each team member with their own visits', () => {
    const stats = matchStats(x01(['Ann', 'Bob', 'Cid', 'Dee'], {}, [0, 1, 0, 1]), [...repeat(t(20), 3), ...repeat(miss, 3), ...repeat(s(1), 3)])
    expect(stats.map((p) => p.kind === 'x01' && p.highestVisit)).toEqual([180, 0, 3, 0])
  })
})

describe('cricket stats', () => {
  it('counts marks, scoring marks included, and marks per round', () => {
    const setup = startMatch({ mode: 'cricket', names: ['Ann', 'Bob'] })
    const [ann, bob] = matchStats(setup, [t(20), t(20), s(19), miss, s(5), s(20)])
    expect(ann).toEqual({ kind: 'cricket', dartsThrown: 3, points: 60, marks: 7, marksPerRound: 7 })
    expect(bob).toEqual({ kind: 'cricket', dartsThrown: 3, points: 0, marks: 1, marksPerRound: 1 })
  })
})

describe('Around the Clock stats', () => {
  it('counts targets hit in order and the hit rate', () => {
    const setup = startMatch({ mode: 'clock', names: ['Ann', 'Bob'] })
    // Ann hits 1 and 2 but misses with her third dart (20 is not her target).
    const [ann, bob] = matchStats(setup, [s(1), d(2), s(20), s(1), miss, miss])
    expect(ann).toEqual({ kind: 'clock', dartsThrown: 3, hits: 2, hitRate: 2 / 3 })
    expect(bob).toEqual({ kind: 'clock', dartsThrown: 3, hits: 1, hitRate: 1 / 3 })
  })
})
