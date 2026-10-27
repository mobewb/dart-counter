import type { Dart } from './dart'
import type { Move } from './events'

/** What every match state exposes, whatever its game mode. */
export interface MatchCore {
  currentPlayer: number
  /** Darts thrown in the current turn, in order. */
  turnDarts: Dart[]
  status: 'playing' | 'finished'
  winner: number | null
}

/** End-of-match figures for one player. */
export interface PlayerResult {
  /** The mode's headline stat: 3-dart average in X01, points in cricket. */
  value: number
  dartsThrown: number
}

/** The rules of one game mode. Match state is always rebuilt from config + dart log. */
export interface GameMode<Config, State extends MatchCore> {
  newMatch(config: Config): State
  /** Throws on an invalid dart or a finished match. */
  applyDart(state: State, dart: Dart): Move<State>
  results(state: State): PlayerResult[]
}
