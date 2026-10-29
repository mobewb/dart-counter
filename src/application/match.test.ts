import { describe, expect, it } from 'vitest'
import type { Dart } from '../domain'
import { openMatch, throwDart, undoDart } from './match'
import { startMatch, teamsFrom } from './match-setup'
import type { MatchSetup } from './modes'

const s = (n: number): Dart => ({ segment: n, multiplier: 1 })
const d = (n: number): Dart => ({ segment: n, multiplier: 2 })
const t = (n: number): Dart => ({ segment: n, multiplier: 3 })
const miss: Dart = { segment: 0, multiplier: 1 }
const misses = (n: number): Dart[] => Array.from({ length: n }, () => miss)

const names = ['Ann', 'Bob', 'Cid', 'Dee']
const rules = { startScore: 301, doubleIn: false, doubleOut: true, legsToWinSet: 1, setsToWinMatch: 1 }
/** Ann & Cid against Bob & Dee. */
const doubles = (over: Partial<typeof rules> = {}) =>
  startMatch({ mode: 'x01', names, teams: [0, 1, 0, 1], options: { ...rules, ...over } })

/** Who throws after each of the first `turns` turns of misses. */
const throwers = (setup: MatchSetup, turns: number) =>
  Array.from({ length: turns }, (_, turn) => setup.names[openMatch(setup, misses(turn * 3)).thrower])

describe('sides', () => {
  it('makes every player a side of their own without teams', () => {
    const setup = startMatch({ mode: 'cricket', options: {}, names: ['Ann', 'Bob'] })
    expect(openMatch(setup).sideNames).toEqual(['Ann', 'Bob'])
  })

  it('groups players by team number, skipping unused numbers', () => {
    expect(teamsFrom([2, 0, 2, 0])).toEqual([[1, 3], [0, 2]])
  })

  it('names a team after its members', () => {
    expect(openMatch(doubles()).sideNames).toEqual(['Ann & Cid', 'Bob & Dee'])
  })

  it('plays one side per team', () => {
    const setup = doubles()
    expect(setup.config.playerCount).toBe(2)
    expect(startMatch({ mode: 'crazy', options: {}, names, teams: [0, 1, 2, 2] }).config.playerCount).toBe(3)
  })

  it('needs 2 to 4 teams', () => {
    expect(() => startMatch({ mode: 'cricket', options: {}, names, teams: [0, 0, 0, 0] })).toThrow()
    expect(() => startMatch({ mode: 'cricket', options: {}, names: [...names, 'Eve'], teams: [0, 1, 2, 3, 4] })).toThrow()
  })
})

describe('team play', () => {
  it('alternates teams, and members within each team', () => {
    expect(throwers(doubles(), 5)).toEqual(['Ann', 'Bob', 'Cid', 'Dee', 'Ann'])
  })

  it('rotates uneven teams on their own turns', () => {
    const setup = startMatch({ mode: 'x01', names: ['Ann', 'Bob', 'Cid'], teams: [0, 1, 0], options: rules })
    expect(throwers(setup, 5)).toEqual(['Ann', 'Bob', 'Cid', 'Bob', 'Ann'])
  })

  it('keeps rotating across legs', () => {
    // Ann wins leg 1; team 2 starts leg 2 with Bob, then Cid throws for team 1.
    const setup = doubles({ startScore: 40, legsToWinSet: 2 })
    expect(names[openMatch(setup, [d(20)]).thrower]).toBe('Bob')
    expect(names[openMatch(setup, [d(20), ...misses(3)]).thrower]).toBe('Cid')
  })

  it('credits each player with their own darts and points', () => {
    const play = openMatch(doubles(), [t(20), t(20), t(20), ...misses(3), s(1), s(1), s(1)])
    expect(play.players).toEqual([
      { value: 180, dartsThrown: 3 },
      { value: 0, dartsThrown: 3 },
      { value: 3, dartsThrown: 3 },
      { value: 0, dartsThrown: 0 },
    ])
  })

  it('gives no points for a busted turn, but counts its darts', () => {
    // Ann leaves 121; Cid's two T20 would leave 1, a bust with double-out.
    const play = openMatch(doubles(), [t(20), t(20), t(20), ...misses(3), t(20), t(20)])
    expect(play.players[0]).toEqual({ value: 180, dartsThrown: 3 })
    expect(play.players[2]).toEqual({ value: 0, dartsThrown: 2 })
  })

  it('works for cricket teams too', () => {
    const setup = startMatch({ mode: 'cricket', options: {}, names, teams: [0, 1, 0, 1] })
    // Ann closes 20 and scores 60 on her second triple.
    const play = openMatch(setup, [t(20), t(20), miss, ...misses(3)])
    expect(play.players[0]).toEqual({ value: 60, dartsThrown: 3 })
    expect(names[play.thrower]).toBe('Cid')
  })
})

