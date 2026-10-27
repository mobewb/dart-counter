export type Multiplier = 1 | 2 | 3

/** segment: 0 = miss, 1-20 = numbered segments, 25 = bull (double = 50). */
export interface Dart {
  segment: number
  multiplier: Multiplier
}

export interface MatchConfig {
  startScore: number
  doubleIn: boolean
  doubleOut: boolean
  playerCount: number
  legsToWinSet: number
  setsToWinMatch: number
}

export interface PlayerState {
  remaining: number
  /** false until a double is hit when double-in is on. */
  in: boolean
  legs: number
  sets: number
  dartsThrown: number
  pointsScored: number
}

export interface MatchState {
  config: MatchConfig
  players: PlayerState[]
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
