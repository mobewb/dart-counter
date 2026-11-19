import { describe, expect, it } from 'vitest'
import type { Dart } from '../domain'
import { openMatch } from './match'
import { startMatch } from './match-setup'
import { winningDarts } from './winning-darts'

const s = (n: number): Dart => ({ segment: n, multiplier: 1 })
const d = (n: number): Dart => ({ segment: n, multiplier: 2 })
const t = (n: number): Dart => ({ segment: n, multiplier: 3 })

const x01 = (doubleOut: boolean) =>
  startMatch({ mode: 'x01', names: ['Ann'], options: { startScore: 301, doubleIn: false, doubleOut, legsToWinSet: 1, setsToWinMatch: 1 } })

describe('winning darts', () => {
  it('offers the double that finishes an X01 leg on double out', () => {
    const match = openMatch(x01(true), [t(20), t(20), t(20), t(20), t(7)]) // 40 left
    expect(winningDarts(match)).toEqual([d(20)])
  })

  it('offers every dart that finishes on single out', () => {
    const match = openMatch(x01(false), [t(20), t(20), t(20), t(20), s(20), t(7)]) // 20 left
    expect(winningDarts(match)).toEqual([d(10), s(20)])
  })

  it('offers the dart that wins a leg, not only the match', () => {
    const setup = startMatch({ mode: 'x01', names: ['Ann'], options: { startScore: 301, doubleIn: false, doubleOut: true, legsToWinSet: 2, setsToWinMatch: 1 } })
    expect(winningDarts(openMatch(setup, [t(20), t(20), t(20), t(20), t(7)]))).toEqual([d(20)])
  })

  it('offers the dart that lands on 321 exactly', () => {
    const setup = startMatch({ mode: 'three21', names: ['Ann'], options: {} })
    expect(winningDarts(openMatch(setup, [t(20), t(20), t(20), t(20), t(20)]))).toEqual([t(7)]) // on 300
  })

  it('offers nothing once the match is won', () => {
    const match = openMatch(x01(true), [t(20), t(20), t(20), t(20), t(7), d(20)])
    expect(winningDarts(match)).toEqual([])
  })

  describe('at the round limit', () => {
    const clock = startMatch({ mode: 'clock', options: {}, names: ['Ann', 'Bob'], maxRounds: 1 })

    it('offers the darts that take the lead on the last dart of the limit', () => {
      // Ann is on 3 targets, Bob on 2 with one dart left: S3 only ties.
      const match = openMatch(clock, [s(1), s(2), s(3), s(1), s(2)])
      expect(winningDarts(match)).toEqual([d(3), t(3)])
    })

    it('offers nothing when the side wins whatever it throws', () => {
      const miss: Dart = { segment: 0, multiplier: 1 }
      const match = openMatch(clock, [miss, miss, miss, s(1), s(2)])
      expect(winningDarts(match)).toEqual([])
    })

    it('offers nothing when the leader wins anyway, even by busting', () => {
      const miss: Dart = { segment: 0, multiplier: 1 }
      const setup = startMatch({ mode: 'x01', names: ['Ann', 'Bob'], maxRounds: 3, options: { startScore: 301, doubleIn: false, doubleOut: true, legsToWinSet: 1, setsToWinMatch: 1 } })
      // Last round: Ann is still on 301, Bob on 40. A bust ends Bob's turn, and the limit then hands him the match.
      const match = openMatch(setup, [miss, miss, miss, t(20), t(20), t(20), miss, miss, miss, t(20), t(7), miss, miss, miss, miss])
      expect(winningDarts(match)).toEqual([])
    })
  })
})
