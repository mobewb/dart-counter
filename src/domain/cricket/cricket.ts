import { isValidDart, type Dart } from '../shared-kernel/dart'

const DARTS_PER_TURN = 3
const MARKS_TO_CLOSE = 3
const BULL = 25

/** Standard cricket: 20 down to 15, then the bull. */
export const CRICKET_TARGETS = [20, 19, 18, 17, 16, 15, BULL]

export interface CricketConfig {
  playerCount: number
  /** Segments that count at the start, with 25 for the bull. */
  targets: number[]
  /**
   * Crazy cricket only: numbers (in order) that replace targets nobody has
   * marked after a full round. Fixed up front so replaying a log is deterministic.
   */
  rerollPool?: number[]
}

export interface CricketPlayer {
  /** Marks per target segment, 0 to 3. Missing means none. */
  marks: Record<number, number>
  points: number
  dartsThrown: number
}

export interface CricketState {
  config: CricketConfig
  players: CricketPlayer[]
  currentPlayer: number
  turnDarts: Dart[]
  /** Current targets; crazy cricket swaps untouched ones between rounds. */
  targets: number[]
  poolIndex: number
  /** Targets hit by anyone since the round began. */
  roundHits: number[]
  /** Number of rerolls so far; the UI animates when it increases. */
  rollCount: number
  /** Target indexes replaced by the most recent dart's reroll, if any. */
  lastRoll: number[]
  status: 'playing' | 'finished'
  winner: number | null
}

/** Six random numbers (high to low) plus the bull, and the shuffled numbers left over. */
export function crazyDeal(random: () => number = Math.random): { targets: number[]; rerollPool: number[] } {
  const numbers = Array.from({ length: 20 }, (_, i) => i + 1)
  for (let i = numbers.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[numbers[i], numbers[j]] = [numbers[j]!, numbers[i]!]
  }
  const targets = [...numbers.slice(0, 6).sort((a, b) => b - a), BULL]
  return { targets, rerollPool: numbers.slice(6) }
}

export function crazyTargets(random: () => number = Math.random): number[] {
  return crazyDeal(random).targets
}

export function marksOn(player: CricketPlayer, target: number): number {
  return player.marks[target] ?? 0
}

export function isClosed(player: CricketPlayer, target: number): boolean {
  return marksOn(player, target) >= MARKS_TO_CLOSE
}

export function newCricket(config: CricketConfig): CricketState {
  return {
    config,
    players: Array.from({ length: config.playerCount }, () => ({ marks: {}, points: 0, dartsThrown: 0 })),
    currentPlayer: 0,
    turnDarts: [],
    targets: config.targets,
    poolIndex: 0,
    roundHits: [],
    rollCount: 0,
    lastRoll: [],
    status: 'playing',
    winner: null,
  }
}

/**
 * After a full round, swap numbers nobody hit during that round for fresh ones
 * from the pool. Marks on a replaced number are discarded; points are kept.
 */
function reroll(state: CricketState, players: CricketPlayer[]): CricketState {
  const pool = state.config.rerollPool ?? []
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
  if (replaced.length === 0) return { ...base, players }
  const cleaned = players.map((p) => ({
    ...p,
    marks: Object.fromEntries(Object.entries(p.marks).filter(([target]) => !dropped.includes(Number(target)))),
  }))
  return { ...base, players: cleaned, targets, poolIndex, rollCount: state.rollCount + 1, lastRoll: replaced }
}

export function throwCricketDart(state: CricketState, dart: Dart): CricketState {
  if (state.status === 'finished') throw new Error('Game is finished')
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
    return { ...state, players, turnDarts: [], lastRoll: [], status: 'finished', winner: currentPlayer }
  }

  const turnDarts = [...state.turnDarts, dart]
  if (turnDarts.length >= DARTS_PER_TURN) {
    const next = (currentPlayer + 1) % config.playerCount
    const advanced = { ...state, turnDarts: [], currentPlayer: next, lastRoll: [] }
    return next === 0 ? reroll(advanced, players) : { ...advanced, players }
  }
  return { ...state, players, turnDarts, lastRoll: [] }
}

/** Rebuilds the game from its dart log; undo is replaying one dart fewer. */
export function replayCricket(config: CricketConfig, darts: readonly Dart[]): CricketState {
  return darts.reduce(throwCricketDart, newCricket(config))
}
