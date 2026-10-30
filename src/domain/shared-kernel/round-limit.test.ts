import { describe, expect, it } from 'vitest'
import * as clock from '../clock'
import * as killer from '../killer'
import * as x01 from '../x01'
import type { Dart } from './dart'
import { replayLog } from './events'

const s = (n: number): Dart => ({ segment: n, multiplier: 1 })
const d = (n: number): Dart => ({ segment: n, multiplier: 2 })
const t = (n: number): Dart => ({ segment: n, multiplier: 3 })
const miss: Dart = { segment: 0, multiplier: 1 }
const misses = (n: number) => Array.from({ length: n }, () => miss)

const clockConfig = (maxRounds?: number): clock.ClockConfig => ({ playerCount: 2, sequence: clock.CLOCK_SEQUENCE, maxRounds })
const playClock = (darts: Dart[], maxRounds?: number) => replayLog(clock.mode.newMatch(clockConfig(maxRounds)), clock.mode.applyDart, darts)

describe('round limit', () => {
  it('has no limit when maxRounds is 0 or missing', () => {
    expect(playClock(misses(30), 0).state.status).toBe('playing')
    expect(playClock(misses(30)).state.status).toBe('playing')
  })

  it('gives the match to the best-placed side once every side has played the last round', () => {
    // Round 1: Ann hits 1. Round 2: misses.
    const darts = [s(1), miss, miss, ...misses(3), ...misses(3), ...misses(3)]
    expect(playClock(darts.slice(0, -1), 2).state.status).toBe('playing')
    const move = playClock(darts, 2)
    expect(move.state.status).toBe('finished')
    expect(move.state.winner).toBe(0)
    expect(move.events).toEqual([
      { type: 'RoundLimitReached', player: 0 },
      { type: 'MatchWon', player: 0 },
    ])
  })

  it('plays sudden death rounds between tied sides until one leads alone', () => {
    const tied = playClock(misses(6), 1)
    expect(tied.state.status).toBe('playing')
    expect(tied.events).toContainEqual({ type: 'SuddenDeath', players: [0, 1] })
    expect(tied.state.rounds.contenders).toEqual([0, 1])

    expect(playClock([...misses(6), ...misses(6)], 1).events).toContainEqual({ type: 'SuddenDeath', players: [0, 1] })
    const won = playClock([...misses(6), ...misses(3), s(1), miss, miss], 1)
    expect(won.state.winner).toBe(1)
  })

  it('only lets the tied sides win sudden death', () => {
    const three: clock.ClockConfig = { ...clockConfig(1), playerCount: 3 }
    // Round 1: Ann and Bob hit 1, Cid misses. Sudden death: Cid hits 1 and 2, the others miss: Cid can't win it.
    const darts = [s(1), miss, miss, s(1), miss, miss, ...misses(3), ...misses(6), s(1), s(2), miss]
    const move = replayLog(clock.mode.newMatch(three), clock.mode.applyDart, darts)
    expect(move.state.status).toBe('playing')
    expect(move.state.rounds.contenders).toEqual([0, 1])
  })

  it('gives the X01 leg, not the match, to the lowest score, and counts again', () => {
    const config: x01.X01Config = { startScore: 501, doubleIn: false, doubleOut: true, playerCount: 2, legsToWinSet: 2, setsToWinMatch: 1, maxRounds: 1 }
    const move = replayLog(x01.mode.newMatch(config), x01.mode.applyDart, [t(20), t(20), t(20), s(1), s(1), s(1)])
    expect(move.events).toEqual([
      { type: 'TurnEnded', player: 1 },
      { type: 'RoundLimitReached', player: 0 },
      { type: 'LegWon', player: 0 },
    ])
    expect(move.state.players.map((p) => [p.legs, p.remaining])).toEqual([[1, 501], [0, 501]])
    expect(move.state.currentPlayer).toBe(1)
    expect(move.state.rounds.turns).toEqual([0, 0])
  })

  it('does not count the Killer draw, and ranks by lives left', () => {
    const config: killer.KillerConfig = { playerCount: 2, lives: 3, maxRounds: 1 }
    const play = (darts: Dart[]) => replayLog(killer.mode.newMatch(config), killer.mode.applyDart, darts)
    // Draw, then Ann arms: both still have 3 lives after round 1.
    const round1 = [s(20), s(19), d(20), miss, miss, ...misses(3)]
    expect(play(round1).events).toContainEqual({ type: 'SuddenDeath', players: [0, 1] })
    expect(play([...round1, d(19), miss, miss, ...misses(3)]).state.winner).toBe(0)
  })
})
