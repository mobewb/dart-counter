import type { Dart, PlayerResult } from '../domain'
import type { MatchSetup } from './match-setup'

/** The match being played, saved after every dart so it survives a refresh. */
export interface CurrentMatch {
  id: string
  setup: MatchSetup
  darts: Dart[]
  startedAt: number
  /** When a dart was last recorded or undone. */
  updatedAt: number
}

/** A match in the history. The dart log is kept so stats can be recomputed later. */
export interface FinishedMatch extends CurrentMatch {
  finishedAt: number
  /** The winning side. */
  winner: number
  /** Results per side (a player, or a team). */
  results: PlayerResult[]
  /** Each player's own results, by player index; differs from `results` in team play. */
  players: PlayerResult[]
}

/** Where matches are stored. The app keeps working, without saving, if storage fails. */
export interface MatchRepository {
  loadCurrent(): Promise<CurrentMatch | undefined>
  saveCurrent(match: CurrentMatch): Promise<void>
  clearCurrent(): Promise<void>
  /** Adds or replaces a match in the history, by id. */
  saveFinished(match: FinishedMatch): Promise<void>
  removeFinished(id: string): Promise<void>
  /** The history, most recently finished first. */
  listFinished(): Promise<FinishedMatch[]>
}
