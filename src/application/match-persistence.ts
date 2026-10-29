import { openMatch, type Match } from './match'
import type { CurrentMatch, MatchRepository } from './match-repository'
import type { MatchSetup } from './modes'

export function newCurrentMatch(setup: MatchSetup, now = Date.now(), id: string = crypto.randomUUID()): CurrentMatch {
  return { id, setup, darts: [], startedAt: now, updatedAt: now }
}

/**
 * Saves the match in progress as of `match`, its new dart log, and keeps the
 * history in sync: a finished match is in the history; undoing its last dart
 * takes it out again.
 */
export async function saveProgress(repository: MatchRepository, current: CurrentMatch, match: Match, now = Date.now()): Promise<void> {
  const saved = { ...current, darts: [...match.darts], updatedAt: now }
  await repository.saveCurrent(saved)
  const { winner } = match.state
  if (winner === null) {
    await repository.removeFinished(saved.id)
  } else {
    await repository.saveFinished({ ...saved, finishedAt: now, winner, results: match.results, players: match.players })
  }
}

/** The saved match in progress, if it can still be replayed; an unreadable one is dropped. */
export async function resumeMatch(repository: MatchRepository): Promise<CurrentMatch | undefined> {
  const match = await repository.loadCurrent()
  if (!match) return undefined
  try {
    openMatch(match.setup, match.darts)
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
