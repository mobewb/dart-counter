import { describe, expect, it } from 'vitest'
import { startMatch } from '../application/match-setup'
import { DEFAULT_SETTINGS, loadLanguage, loadLastSetup, loadSettings, saveLanguage, saveLastSetup, saveSettings } from './preferences'

function memoryStore() {
  const data = new Map<string, string>()
  return { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => void data.set(key, value) }
}

const failingStore = {
  getItem: (): string | null => {
    throw new Error('blocked')
  },
  setItem: () => {
    throw new Error('blocked')
  },
}

describe('preferences', () => {
  it('remembers a known language', () => {
    const store = memoryStore()
    expect(loadLanguage(['en', 'fr'], store)).toBeUndefined()
    saveLanguage('fr', store)
    expect(loadLanguage(['en', 'fr'], store)).toBe('fr')
  })

  it('ignores an unknown language', () => {
    const store = memoryStore()
    saveLanguage('de', store)
    expect(loadLanguage(['en', 'fr'], store)).toBeUndefined()
  })

  it('remembers the last setup', () => {
    const store = memoryStore()
    const setup = startMatch({ mode: 'cricket', options: {}, names: ['Ann', 'Bob'] })
    saveLastSetup(setup, store)
    expect(loadLastSetup(store)).toEqual(setup)
    const killer = startMatch({ mode: 'killer', options: { lives: 3 }, names: ['Ann', 'Bob'] })
    saveLastSetup(killer, store)
    expect(loadLastSetup(store)).toEqual(killer)
  })

  it('ignores a corrupted last setup', () => {
    const store = memoryStore()
    store.setItem('dart-counter:last-setup', '{not json')
    expect(loadLastSetup(store)).toBeUndefined()
    store.setItem('dart-counter:last-setup', JSON.stringify({ mode: 'darts-golf', names: [] }))
    expect(loadLastSetup(store)).toBeUndefined()
    store.setItem('dart-counter:last-setup', JSON.stringify({ mode: 'toString', names: [], config: {} }))
    expect(loadLastSetup(store)).toBeUndefined()
  })

  it('remembers sound and vibration settings, with defaults', () => {
    const store = memoryStore()
    expect(loadSettings(store)).toEqual({ caller: false, haptics: true })
    saveSettings({ caller: true, haptics: false }, store)
    expect(loadSettings(store)).toEqual({ caller: true, haptics: false })
    store.setItem('dart-counter:settings', '{"caller":"yes"}')
    expect(loadSettings(store)).toEqual(DEFAULT_SETTINGS)
  })

  it('keeps working when storage is blocked', () => {
    expect(() => saveLanguage('fr', failingStore)).not.toThrow()
    expect(loadLanguage(['en', 'fr'], failingStore)).toBeUndefined()
    expect(loadLastSetup(failingStore)).toBeUndefined()
    expect(loadSettings(failingStore)).toEqual(DEFAULT_SETTINGS)
  })
})
