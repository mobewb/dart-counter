import { describe, expect, it } from 'vitest'
import { dartScore, type Dart } from '../shared-kernel/dart'
import { checkout } from './checkout'

const s = (n: number): Dart => ({ segment: n, multiplier: 1 })
const d = (n: number): Dart => ({ segment: n, multiplier: 2 })
const t = (n: number): Dart => ({ segment: n, multiplier: 3 })
const total = (darts: Dart[]) => darts.reduce((sum, x) => sum + dartScore(x), 0)

describe('checkout with double-out', () => {
  it('suggests the big finish on 170', () => {
    expect(checkout(170, true)).toEqual([t(20), t(20), d(25)])
  })

  it('finishes on a single double when possible', () => {
    expect(checkout(40, true)).toEqual([d(20)])
    expect(checkout(50, true)).toEqual([d(25)])
  })

  it('prefers fewer darts', () => {
    expect(checkout(100, true)).toEqual([t(20), d(20)])
  })

  it('returns a legal route that sums to the remaining score', () => {
    for (let remaining = 2; remaining <= 170; remaining++) {
      const route = checkout(remaining, true)
      if (!route) continue
      expect(total(route)).toBe(remaining)
      expect(route.at(-1)!.multiplier).toBe(2)
      expect(route.length).toBeLessThanOrEqual(3)
    }
  })

  it('returns null for the known impossible 3-dart scores', () => {
    for (const remaining of [169, 168, 166, 165, 163, 162, 159, 171, 1, 0, -5]) {
      expect(checkout(remaining, true)).toBeNull()
    }
  })

  it('respects the number of darts left', () => {
    expect(checkout(100, true, 1)).toBeNull()
    expect(checkout(100, true, 2)).toEqual([t(20), d(20)])
    expect(checkout(50, true, 1)).toEqual([d(25)])
  })

  it('does not use the bull as a setup dart when avoidable', () => {
    const route = checkout(141, true)!
    expect(route.slice(0, -1).some((x) => x.segment === 25)).toBe(false)
  })
})

describe('checkout without double-out', () => {
  it('finishes on any dart', () => {
    expect(checkout(60, false)).toEqual([t(20)])
    expect(checkout(180, false)).toEqual([t(20), t(20), t(20)])
    expect(checkout(1, false)).toEqual([s(1)])
  })

  it('returns null above 180', () => {
    expect(checkout(181, false)).toBeNull()
  })
})
