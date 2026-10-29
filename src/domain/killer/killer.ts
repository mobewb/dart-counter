import { isValidDart, type Dart } from '../shared-kernel/dart'
import { replayLog, type DomainEvent, type Move } from '../shared-kernel/events'
import type { RoundLimitConfig } from '../shared-kernel/round-limit'

const DARTS_PER_TURN = 3

export interface KillerConfig extends RoundLimitConfig {
  /** At least 2 sides. */
  playerCount: number
  /** Lives each side starts with. */
  lives: number
}

export interface KillerPlayer {
  /** The side's own number, 1-20; null until drawn. */
  number: number | null
  lives: number
  /** Armed by hitting the double of its own number; only killers take lives. */
  killer: boolean
  /** Lives taken from opponents. */
  livesTaken: number
  /** Darts of the play phase; draw darts are not counted. */
  dartsThrown: number
}

export interface KillerMatch {
  config: KillerConfig
  players: KillerPlayer[]
  /** `draw`: each side throws one dart for its number. `play`: the game itself. */
  phase: 'draw' | 'play'
  currentPlayer: number
  turnDarts: Dart[]
  status: 'playing' | 'finished'
  winner: number | null
}

export function newMatch(config: KillerConfig): KillerMatch {
  if (config.playerCount < 2) throw new Error('Killer needs at least 2 players')
  return {
    config,
    players: Array.from({ length: config.playerCount }, () => ({ number: null, lives: config.lives, killer: false, livesTaken: 0, dartsThrown: 0 })),
    phase: 'draw',
    currentPlayer: 0,
    turnDarts: [],
    status: 'playing',
    winner: null,
  }
}

export const isAlive = (player: KillerPlayer) => player.lives > 0

/** Numbers no side has drawn yet. */
export function freeNumbers(match: KillerMatch): number[] {
  const taken = new Set(match.players.map((p) => p.number))
  return Array.from({ length: 20 }, (_, i) => i + 1).filter((n) => !taken.has(n))
}

/** The next side still in the game after `player`. */
function nextAlive(players: KillerPlayer[], player: number): number {
  let next = (player + 1) % players.length
  while (!isAlive(players[next]!)) next = (next + 1) % players.length
  return next
}

/** A free number is the side's own; a miss, the bull or a taken number is thrown again. */
function draw(state: KillerMatch, dart: Dart): Move<KillerMatch> {
  const { currentPlayer } = state
  if (!freeNumbers(state).includes(dart.segment)) return { state, events: [] }

  const players = state.players.map((p, i) => (i === currentPlayer ? { ...p, number: dart.segment } : p))
  const events: DomainEvent[] = [
    { type: 'NumberDrawn', player: currentPlayer, number: dart.segment },
    { type: 'TurnEnded', player: currentPlayer },
  ]
  const last = currentPlayer === players.length - 1
  return { state: { ...state, players, phase: last ? 'play' : 'draw', currentPlayer: last ? 0 : currentPlayer + 1 }, events }
}

/**
 * Only doubles count. A side's own double makes it a killer, then costs it a
 * life; a killer's hit on an opponent's double takes one of theirs. The last
 * side standing wins.
 */
function play(state: KillerMatch, dart: Dart): Move<KillerMatch> {
  const { currentPlayer } = state
  const events: DomainEvent[] = []
  const players = state.players.map((p) => ({ ...p }))
  const me = players[currentPlayer]!
  me.dartsThrown++

  const owner = dart.multiplier === 2 ? players.findIndex((p) => isAlive(p) && p.number === dart.segment) : -1
  const takeLife = (victim: number) => {
    players[victim]!.lives--
    events.push({ type: 'LifeLost', player: victim })
    if (!isAlive(players[victim]!)) events.push({ type: 'PlayerEliminated', player: victim })
  }
  if (owner === currentPlayer && !me.killer) {
    me.killer = true
    events.push({ type: 'KillerArmed', player: currentPlayer })
  } else if (owner === currentPlayer) {
    takeLife(owner)
  } else if (owner !== -1 && me.killer) {
    me.livesTaken++
    takeLife(owner)
  }

  const standing = players.flatMap((p, i) => (isAlive(p) ? [i] : []))
  if (standing.length === 1) {
    const winner = standing[0]!
    return {
      state: { ...state, players, turnDarts: [], status: 'finished', winner },
      events: [...events, { type: 'MatchWon', player: winner }],
    }
  }

  const turnDarts = [...state.turnDarts, dart]
  // A side that knocks itself out loses the rest of its turn.
  if (turnDarts.length >= DARTS_PER_TURN || !isAlive(me)) {
    events.push({ type: 'TurnEnded', player: currentPlayer })
    return { state: { ...state, players, turnDarts: [], currentPlayer: nextAlive(players, currentPlayer) }, events }
  }
  return { state: { ...state, players, turnDarts }, events }
}

export function applyDart(state: KillerMatch, dart: Dart): Move<KillerMatch> {
  if (state.status === 'finished') throw new Error('Match is finished')
  if (!isValidDart(dart)) throw new Error(`Invalid dart: ${dart.multiplier}x${dart.segment}`)
  return state.phase === 'draw' ? draw(state, dart) : play(state, dart)
}

/** Rebuilds the match from its dart log; undo is replaying one dart fewer. */
export function replay(config: KillerConfig, darts: readonly Dart[]): KillerMatch {
  return replayLog(newMatch(config), applyDart, darts).state
}
