import type { CurrentMatch, FinishedMatch, MatchRepository } from '../application/match-repository'
import { STORAGE_NAME } from './storage-name'

const DB_NAME = STORAGE_NAME
const VERSION = 1
/** Holds a single record: the match in progress. */
const CURRENT = 'current'
const CURRENT_KEY = 'current'
/** The history of finished matches, by id. */
const MATCHES = 'matches'

function request<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function open(factory: IDBFactory): Promise<IDBDatabase> {
  const req = factory.open(DB_NAME, VERSION)
  req.onupgradeneeded = () => {
    const db = req.result
    db.createObjectStore(CURRENT)
    db.createObjectStore(MATCHES, { keyPath: 'id' }).createIndex('finishedAt', 'finishedAt')
  }
  return request(req)
}

/** Runs `run` in a transaction on `store` and resolves once the transaction is committed. */
async function inStore<T>(db: Promise<IDBDatabase>, store: string, mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const tx = (await db).transaction(store, mode)
  const committed = new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error)
  })
  const [result] = await Promise.all([request(run(tx.objectStore(store))), committed])
  return result
}

/** Opens the database lazily; every call rejects if IndexedDB is unavailable. */
export function createIndexedDbRepository(factory: IDBFactory | undefined = globalThis.indexedDB): MatchRepository {
  let db: Promise<IDBDatabase> | undefined
  const connect = () => (db ??= factory ? open(factory) : Promise.reject(new Error('IndexedDB is not available')))

  return {
    loadCurrent: () => inStore<CurrentMatch | undefined>(connect(), CURRENT, 'readonly', (s) => s.get(CURRENT_KEY)),
    saveCurrent: async (match) => void (await inStore(connect(), CURRENT, 'readwrite', (s) => s.put(match, CURRENT_KEY))),
    clearCurrent: async () => void (await inStore(connect(), CURRENT, 'readwrite', (s) => s.delete(CURRENT_KEY))),
    saveFinished: async (match) => void (await inStore(connect(), MATCHES, 'readwrite', (s) => s.put(match))),
    removeFinished: async (id) => void (await inStore(connect(), MATCHES, 'readwrite', (s) => s.delete(id))),
    listFinished: async () => {
      const matches = await inStore<FinishedMatch[]>(connect(), MATCHES, 'readonly', (s) => s.index('finishedAt').getAll())
      return matches.reverse()
    },
  }
}
