import { isValidDart, type Dart } from '../shared-kernel/dart'
import { replayLog, type DomainEvent, type Move } from '../shared-kernel/events'

const DARTS_PER_TURN = 3
const BULL = 25

/** Around the Clock: 1 to 20 in order, then the bull. */
export const CLOCK_SEQUENCE = [...Array.from({ length: 20 }, (_, i) => i + 1), BULL]

export interface ClockConfig {
  playerCount: number
  /** Targets to hit in order; any multiplier counts. */
  sequence: number[]
}

export interface ClockPlayer {
  /** Index in the sequence of the next target; the sequence length means done. */
  progress: number
  dartsThrown: number
}

export interface ClockMatch {
  config: ClockConfig
  players: ClockPlayer[]
  currentPlayer: number
  turnDarts: Dart[]
  status: 'playing' | 'finished'
  winner: number | null
}

export function newMatch(config: ClockConfig): ClockMatch {
  return {
    config,
    players: Array.from({ length: config.playerCount }, () => ({ progress: 0, dartsThrown: 0 })),
    currentPlayer: 0,
    turnDarts: [],
    status: 'playing',
    winner: null,
  }
}

/** The segment a player must hit next, or null once done. */
export function targetOf(match: ClockMatch, player: number): number | null {
  return match.config.sequence[match.players[player]!.progress] ?? null
}

/** The first player to hit the last target wins, straight away. */
export function applyDart(state: ClockMatch, dart: Dart): Move<ClockMatch> {
  if (state.status === 'finished') throw new Error('Match is finished')
  if (!isValidDart(dart)) throw new Error(`Invalid dart: ${dart.multiplier}x${dart.segment}`)

  const { config, currentPlayer } = state
  const me = state.players[currentPlayer]!
  const hit = dart.segment !== 0 && dart.segment === targetOf(state, currentPlayer)
  const updated = { progress: me.progress + (hit ? 1 : 0), dartsThrown: me.dartsThrown + 1 }
  const players = state.players.map((p, i) => (i === currentPlayer ? updated : p))

  if (updated.progress >= config.sequence.length) {
    return {
      state: { ...state, players, turnDarts: [], status: 'finished', winner: currentPlayer },
      events: [{ type: 'MatchWon', player: currentPlayer }],
    }
  }

  const turnDarts = [...state.turnDarts, dart]
  if (turnDarts.length >= DARTS_PER_TURN) {
    const turnEnded: DomainEvent = { type: 'TurnEnded', player: currentPlayer }
    return { state: { ...state, players, turnDarts: [], currentPlayer: (currentPlayer + 1) % config.playerCount }, events: [turnEnded] }
  }
  return { state: { ...state, players, turnDarts }, events: [] }
}

/** Rebuilds the match from its dart log; undo is replaying one dart fewer. */
export function replay(config: ClockConfig, darts: readonly Dart[]): ClockMatch {
  return replayLog(newMatch(config), applyDart, darts).state
}
