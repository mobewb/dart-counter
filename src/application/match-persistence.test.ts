import { describe, expect, it } from 'vitest'
import type { Dart } from '../domain'
import type { CurrentMatch, FinishedMatch, MatchRepository } from './match-repository'
import { leaveMatch, newCurrentMatch, progress, resumeMatch, saveProgress } from './match-persistence'
import { startMatch } from './match-setup'

function memoryRepository(): MatchRepository & { history: Map<string, FinishedMatch> } {
  let current: CurrentMatch | undefined
  const history = new Map<string, FinishedMatch>()
  return {
    history,
    loadCurrent: async () => current,
    saveCurrent: async (match) => void (current = match),
    clearCurrent: async () => void (current = undefined),
    saveFinished: async (match) => void history.set(match.id, match),
    removeFinished: async (id) => void history.delete(id),
    listFinished: async () => [...history.values()].sort((a, b) => b.finishedAt - a.finishedAt),
  }
}

const d = (n: number): Dart => ({ segment: n, multiplier: 2 })
const s = (n: number): Dart => ({ segment: n, multiplier: 1 })
const rules = { startScore: 40, doubleIn: false, doubleOut: true, legsToWinSet: 1, setsToWinMatch: 1 }
const setup = startMatch({ mode: 'x01', names: ['Ann', 'Bob'], rules })

/** Records `darts` as the match's new log, the way the game screen does. */
const play = (repo: MatchRepository, match: CurrentMatch, darts: Dart[], now = 10) => {
  const next = progress(match, darts, now)
  return saveProgress(repo, next.match, next.outcome).then(() => next.match)
}

describe('match persistence', () => {
  it('starts a match with an id and an empty dart log', () => {
    expect(newCurrentMatch(setup, 5, 'id-1')).toEqual({ id: 'id-1', setup, darts: [], startedAt: 5, updatedAt: 5 })
  })

  it('resumes the match in progress after a refresh', async () => {
    const repo = memoryRepository()
    const match = await play(repo, newCurrentMatch(setup, 0, 'm'), [s(20)])
    expect(await resumeMatch(repo)).toEqual(match)
    expect(repo.history.size).toBe(0)
  })

  it('adds a finished match to the history with its winner and results', async () => {
    const repo = memoryRepository()
    await play(repo, newCurrentMatch(setup, 0, 'm'), [d(20)], 42)
    const [entry] = await repo.listFinished()
    expect(entry).toMatchObject({ id: 'm', winner: 0, finishedAt: 42, darts: [d(20)] })
    expect(entry!.results.map((r) => r.dartsThrown)).toEqual([1, 0])
  })

  it('keeps each player\'s own results in a team match', async () => {
    const repo = memoryRepository()
    const teams = startMatch({ mode: 'x01', names: ['Ann', 'Bob', 'Cid'], teams: [0, 1, 0], rules })
    await play(repo, newCurrentMatch(teams, 0, 't'), [s(20), s(10), s(6), ...[0, 0, 0].map(() => s(0)), d(2)])
    const [entry] = await repo.listFinished()
    expect(entry!.results.map((r) => r.dartsThrown)).toEqual([4, 3])
    expect(entry!.players.map((r) => r.dartsThrown)).toEqual([3, 3, 1])
  })

  it('takes a match out of the history when its winning dart is undone', async () => {
    const repo = memoryRepository()
    const won = await play(repo, newCurrentMatch(setup, 0, 'm'), [d(20)])
    await play(repo, won, [])
    expect(repo.history.size).toBe(0)
  })

  it('keeps the history when leaving a finished match', async () => {
    const repo = memoryRepository()
    await play(repo, newCurrentMatch(setup, 0, 'm'), [d(20)])
    await leaveMatch(repo)
    expect(await resumeMatch(repo)).toBeUndefined()
    expect(repo.history.size).toBe(1)
  })

  it('drops a saved match that can no longer be replayed', async () => {
    const repo = memoryRepository()
    await repo.saveCurrent({ ...newCurrentMatch(setup, 0, 'm'), darts: [{ segment: 25, multiplier: 3 }] })
    expect(await resumeMatch(repo)).toBeUndefined()
    expect(await repo.loadCurrent()).toBeUndefined()
  })
})
