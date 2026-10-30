import { clockModule } from './clock'
import { crazyModule, cricketModule } from './cricket'
import { killerModule } from './killer'
import { three21Module } from './three21'
import type { GameModeId, MatchSetup, ModeModule, Setup } from './types'
import { x01Module } from './x01'

export type * from './types'
export { FAMILY } from './types'
export type { ClockRecord, ClockStats } from './clock'
export type { CricketRecord, CricketStats } from './cricket'
export type { KillerRecord, KillerStats } from './killer'
export type { Three21Record, Three21Stats } from './three21'
export type { X01Record, X01Stats } from './x01'

/** One module per game mode, in the order the setup screen lists them. */
export const modules: { [K in GameModeId]: ModeModule<K> } = {
  x01: x01Module,
  cricket: cricketModule,
  crazy: crazyModule,
  clock: clockModule,
  killer: killerModule,
  three21: three21Module,
}

export const gameModes = Object.keys(modules) as GameModeId[]

/**
 * A setup built by generic code. Its config matches its mode by construction,
 * which TypeScript cannot see through a type parameter.
 */
export const toMatchSetup = <K extends GameModeId>(setup: Setup<K>): MatchSetup => setup as MatchSetup

/** A setup read back from storage, if it still has the shape of one. */
export function parseSetup(value: unknown): MatchSetup | undefined {
  if (typeof value !== 'object' || value === null) return undefined
  const { mode, names, config, teams } = value as Record<string, unknown>
  const valid =
    typeof mode === 'string' && Object.hasOwn(modules, mode) &&
    Array.isArray(names) && names.every((name) => typeof name === 'string') &&
    typeof config === 'object' && config !== null &&
    (teams === undefined || Array.isArray(teams))
  return valid ? (value as MatchSetup) : undefined
}
