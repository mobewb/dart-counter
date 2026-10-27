import type { Dart } from './dart'
import type { Move } from './events'

/**
 * What every match state exposes, whatever its game mode. Scores belong to
 * sides: a side is a single player, or a team sharing one score. The domain
 * calls them players (`currentPlayer`, `players`, `playerCount`).
 */
export interface MatchCore {
  currentPlayer: number
  /** Darts thrown in the current turn, in order. */
  turnDarts: Dart[]
  status: 'playing' | 'finished'
  winner: number | null
}

/** Running totals that add up dart by dart, so they can be split between team members. */
export interface Tally {
  /** Points that count: X01 points scored (busted turns score nothing), cricket points. */
  points: number
  dartsThrown: number
}

/** End-of-match figures for one side or one player. */
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
  /** Totals per side. */
  tally(state: State): Tally[]
  /** The headline stat of a tally. */
  headline(tally: Tally): number
}

export function toResult<Config, State extends MatchCore>(mode: GameMode<Config, State>, tally: Tally): PlayerResult {
  return { value: mode.headline(tally), dartsThrown: tally.dartsThrown }
}

/** End-of-match figures per side. */
export function results<Config, State extends MatchCore>(mode: GameMode<Config, State>, state: State): PlayerResult[] {
  return mode.tally(state).map((tally) => toResult(mode, tally))
}
