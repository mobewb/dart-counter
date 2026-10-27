import { describe, expect, it } from 'vitest'
import type { Dart } from '../domain'
import { startMatch, teamsFrom, type MatchSetup } from './match-setup'
import { sideNames, sidesOf, teamPlay } from './sides'

const s = (n: number): Dart => ({ segment: n, multiplier: 1 })
const d = (n: number): Dart => ({ segment: n, multiplier: 2 })
const t = (n: number): Dart => ({ segment: n, multiplier: 3 })
const miss: Dart = { segment: 0, multiplier: 1 }
const misses = (n: number): Dart[] => Array.from({ length: n }, () => miss)

const names = ['Ann', 'Bob', 'Cid', 'Dee']
const rules = { startScore: 301, doubleIn: false, doubleOut: true, legsToWinSet: 1, setsToWinMatch: 1 }
/** Ann & Cid against Bob & Dee. */
const doubles = (over: Partial<typeof rules> = {}) =>
  startMatch({ mode: 'x01', names, teams: [0, 1, 0, 1], rules: { ...rules, ...over } })

/** Who throws after each of the first `turns` turns of misses. */
const throwers = (setup: MatchSetup, turns: number) =>
  Array.from({ length: turns }, (_, turn) => setup.names[teamPlay(setup, misses(turn * 3)).thrower])

describe('sides', () => {
  it('makes every player a side of their own without teams', () => {
    const setup = startMatch({ mode: 'cricket', names: ['Ann', 'Bob'] })
    expect(sidesOf(setup)).toEqual([[0], [1]])
    expect(sideNames(setup)).toEqual(['Ann', 'Bob'])
  })

  it('groups players by team number, skipping unused numbers', () => {
    expect(teamsFrom([2, 0, 2, 0])).toEqual([[1, 3], [0, 2]])
  })

  it('names a team after its members', () => {
    expect(sideNames(doubles())).toEqual(['Ann & Cid', 'Bob & Dee'])
  })

  it('plays one side per team', () => {
    const setup = doubles()
    expect(setup.config.playerCount).toBe(2)
    expect(startMatch({ mode: 'crazy', names, teams: [0, 1, 2, 2] }).config.playerCount).toBe(3)
  })

  it('needs 2 to 4 teams', () => {
    expect(() => startMatch({ mode: 'cricket', names, teams: [0, 0, 0, 0] })).toThrow()
    expect(() => startMatch({ mode: 'cricket', names: [...names, 'Eve'], teams: [0, 1, 2, 3, 4] })).toThrow()
  })
})

describe('team play', () => {
  it('alternates teams, and members within each team', () => {
    expect(throwers(doubles(), 5)).toEqual(['Ann', 'Bob', 'Cid', 'Dee', 'Ann'])
  })

  it('rotates uneven teams on their own turns', () => {
    const setup = startMatch({ mode: 'x01', names: ['Ann', 'Bob', 'Cid'], teams: [0, 1, 0], rules })
    expect(throwers(setup, 5)).toEqual(['Ann', 'Bob', 'Cid', 'Bob', 'Ann'])
  })

  it('keeps rotating across legs', () => {
    // Ann wins leg 1; team 2 starts leg 2 with Bob, then Cid throws for team 1.
    const setup = doubles({ startScore: 40, legsToWinSet: 2 })
    expect(names[teamPlay(setup, [d(20)]).thrower]).toBe('Bob')
    expect(names[teamPlay(setup, [d(20), ...misses(3)]).thrower]).toBe('Cid')
  })

  it('credits each player with their own darts and points', () => {
    const play = teamPlay(doubles(), [t(20), t(20), t(20), ...misses(3), s(1), s(1), s(1)])
    expect(play.players).toEqual([
      { value: 180, dartsThrown: 3 },
      { value: 0, dartsThrown: 3 },
      { value: 3, dartsThrown: 3 },
      { value: 0, dartsThrown: 0 },
    ])
  })

  it('gives no points for a busted turn, but counts its darts', () => {
    // Ann leaves 121; Cid's two T20 would leave 1, a bust with double-out.
    const play = teamPlay(doubles(), [t(20), t(20), t(20), ...misses(3), t(20), t(20)])
    expect(play.players[0]).toEqual({ value: 180, dartsThrown: 3 })
    expect(play.players[2]).toEqual({ value: 0, dartsThrown: 2 })
  })

  it('works for cricket teams too', () => {
    const setup = startMatch({ mode: 'cricket', names, teams: [0, 1, 0, 1] })
    // Ann closes 20 and scores 60 on her second triple.
    const play = teamPlay(setup, [t(20), t(20), miss, ...misses(3)])
    expect(play.players[0]).toEqual({ value: 60, dartsThrown: 3 })
    expect(names[play.thrower]).toBe('Cid')
  })
})
