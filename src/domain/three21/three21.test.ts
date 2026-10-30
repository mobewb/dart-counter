import { describe, expect, it } from 'vitest'
import type { Dart } from '../shared-kernel/dart'
import { replayLog } from '../shared-kernel/events'
import { applyDart, newMatch, replay, type Three21Config } from './three21'

const s = (n: number): Dart => ({ segment: n, multiplier: 1 })
const d = (n: number): Dart => ({ segment: n, multiplier: 2 })
const t = (n: number): Dart => ({ segment: n, multiplier: 3 })
const miss: Dart = { segment: 0, multiplier: 1 }

const config = (over: Partial<Three21Config> = {}): Three21Config => ({ playerCount: 2, ...over })
const scores = (darts: Dart[], over?: Partial<Three21Config>) => replay(config(over), darts).players.map((p) => p.score)

// 300 for player 0 in five T20s, with player 1 missing in between.
const to300 = [t(20), t(20), t(20), miss, miss, miss, t(20), t(20)]

describe('321', () => {
  it('adds each dart to the score', () => {
    expect(scores([t(20), d(25), s(1)])).toEqual([111, 0])
  })

  it('wins on exactly 321, straight away', () => {
    const move = replayLog(newMatch(config()), applyDart, [...to300, t(7)])
    expect(move.state.status).toBe('finished')
    expect(move.state.winner).toBe(0)
    expect(move.state.players[0]!.score).toBe(321)
    expect(move.events).toEqual([{ type: 'MatchWon', player: 0 }])
  })

  it('bounces back by the excess when going over 321', () => {
    // 300 + 60 = 360, 39 over: back to 282.
    const move = replayLog(newMatch(config()), applyDart, [...to300, t(20)])
    expect(move.state.players[0]!.score).toBe(282)
    expect(move.state.status).toBe('playing')
    expect(move.events).toEqual([{ type: 'Bounced', player: 0 }, { type: 'TurnEnded', player: 0 }])
  })

  it('keeps counting within the turn after a bounce', () => {
    // 300 → 282 (bounce), then 282 + 39 = 321.
    const darts = [t(20), t(20), t(20), miss, miss, miss, t(20), t(20), miss, miss, miss, miss, t(20), t(13)]
    expect(replay(config(), darts).winner).toBe(0)
  })

  it('sends an opponent back to 0 when landing on their score', () => {
    const move = replayLog(newMatch(config()), applyDart, [t(20), miss, miss, s(20), s(20), s(20)])
    expect(move.state.players.map((p) => p.score)).toEqual([0, 60])
    expect(move.events).toEqual([{ type: 'KnockedBack', by: 1, players: [0] }, { type: 'TurnEnded', player: 1 }])
  })

  it('knocks back every opponent on that score', () => {
    expect(scores([s(5), miss, miss, s(5), miss, miss, s(5), miss, miss], { playerCount: 3 })).toEqual([0, 0, 5])
  })

  it('does not knock back on a miss or at 0', () => {
    expect(scores([miss, miss, miss, miss, miss, miss])).toEqual([0, 0])
    expect(replay(config(), [miss, miss, miss, miss]).players.every((p) => p.score === 0)).toBe(true)
  })

  it('passes the turn after 3 darts', () => {
    const move = replayLog(newMatch(config()), applyDart, [miss, miss, miss])
    expect(move.state.currentPlayer).toBe(1)
    expect(move.events).toEqual([{ type: 'TurnEnded', player: 0 }])
  })
})
