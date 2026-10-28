import type { MatchSetup } from '../application/match-setup'

/** Small per-device preferences, kept in localStorage. */
type KeyValueStore = Pick<Storage, 'getItem' | 'setItem'>

const LANG = 'dart-counter:lang'
const LAST_SETUP = 'dart-counter:last-setup'
const MODES = ['x01', 'cricket', 'crazy', 'clock']

/** localStorage, or undefined where it is blocked (some private modes). */
function defaultStore(): KeyValueStore | undefined {
  try {
    return globalThis.localStorage
  } catch {
    return undefined
  }
}

function read(store: KeyValueStore | undefined, key: string): string | null {
  try {
    return store?.getItem(key) ?? null
  } catch {
    return null
  }
}

function write(store: KeyValueStore | undefined, key: string, value: string): void {
  try {
    store?.setItem(key, value)
  } catch {
    // Storage full or blocked: preferences are a convenience, not required.
  }
}

export function loadLanguage<Lang extends string>(known: readonly Lang[], store = defaultStore()): Lang | undefined {
  const lang = read(store, LANG)
  return known.find((l) => l === lang)
}

export function saveLanguage(lang: string, store = defaultStore()): void {
  write(store, LANG, lang)
}

/** The setup of the last match started, used to pre-fill the setup screen. */
export function loadLastSetup(store = defaultStore()): MatchSetup | undefined {
  try {
    const setup = JSON.parse(read(store, LAST_SETUP) ?? 'null')
    const valid = setup && MODES.includes(setup.mode) && Array.isArray(setup.names) && typeof setup.config === 'object'
    return valid ? (setup as MatchSetup) : undefined
  } catch {
    return undefined
  }
}

export function saveLastSetup(setup: MatchSetup, store = defaultStore()): void {
  write(store, LAST_SETUP, JSON.stringify(setup))
}
