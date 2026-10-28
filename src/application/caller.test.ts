import { describe, expect, it } from 'vitest'
import type { Dart } from '../domain'
import { calls } from './caller'
import { startMatch } from './match-setup'

const s = (n: number): Dart => ({ segment: n, multiplier: 1 })
const d = (n: number): Dart => ({ segment: n, multiplier: 2 })
const t = (n: number): Dart => ({ segment: n, multiplier: 3 })
const miss: Dart = { segment: 0, multiplier: 1 }
const repeat = (dart: Dart, n: number) => Array.from({ length: n }, () => dart)

const rules = { startScore: 501, doubleIn: false, doubleOut: true, legsToWinSet: 1, setsToWinMatch: 1 }
const x01 = (over: Partial<typeof rules> = {}) => startMatch({ mode: 'x01', names: ['Ann', 'Bob'], rules: { ...rules, ...over } })

describe('caller', () => {
  it('says nothing before a visit is over', () => {
    expect(calls(x01(), [])).toEqual([])
    expect(calls(x01(), [t(20), t(20)])).toEqual([])
  })

  it('calls the visit score', () => {
    expect(calls(x01(), repeat(t(20), 3))).toEqual([{ type: 'visit', score: 180 }])
    expect(calls(x01(), [t(20), s(5), s(1)])).toEqual([{ type: 'visit', score: 66 }])
  })

  it('calls no score for a visit of misses', () => {
    expect(calls(x01(), repeat(miss, 3))).toEqual([{ type: 'noScore' }])
  })

  it('calls a bust', () => {
    expect(calls(x01({ startScore: 40 }), [s(20), t(20)])[0]).toEqual({ type: 'bust' })
  })

  it('tells the next thrower what they require when they are on a finish', () => {
    // Ann scores 100; Bob, next, is on 501: no finish, nothing more to say.
    expect(calls(x01(), [t(20), s(20), s(20)])).toEqual([{ type: 'visit', score: 100 }])
    // Ann scores 180, 180, 60 (81 left) while Bob misses; after Bob's last visit, Ann requires 81.
    const log = [...repeat(t(20), 3), ...repeat(miss, 3), ...repeat(t(20), 3), ...repeat(miss, 3), ...repeat(s(20), 3), ...repeat(miss, 3)]
    expect(calls(x01(), log)).toEqual([{ type: 'noScore' }, { type: 'require', player: 'Ann', remaining: 81 }])
  })

  it('calls game shot for a leg, and the match on the last one', () => {
    expect(calls(x01({ startScore: 40, legsToWinSet: 2 }), [d(20)])[0]).toEqual({ type: 'gameShot' })
    expect(calls(x01({ startScore: 40 }), [d(20)])).toEqual([{ type: 'matchShot', winner: 'Ann' }])
  })

  it('names the team member who is next', () => {
    const teams = startMatch({ mode: 'x01', names: ['Ann', 'Bob', 'Cid', 'Dee'], teams: [0, 1, 0, 1], rules: { ...rules, startScore: 100 } })
    // Ann leaves 40; Bob misses; Cid is next on 40.
    expect(calls(teams, [s(20), s(20), s(20), ...repeat(miss, 3)])).toEqual([{ type: 'noScore' }, { type: 'require', player: 'Cid', remaining: 40 }])
  })

  it('only announces the winner in other game modes', () => {
    const cricket = startMatch({ mode: 'cricket', names: ['Ann'] })
    expect(calls(cricket, repeat(t(20), 3))).toEqual([])
    expect(calls(cricket, [t(20), t(19), t(18), t(17), t(16), t(15), d(25), s(25)])).toEqual([{ type: 'winner', winner: 'Ann' }])
  })
})
