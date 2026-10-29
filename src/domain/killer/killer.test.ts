import { describe, expect, it } from 'vitest'
import type { Dart } from '../shared-kernel/dart'
import { replayLog } from '../shared-kernel/events'
import { applyDart, freeNumbers, newMatch, replay, type KillerConfig } from './killer'

const s = (n: number): Dart => ({ segment: n, multiplier: 1 })
const d = (n: number): Dart => ({ segment: n, multiplier: 2 })
const t = (n: number): Dart => ({ segment: n, multiplier: 3 })
const miss: Dart = { segment: 0, multiplier: 1 }

const config = (over: Partial<KillerConfig> = {}): KillerConfig => ({ playerCount: 2, lives: 3, ...over })
const play = (darts: Dart[], over: Partial<KillerConfig> = {}) => replayLog(newMatch(config(over)), applyDart, darts)

/** Ann draws 20, Bob draws 19 (Cid 18 with three players). */
const DRAW = [s(20), s(19)]
const DRAW3 = [s(20), s(19), s(18)]

describe('Killer', () => {
  it('needs at least 2 players', () => {
    expect(() => newMatch(config({ playerCount: 1 }))).toThrow()
  })

  describe('draw', () => {
    it('gives each side the number of its dart, any multiplier, then starts with player 0', () => {
      const move = play([t(20), d(19)])
      expect(move.state.players.map((p) => p.number)).toEqual([20, 19])
      expect(move.state.phase).toBe('play')
      expect(move.state.currentPlayer).toBe(0)
      expect(move.events).toEqual([
        { type: 'NumberDrawn', player: 1, number: 19 },
        { type: 'TurnEnded', player: 1 },
      ])
    })

    it('throws again on a miss, the bull or a taken number', () => {
      const m = replay(config(), [s(20), miss, s(25), d(25), s(20)])
      expect(m.phase).toBe('draw')
      expect(m.currentPlayer).toBe(1)
      expect(m.players[1]!.number).toBeNull()
      expect(freeNumbers(m)).not.toContain(20)
    })

    it('does not count draw darts', () => {
      expect(replay(config(), [miss, ...DRAW]).players.map((p) => p.dartsThrown)).toEqual([0, 0])
    })
  })

  describe('play', () => {
    it('makes a side a killer with its own double only', () => {
      expect(replay(config(), [...DRAW, s(20), t(20)]).players[0]!.killer).toBe(false)
      const move = play([...DRAW, d(20)])
      expect(move.state.players[0]!.killer).toBe(true)
      expect(move.events).toEqual([{ type: 'KillerArmed', player: 0 }])
    })

    it('lets only a killer take a life, with a double of the opponent number', () => {
      const notKiller = replay(config(), [...DRAW, d(19)])
      expect(notKiller.players[1]!.lives).toBe(3)

      const move = play([...DRAW, d(20), d(19), t(19)])
      expect(move.state.players[1]!.lives).toBe(2)
      expect(move.state.players[0]!.livesTaken).toBe(1)
    })

    it('reports the life lost', () => {
      expect(play([...DRAW, d(20), d(19)]).events).toEqual([{ type: 'LifeLost', player: 1 }])
    })

    it('costs a killer a life when it hits its own double', () => {
      const m = replay(config(), [...DRAW, d(20), d(20)])
      expect(m.players[0]!.lives).toBe(2)
      expect(m.players[0]!.livesTaken).toBe(0)
    })

    it('ends the turn of a side that knocks itself out', () => {
      const move = play([...DRAW3, d(20), d(20)], { playerCount: 3, lives: 1 })
      expect(move.state.players[0]!.lives).toBe(0)
      expect(move.state.currentPlayer).toBe(1)
      expect(move.events).toEqual([
        { type: 'LifeLost', player: 0 },
        { type: 'PlayerEliminated', player: 0 },
        { type: 'TurnEnded', player: 0 },
      ])
    })

    it('skips eliminated sides and ignores their number', () => {
      // Ann arms and knocks Bob out; Bob's turn is skipped and his double no longer counts.
      const m = replay(config({ playerCount: 3, lives: 1 }), [...DRAW3, d(20), d(19), miss, miss, miss, miss, d(19)])
      expect(m.players[1]!.lives).toBe(0)
      expect(m.currentPlayer).toBe(0)
      expect(m.players[0]!.livesTaken).toBe(1)
    })

    it('ends with the last side standing', () => {
      const move = play([...DRAW, d(20), d(19)], { lives: 1 })
      expect(move.state.status).toBe('finished')
      expect(move.state.winner).toBe(0)
      expect(move.events).toEqual([
        { type: 'LifeLost', player: 1 },
        { type: 'PlayerEliminated', player: 1 },
        { type: 'MatchWon', player: 0 },
      ])
    })

    it('gives the win to the opponent when the thrower knocks itself out', () => {
      expect(replay(config({ lives: 1 }), [...DRAW, d(20), d(20)]).winner).toBe(1)
    })
  })
})
