import { IDBFactory } from 'fake-indexeddb'
import { describe, expect, it } from 'vitest'
import type { CurrentMatch, FinishedMatch } from '../application/match-repository'
import { createIndexedDbRepository } from './indexeddb-repository'

const current = (id: string, updatedAt = 1): CurrentMatch => ({
  id,
  setup: { mode: 'cricket', names: ['Ann'], config: { playerCount: 1, targets: [20, 25], targetPolicy: { kind: 'fixed' } } },
  darts: [{ segment: 20, multiplier: 3 }],
  startedAt: 0,
  updatedAt,
})

const finished = (id: string, finishedAt: number): FinishedMatch => ({
  ...current(id, finishedAt),
  finishedAt,
  winner: 0,
  results: [{ value: 0, dartsThrown: 1 }],
  players: [{ value: 0, dartsThrown: 1 }],
})

describe('IndexedDB match repository', () => {
  it('has no current match at first', async () => {
    expect(await createIndexedDbRepository(new IDBFactory()).loadCurrent()).toBeUndefined()
  })

  it('saves, replaces and clears the current match', async () => {
    const repo = createIndexedDbRepository(new IDBFactory())
    await repo.saveCurrent(current('a'))
    await repo.saveCurrent(current('b'))
    expect(await repo.loadCurrent()).toEqual(current('b'))
    await repo.clearCurrent()
    expect(await repo.loadCurrent()).toBeUndefined()
  })

  it('keeps the current match across connections', async () => {
    const factory = new IDBFactory()
    await createIndexedDbRepository(factory).saveCurrent(current('a'))
    expect(await createIndexedDbRepository(factory).loadCurrent()).toEqual(current('a'))
  })

  it('lists finished matches, most recent first', async () => {
    const repo = createIndexedDbRepository(new IDBFactory())
    await repo.saveFinished(finished('old', 1))
    await repo.saveFinished(finished('new', 3))
    await repo.saveFinished(finished('mid', 2))
    expect((await repo.listFinished()).map((m) => m.id)).toEqual(['new', 'mid', 'old'])
  })

  it('replaces a finished match by id and removes it', async () => {
    const repo = createIndexedDbRepository(new IDBFactory())
    await repo.saveFinished(finished('a', 1))
    await repo.saveFinished(finished('a', 2))
    expect((await repo.listFinished()).map((m) => m.finishedAt)).toEqual([2])
    await repo.removeFinished('a')
    expect(await repo.listFinished()).toEqual([])
  })

  it('rejects every call when IndexedDB is unavailable', async () => {
    const repo = createIndexedDbRepository(undefined)
    await expect(repo.loadCurrent()).rejects.toThrow('IndexedDB is not available')
    await expect(repo.saveCurrent(current('a'))).rejects.toThrow()
  })
})
