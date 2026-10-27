import { isValidDart, type Dart } from '../shared-kernel/dart'
import { replayLog, type DomainEvent, type Move } from '../shared-kernel/events'

const DARTS_PER_TURN = 3
const MARKS_TO_CLOSE = 3
export const BULL = 25

/** Standard cricket: 20 down to 15, then the bull. */
export const CRICKET_TARGETS = [20, 19, 18, 17, 16, 15, BULL]

/**
 * How a match picks its targets. *fixed*: the starting targets for the whole
 * match. *reroll* (crazy cricket): after a full round, targets nobody hit are
 * replaced from `pool`, in order. The pool is dealt up front so replaying a log
 * is deterministic.
 */
export type TargetPolicy = { kind: 'fixed' } | { kind: 'reroll'; pool: number[] }

export interface CricketConfig {
  playerCount: number
  /** Segments that count at the start, with 25 for the bull. */
  targets: number[]
  targetPolicy: TargetPolicy
}

export interface CricketPlayer {
  /** Marks per target segment, 0 to 3. Missing means none. */
  marks: Record<number, number>
  points: number
  dartsThrown: number
}

export interface CricketMatch {
  config: CricketConfig
  players: CricketPlayer[]
  currentPlayer: number
  turnDarts: Dart[]
  /** Current targets; crazy cricket swaps untouched ones between rounds. */
  targets: number[]
  poolIndex: number
  /** Targets hit by anyone since the round began. */
  roundHits: number[]
  status: 'playing' | 'finished'
  winner: number | null
}

export function marksOn(player: CricketPlayer, target: number): number {
  return player.marks[target] ?? 0
}

export function isClosed(player: CricketPlayer, target: number): boolean {
  return marksOn(player, target) >= MARKS_TO_CLOSE
}

export function newMatch(config: CricketConfig): CricketMatch {
  return {
    config,
    players: Array.from({ length: config.playerCount }, () => ({ marks: {}, points: 0, dartsThrown: 0 })),
    currentPlayer: 0,
    turnDarts: [],
    targets: config.targets,
    poolIndex: 0,
    roundHits: [],
    status: 'playing',
    winner: null,
  }
}

/**
 * After a full round, swap numbers nobody hit during that round for fresh ones
 * from the pool. Marks on a replaced number are discarded; points are kept.
 */
function reroll(state: CricketMatch, players: CricketPlayer[]): Move<CricketMatch> {
  const policy = state.config.targetPolicy
  const pool = policy.kind === 'reroll' ? policy.pool : []
  const targets = [...state.targets]
  const replaced: number[] = []
  const dropped: number[] = []
  let poolIndex = state.poolIndex
  targets.forEach((target, index) => {
    if (target !== BULL && !state.roundHits.includes(target) && poolIndex < pool.length) {
      dropped.push(target)
      targets[index] = pool[poolIndex++]!
      replaced.push(index)
    }
  })
  const base = { ...state, roundHits: [] }
  if (replaced.length === 0) return { state: { ...base, players }, events: [] }
  const cleaned = players.map((p) => ({
    ...p,
    marks: Object.fromEntries(Object.entries(p.marks).filter(([target]) => !dropped.includes(Number(target)))),
  }))
  return { state: { ...base, players: cleaned, targets, poolIndex }, events: [{ type: 'TargetsRerolled', replaced }] }
}

export function applyDart(state: CricketMatch, dart: Dart): Move<CricketMatch> {
  if (state.status === 'finished') throw new Error('Match is finished')
  if (!isValidDart(dart)) throw new Error(`Invalid dart: ${dart.multiplier}x${dart.segment}`)

  const { config, currentPlayer } = state
  const me = state.players[currentPlayer]!
  const isTarget = dart.segment !== 0 && state.targets.includes(dart.segment)

  let marks = me.marks
  let points = me.points
  const roundHits = isTarget && !state.roundHits.includes(dart.segment) ? [...state.roundHits, dart.segment] : state.roundHits
  if (isTarget) {
    const have = marksOn(me, dart.segment)
    const applied = Math.min(dart.multiplier, MARKS_TO_CLOSE - have)
    const overflow = dart.multiplier - applied
    marks = { ...me.marks, [dart.segment]: have + applied }
    const opponentOpen = state.players.some((p, i) => i !== currentPlayer && !isClosed(p, dart.segment))
    if (overflow > 0 && opponentOpen) points += overflow * dart.segment
  }

  const updated: CricketPlayer = { marks, points, dartsThrown: me.dartsThrown + 1 }
  const players = state.players.map((p, i) => (i === currentPlayer ? updated : p))

  state = { ...state, roundHits }
  const allClosed = state.targets.every((target) => isClosed(updated, target))
  const bestOpponent = Math.max(0, ...players.filter((_, i) => i !== currentPlayer).map((p) => p.points))
  if (allClosed && updated.points >= bestOpponent) {
    return {
      state: { ...state, players, turnDarts: [], status: 'finished', winner: currentPlayer },
      events: [{ type: 'MatchWon', player: currentPlayer }],
    }
  }

  const turnDarts = [...state.turnDarts, dart]
  if (turnDarts.length >= DARTS_PER_TURN) {
    const next = (currentPlayer + 1) % config.playerCount
    const advanced = { ...state, turnDarts: [], currentPlayer: next }
    const turnEnded: DomainEvent = { type: 'TurnEnded', player: currentPlayer }
    if (next !== 0) return { state: { ...advanced, players }, events: [turnEnded] }
    const rolled = reroll(advanced, players)
    return { state: rolled.state, events: [turnEnded, ...rolled.events] }
  }
  return { state: { ...state, players, turnDarts }, events: [] }
}

/** Rebuilds the match from its dart log; undo is replaying one dart fewer. */
export function replay(config: CricketConfig, darts: readonly Dart[]): CricketMatch {
  return replayLog(newMatch(config), applyDart, darts).state
}
