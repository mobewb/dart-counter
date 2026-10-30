import { dartScore, isValidDart, type Dart } from '../shared-kernel/dart'
import { replayLog, type DomainEvent, type Move } from '../shared-kernel/events'
import type { RoundLimitConfig } from '../shared-kernel/round-limit'

const DARTS_PER_TURN = 3

/** The score to reach exactly. */
export const TARGET = 321

export interface Three21Config extends RoundLimitConfig {
  playerCount: number
}

export interface Three21Player {
  score: number
  dartsThrown: number
}

export interface Three21Match {
  config: Three21Config
  players: Three21Player[]
  currentPlayer: number
  turnDarts: Dart[]
  status: 'playing' | 'finished'
  winner: number | null
}

export function newMatch(config: Three21Config): Three21Match {
  return {
    config,
    players: Array.from({ length: config.playerCount }, () => ({ score: 0, dartsThrown: 0 })),
    currentPlayer: 0,
    turnDarts: [],
    status: 'playing',
    winner: null,
  }
}

/**
 * Darts add up from 0; the first to reach exactly 321 wins, straight away.
 * Going over bounces back by the excess (330 → 312). Landing on an
 * opponent's score sends that opponent back to 0.
 */
export function applyDart(state: Three21Match, dart: Dart): Move<Three21Match> {
  if (state.status === 'finished') throw new Error('Match is finished')
  if (!isValidDart(dart)) throw new Error(`Invalid dart: ${dart.multiplier}x${dart.segment}`)

  const { config, currentPlayer } = state
  const me = state.players[currentPlayer]!
  const points = dartScore(dart)
  const total = me.score + points
  const score = total > TARGET ? 2 * TARGET - total : total
  const events: DomainEvent[] = total > TARGET ? [{ type: 'Bounced', player: currentPlayer }] : []

  // A miss leaves the score where it was, so it cannot knock anyone back.
  const knocked = points > 0 && score > 0 && score < TARGET
    ? state.players.flatMap((p, i) => (i !== currentPlayer && p.score === score ? [i] : []))
    : []
  if (knocked.length > 0) events.push({ type: 'KnockedBack', by: currentPlayer, players: knocked })

  const players = state.players.map((p, i) => {
    if (i === currentPlayer) return { score, dartsThrown: me.dartsThrown + 1 }
    return knocked.includes(i) ? { ...p, score: 0 } : p
  })

  if (score === TARGET) {
    return {
      state: { ...state, players, turnDarts: [], status: 'finished', winner: currentPlayer },
      events: [{ type: 'MatchWon', player: currentPlayer }],
    }
  }

  const turnDarts = [...state.turnDarts, dart]
  if (turnDarts.length >= DARTS_PER_TURN) {
    const turnEnded: DomainEvent = { type: 'TurnEnded', player: currentPlayer }
    return { state: { ...state, players, turnDarts: [], currentPlayer: (currentPlayer + 1) % config.playerCount }, events: [...events, turnEnded] }
  }
  return { state: { ...state, players, turnDarts }, events }
}

/** Rebuilds the match from its dart log; undo is replaying one dart fewer. */
export function replay(config: Three21Config, darts: readonly Dart[]): Three21Match {
  return replayLog(newMatch(config), applyDart, darts).state
}
