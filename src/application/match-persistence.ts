import type { Dart, PlayerResult } from '../domain'
import type { CurrentMatch, MatchRepository } from './match-repository'
import { rulesFor, type MatchSetup } from './match-setup'
import { replaySession } from './match-session'

export function newCurrentMatch(setup: MatchSetup, now = Date.now(), id: string = crypto.randomUUID()): CurrentMatch {
  return { id, setup, darts: [], startedAt: now, updatedAt: now }
}

export interface Outcome {
  winner: number | null
  results: PlayerResult[]
}

/**
 * Saves the match in progress and keeps the history in sync: a finished match
 * is in the history; undoing its last dart takes it out again.
 */
export async function saveProgress(repository: MatchRepository, match: CurrentMatch, outcome: Outcome): Promise<void> {
  await repository.saveCurrent(match)
  if (outcome.winner === null) {
    await repository.removeFinished(match.id)
  } else {
    await repository.saveFinished({ ...match, finishedAt: match.updatedAt, winner: outcome.winner, results: outcome.results })
  }
}

/** The new dart log of a match, with its outcome. */
export function progress(match: CurrentMatch, darts: readonly Dart[], now = Date.now()): { match: CurrentMatch; outcome: Outcome } {
  const updated = { ...match, darts: [...darts], updatedAt: now }
  const rules = rulesFor(match.setup.mode)
  const { state } = replaySession(rules, { config: match.setup.config, darts })
  return { match: updated, outcome: { winner: state.winner, results: rules.results(state) } }
}

/** The saved match in progress, if it can still be replayed; an unreadable one is dropped. */
export async function resumeMatch(repository: MatchRepository): Promise<CurrentMatch | undefined> {
  const match = await repository.loadCurrent()
  if (!match) return undefined
  try {
    replaySession(rulesFor(match.setup.mode), { config: match.setup.config, darts: match.darts })
    return match
  } catch {
    await repository.clearCurrent()
    return undefined
  }
}

/** Leaves the match in progress. A finished match stays in the history. */
export function leaveMatch(repository: MatchRepository): Promise<void> {
  return repository.clearCurrent()
}
