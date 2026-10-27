import { describe, expect, it } from 'vitest'
import { x01, type Dart } from '../domain'
import { newSession, recordDart, replaySession, undo } from './match-session'

const d = (n: number): Dart => ({ segment: n, multiplier: 2 })
const s = (n: number): Dart => ({ segment: n, multiplier: 1 })

const config: x01.X01Config = { startScore: 40, doubleIn: false, doubleOut: true, playerCount: 2, legsToWinSet: 1, setsToWinMatch: 1 }

describe('match session', () => {
  it('starts with an empty dart log', () => {
    expect(newSession(config)).toEqual({ config, darts: [] })
  })

  it('records darts and replays them into state and last events', () => {
    let session = newSession(config)
    session = recordDart(x01.mode, session, s(20))
    session = recordDart(x01.mode, session, s(20))
    const { state, events } = replaySession(x01.mode, session)
    expect(state.players[0]!.remaining).toBe(40)
    expect(events).toEqual([{ type: 'Bust', player: 0 }, { type: 'TurnEnded', player: 0 }])
  })

  it('rejects an invalid dart without recording it', () => {
    const session = newSession(config)
    expect(() => recordDart(x01.mode, session, { segment: 25, multiplier: 3 })).toThrow()
    expect(session.darts).toEqual([])
  })

  it('ignores darts once the match is over', () => {
    const won = recordDart(x01.mode, newSession(config), d(20))
    expect(recordDart(x01.mode, won, s(1))).toBe(won)
  })

  it('undoes the last dart, even after the match is won', () => {
    const won = recordDart(x01.mode, newSession(config), d(20))
    const back = undo(won)
    expect(back.darts).toEqual([])
    expect(replaySession(x01.mode, back).state.status).toBe('playing')
  })

  it('undo on an empty log is a no-op', () => {
    expect(undo(newSession(config)).darts).toEqual([])
  })
})
