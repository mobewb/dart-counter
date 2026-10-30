import { describe, expect, it } from 'vitest'
import type { Dart } from '../shared-kernel/dart'
import { replayLog } from '../shared-kernel/events'
import { applyDart, CLOCK_SEQUENCE, newMatch, replay, targetOf, type ClockConfig } from './clock'

const s = (n: number): Dart => ({ segment: n, multiplier: 1 })
const d = (n: number): Dart => ({ segment: n, multiplier: 2 })
const t = (n: number): Dart => ({ segment: n, multiplier: 3 })
const miss: Dart = { segment: 0, multiplier: 1 }

const config = (over: Partial<ClockConfig> = {}): ClockConfig => ({ playerCount: 2, sequence: CLOCK_SEQUENCE, ...over })

describe('Around the Clock', () => {
  it('goes from 1 to 20, then the bull', () => {
    expect(CLOCK_SEQUENCE).toEqual([...Array.from({ length: 20 }, (_, i) => i + 1), 25])
    expect(targetOf(newMatch(config()), 0)).toBe(1)
  })

  it('advances one target per hit, whatever the multiplier', () => {
    const m = replay(config(), [s(1), t(2), d(3)])
    expect(m.players[0]!.progress).toBe(3)
    expect(targetOf(m, 1)).toBe(1)
  })

  it('ignores darts that are not the current target', () => {
    const m = replay(config(), [s(2), miss, s(20)])
    expect(m.players[0]!.progress).toBe(0)
    expect(m.players[0]!.dartsThrown).toBe(3)
  })

  it('takes the next target within the same turn', () => {
    expect(replay(config(), [s(1), s(1), s(2)]).players[0]!.progress).toBe(2)
  })

  it('accepts the outer or inner bull to finish, and wins at once', () => {
    const short = config({ sequence: [1, 25] })
    const move = replayLog(newMatch(short), applyDart, [s(1), d(25)])
    expect(move.state.status).toBe('finished')
    expect(move.state.winner).toBe(0)
    expect(move.events).toEqual([{ type: 'MatchWon', player: 0 }])
    expect(replay(short, [s(1), s(25)]).winner).toBe(0)
  })

  describe('skip ahead', () => {
    const skip = config({ skipAhead: true })

    it('moves 1 target on for a single, 2 for a double, 3 for a triple', () => {
      expect(replay(skip, [s(1)]).players[0]!.progress).toBe(1)
      expect(replay(skip, [d(1)]).players[0]!.progress).toBe(2)
      expect(replay(skip, [t(1)]).players[0]!.progress).toBe(3)
      expect(targetOf(replay(skip, [t(1), d(4)]), 0)).toBe(6)
    })

    it('never skips the bull, which must be hit itself', () => {
      const short = config({ skipAhead: true, sequence: [1, 2, 25] })
      expect(targetOf(replay(short, [t(1)]), 0)).toBe(25)
      expect(replay(short, [t(1)]).status).toBe('playing')
      expect(replay(short, [t(1), s(25)]).winner).toBe(0)
    })
  })

    it('passes the turn after 3 darts', () => {
    const move = replayLog(newMatch(config()), applyDart, [miss, miss, miss])
    expect(move.state.currentPlayer).toBe(1)
    expect(move.events).toEqual([{ type: 'TurnEnded', player: 0 }])
  })
})