describe('a match', () => {
  const setup = startMatch({ mode: 'x01', names: ['Ann', 'Bob'], options: { ...rules, startScore: 40 } })
  if (setup.mode !== 'x01') throw new Error('expected X01')

  it('opens with an empty dart log', () => {
    const match = openMatch(setup)
    expect(match.darts).toEqual([])
    expect(match.events).toEqual([])
    expect(match.state.status).toBe('playing')
    expect(match.results).toEqual([{ value: 0, dartsThrown: 0 }, { value: 0, dartsThrown: 0 }])
  })

  it('replays the log into state and the events of the last dart', () => {
    const match = throwDart(throwDart(openMatch(setup), s(20)), s(20))
    expect(match.state.players[0]!.remaining).toBe(40)
    expect(match.events).toEqual([{ type: 'Bust', player: 0 }, { type: 'TurnEnded', player: 0 }])
    expect(match).toEqual(openMatch(setup, [s(20), s(20)]))
  })

  it('rejects an invalid dart', () => {
    expect(() => throwDart(openMatch(setup), { segment: 25, multiplier: 3 })).toThrow()
    expect(() => openMatch(setup, [{ segment: 25, multiplier: 3 }])).toThrow()
  })

  it('ignores darts once the match is over', () => {
    const won = openMatch(setup, [d(20)])
    expect(won.state.winner).toBe(0)
    expect(throwDart(won, s(1))).toBe(won)
  })

  it('undoes the last dart, even after the match is won', () => {
    const back = undoDart(openMatch(setup, [d(20)]))
    expect(back.darts).toEqual([])
    expect(back.state.status).toBe('playing')
    const empty = openMatch(setup)
    expect(undoDart(empty)).toBe(empty)
  })

  it('gives the results of each side', () => {
    expect(openMatch(setup, [d(20)]).results.map((r) => r.dartsThrown)).toEqual([1, 0])
  })
})

describe('round', () => {
  const clock = (maxRounds?: number) => startMatch({ mode: 'clock', options: {}, names: ['Ann', 'Bob'], maxRounds })

  it('is missing without a round limit', () => {
    expect(openMatch(clock()).round).toBeNull()
    expect(openMatch(clock(0)).round).toBeNull()
  })

  it('counts the round of the side to throw, up to the limit', () => {
    expect(openMatch(clock(2)).round).toEqual({ current: 1, max: 2, suddenDeath: false })
    expect(openMatch(clock(2), misses(3)).round).toEqual({ current: 1, max: 2, suddenDeath: false })
    expect(openMatch(clock(2), misses(6)).round).toEqual({ current: 2, max: 2, suddenDeath: false })
  })

  it('tells sudden death, and is missing once the match is over', () => {
    expect(openMatch(clock(1), misses(6)).round).toEqual({ current: 1, max: 1, suddenDeath: true })
    expect(openMatch(clock(1), [s(1), ...misses(5)]).round).toBeNull()
  })
})
