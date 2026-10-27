import type { Dart } from '../shared-kernel/dart'

export interface X01Config {
  startScore: number
  doubleIn: boolean
  doubleOut: boolean
  playerCount: number
  legsToWinSet: number
  setsToWinMatch: number
}

export interface X01Player {
  remaining: number
  /** false until a double is hit when double-in is on. */
  in: boolean
  legs: number
  sets: number
  dartsThrown: number
  pointsScored: number
}

export interface X01Match {
  config: X01Config
  players: X01Player[]
  currentPlayer: number
  legStarter: number
  /** Darts thrown in the current turn, in order. */
  turnDarts: Dart[]
  /** Snapshot of the current player at turn start, used to undo a bust. */
  turnStart: { remaining: number; in: boolean }
  /** True when the last dart busted the turn; reset on the next dart. */
  busted: boolean
  status: 'playing' | 'finished'
  winner: number | null
}
