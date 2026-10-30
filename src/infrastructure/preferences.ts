import type { MatchSetup } from '../application/match-setup'
import { STORAGE_NAME } from './storage-name'

/** Small per-device preferences, kept in localStorage. */
type KeyValueStore = Pick<Storage, 'getItem' | 'setItem'>

const LANG = `${STORAGE_NAME}:lang`
const LAST_SETUP = `${STORAGE_NAME}:last-setup`
const SETTINGS = `${STORAGE_NAME}:settings`
const MODES = ['x01', 'cricket', 'crazy', 'clock', 'three21']

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

/** Sound and touch feedback during a match. */
export interface Settings {
  /** Spoken calls: visit scores, busts, what a player requires. */
  caller: boolean
  /** A short vibration on each dart, a pattern on a bust or a win. */
  haptics: boolean
}

/** A talking phone in a pub is opt-in; a light tick is not. */
export const DEFAULT_SETTINGS: Settings = { caller: false, haptics: true }

export function loadSettings(store = defaultStore()): Settings {
  try {
    const saved = JSON.parse(read(store, SETTINGS) ?? '{}')
    return {
      caller: typeof saved.caller === 'boolean' ? saved.caller : DEFAULT_SETTINGS.caller,
      haptics: typeof saved.haptics === 'boolean' ? saved.haptics : DEFAULT_SETTINGS.haptics,
    }
  } catch {
    return DEFAULT_SETTINGS
  }
}

export function saveSettings(settings: Settings, store = defaultStore()): void {
  write(store, SETTINGS, JSON.stringify(settings))
}
