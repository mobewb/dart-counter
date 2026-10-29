import { describe, expect, it } from 'vitest'
import * as clock from './clock'
import * as cricket from './cricket'
import * as killer from './killer'
import type { Dart } from './shared-kernel/dart'
import { replayLog } from './shared-kernel/events'
import { results, type GameMode, type MatchCore } from './shared-kernel/game-mode'
import * as x01 from './x01'

const s = (n: number): Dart => ({ segment: n, multiplier: 1 })
const d = (n: number): Dart => ({ segment: n, multiplier: 2 })
const t = (n: number): Dart => ({ segment: n, multiplier: 3 })
const miss: Dart = { segment: 0, multiplier: 1 }

/**
 * Rules every game mode must follow. `win` is a two-player log in which
 * player 0 wins with its last dart, and player 1 throws 3 darts. `opening`
 * settles the match before play (Killer's draw for numbers); its darts are
 * not counted.
 */
function contract<Config, State extends MatchCore>(name: string, mode: GameMode<Config, State>, config: Config, win: Dart[], opening: Dart[] = []) {
  const play = (darts: Dart[]) => replayLog(mode.newMatch(config), mode.applyDart, [...opening, ...darts])

  describe(`${name} follows the GameMode contract`, () => {
    it('starts with player 0 to throw and no winner', () => {
      const { state } = play([])
      expect(state.currentPlayer).toBe(0)
      expect(state.turnDarts).toEqual([])
      expect(state.status).toBe('playing')
      expect(state.winner).toBeNull()
      expect(results(mode, state)).toEqual([
        { value: 0, dartsThrown: 0 },
        { value: 0, dartsThrown: 0 },
      ])
    })

    it('keeps the player for 3 darts, then passes the turn', () => {
      const two = play([miss, miss])
      expect(two.state.currentPlayer).toBe(0)
      expect(two.state.turnDarts).toEqual([miss, miss])
      const three = play([miss, miss, miss])
      expect(three.state.currentPlayer).toBe(1)
      expect(three.state.turnDarts).toEqual([])
      expect(three.events).toContainEqual({ type: 'TurnEnded', player: 0 })
    })

    it('rejects an invalid dart', () => {
      expect(() => mode.applyDart(play([]).state, { segment: 25, multiplier: 3 })).toThrow()
    })

    it('sets a winner only once the match is finished', () => {
      for (let n = 0; n < win.length; n++) {
        const { state } = play(win.slice(0, n))
        expect(state.status).toBe('playing')
        expect(state.winner).toBeNull()
      }
      const end = play(win)
      expect(end.state.status).toBe('finished')
      expect(end.state.winner).toBe(0)
      expect(end.events).toContainEqual({ type: 'MatchWon', player: 0 })
    })

    it('rejects darts once the match is finished', () => {
      expect(() => mode.applyDart(play(win).state, miss)).toThrow()
    })

    it('counts every player dart in the results', () => {
      expect(results(mode, play(win).state).map((r) => r.dartsThrown)).toEqual([win.length - 3, 3])
    })

    it('adds each dart to the tally of the side that threw it, and only to it', () => {
      let { state } = play([])
      for (const dart of win) {
        const side = state.currentPlayer
        const next = mode.applyDart(state, dart).state
        const before = mode.tally(state)
        const after = mode.tally(next)
        after.forEach((tally, i) => {
          expect(tally.dartsThrown - before[i]!.dartsThrown).toBe(i === side ? 1 : 0)
          if (i !== side) expect(tally.points).toBe(before[i]!.points)
        })
        state = next
      }
    })

    it('replays the same log to the same state', () => {
      expect(play(win)).toEqual(play(win))
    })
  })
}

contract(
  'X01',
  x01.mode,
  { startScore: 40, doubleIn: false, doubleOut: true, playerCount: 2, legsToWinSet: 1, setsToWinMatch: 1 },
  [s(20), s(10), s(6), miss, miss, miss, d(2)],
)

const cricketWin = [t(20), t(19), d(25), miss, miss, miss, s(25)]

contract(
  'Cricket',
  cricket.mode,
  { playerCount: 2, targets: [20, 19, 25], targetPolicy: { kind: 'fixed' } },
  cricketWin,
)

contract(
  'Crazy cricket',
  cricket.mode,
  { playerCount: 2, targets: [20, 19, 25], targetPolicy: { kind: 'reroll', pool: [1, 2, 3, 4, 5] } },
  cricketWin,
)

contract(
  'Around the Clock',
  clock.mode,
  { playerCount: 2, sequence: [1, 2, 3, 25] },
  [s(1), d(2), t(3), miss, miss, miss, s(25)],
)

contract(
  'Killer',
  killer.mode,
  { playerCount: 2, lives: 1 },
  [d(20), miss, miss, miss, miss, miss, d(19)],
  [s(20), s(19)],
)
