import { describe, expect, it } from 'vitest'
import { dartScore, isValidDart, type Dart } from '../shared-kernel/dart'
import { newMatch, replay, throwDart } from './match'
import type { MatchConfig } from './types'

const s = (n: number): Dart => ({ segment: n, multiplier: 1 })
const d = (n: number): Dart => ({ segment: n, multiplier: 2 })
const t = (n: number): Dart => ({ segment: n, multiplier: 3 })
const miss: Dart = { segment: 0, multiplier: 1 }

const config = (over: Partial<MatchConfig> = {}): MatchConfig => ({
  startScore: 501,
  doubleIn: false,
  doubleOut: true,
  playerCount: 2,
  legsToWinSet: 1,
  setsToWinMatch: 1,
  ...over,
})

const play = (cfg: MatchConfig, darts: Dart[]) => replay(cfg, darts)

describe('dart values', () => {
  it('scores segment times multiplier', () => {
    expect(dartScore(t(20))).toBe(60)
    expect(dartScore(d(25))).toBe(50)
    expect(dartScore(s(25))).toBe(25)
    expect(dartScore(miss)).toBe(0)
  })

  it('rejects impossible darts', () => {
    expect(isValidDart({ segment: 25, multiplier: 3 })).toBe(false)
    expect(isValidDart({ segment: 21, multiplier: 1 })).toBe(false)
    expect(isValidDart({ segment: 0, multiplier: 2 })).toBe(false)
    expect(isValidDart(t(20))).toBe(true)
  })

  it('throws on an invalid dart', () => {
    expect(() => throwDart(newMatch(config()), { segment: 25, multiplier: 3 })).toThrow()
  })
})

describe('turns', () => {
  it('subtracts darts and passes to the next player after 3 darts', () => {
    const m = play(config(), [t(20), t(20), t(20)])
    expect(m.players[0]!.remaining).toBe(321)
    expect(m.currentPlayer).toBe(1)
    expect(m.turnDarts).toEqual([])
  })

  it('stays on the same player mid-turn', () => {
    const m = play(config(), [t(20)])
    expect(m.currentPlayer).toBe(0)
    expect(m.turnDarts).toEqual([t(20)])
  })

  it('wraps back to the first player', () => {
    const m = play(config(), [s(1), s(1), s(1), s(1), s(1), s(1)])
    expect(m.currentPlayer).toBe(0)
  })
})

describe('bust', () => {
  it('restores the turn start score and ends the turn when going below zero', () => {
    const m = play(config({ startScore: 40 }), [s(20), t(20)])
    expect(m.players[0]!.remaining).toBe(40)
    expect(m.currentPlayer).toBe(1)
  })

  it('busts on landing on 1 with double-out', () => {
    const m = play(config({ startScore: 21 }), [s(20)])
    expect(m.players[0]!.remaining).toBe(21)
    expect(m.currentPlayer).toBe(1)
  })

  it('busts reaching 0 without a double', () => {
    const m = play(config({ startScore: 20 }), [s(20)])
    expect(m.players[0]!.remaining).toBe(20)
    expect(m.status).toBe('playing')
  })

  it('flags the bust until the next dart', () => {
    const busted = play(config({ startScore: 40 }), [s(20), t(20)])
    expect(busted.busted).toBe(true)
    expect(throwDart(busted, s(1)).busted).toBe(false)
  })

  it('does not count a busted turn towards points scored', () => {
    const m = play(config({ startScore: 40 }), [s(5), s(20), t(20)])
    expect(m.players[0]!.pointsScored).toBe(0)
    expect(m.players[0]!.dartsThrown).toBe(3)
  })

  it('allows 1 left and a plain finish without double-out', () => {
    const m = play(config({ startScore: 21, doubleOut: false }), [s(20)])
    expect(m.players[0]!.remaining).toBe(1)
  })
})

describe('double-in', () => {
  it('scores nothing until a double is hit', () => {
    const m = play(config({ doubleIn: true }), [t(20), s(20), d(10)])
    expect(m.players[0]!.remaining).toBe(481)
    expect(m.players[0]!.in).toBe(true)
  })

  it('counts darts after the opening double in the same turn', () => {
    const m = play(config({ doubleIn: true }), [d(10), t(20)])
    expect(m.players[0]!.remaining).toBe(421)
  })

  it('restores the in status on bust', () => {
    const m = play(config({ doubleIn: true, startScore: 40 }), [d(5), t(20), s(1)])
    expect(m.players[0]!.in).toBe(false)
    expect(m.players[0]!.remaining).toBe(40)
  })
})

describe('legs, sets and match', () => {
  it('wins a leg on a double finish and rotates the starter', () => {
    const m = play(config({ startScore: 40, legsToWinSet: 2, setsToWinMatch: 1 }), [d(20)])
    expect(m.players[0]!.legs).toBe(1)
    expect(m.status).toBe('playing')
    expect(m.players.map((p) => p.remaining)).toEqual([40, 40])
    expect(m.legStarter).toBe(1)
    expect(m.currentPlayer).toBe(1)
  })

  it('finishes the match when the last set is won', () => {
    const m = play(config({ startScore: 40 }), [d(20)])
    expect(m.status).toBe('finished')
    expect(m.winner).toBe(0)
    expect(m.players[0]!.sets).toBe(1)
  })

  it('awards a set after enough legs and resets leg counts', () => {
    const m = play(config({ startScore: 40, legsToWinSet: 1, setsToWinMatch: 2 }), [d(20)])
    expect(m.players[0]!.sets).toBe(1)
    expect(m.players[0]!.legs).toBe(0)
    expect(m.status).toBe('playing')
  })

  it('rejects darts after the match is over', () => {
    const m = play(config({ startScore: 40 }), [d(20)])
    expect(() => throwDart(m, s(1))).toThrow()
  })
})

describe('undo via replay', () => {
  it('replaying a shorter dart log restores the earlier state', () => {
    const log = [t(20), t(20), t(20), s(5)]
    expect(replay(config(), log.slice(0, -1))).toEqual(play(config(), log.slice(0, 3)))
    expect(replay(config(), log.slice(0, -1)).players[0]!.remaining).toBe(321)
  })
})
