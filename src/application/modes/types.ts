import type { clock, cricket, Dart, DomainEvent, GameMode, killer, Limited, x01 } from '../../domain'
import type { Call } from '../caller'
import type { ClockRecord, ClockStats } from './clock'
import type { CricketRecord, CricketStats } from './cricket'
import type { KillerRecord, KillerStats } from './killer'
import type { X01Record, X01Stats } from './x01'

/** Options of a mode the player picks nothing for. */
export type NoOptions = Record<string, never>

/** The types of each rule family. Every state carries a round count, since every mode can be cut short. */
export interface Families {
  x01: { config: x01.X01Config; state: Limited<x01.X01Match>; options: Omit<x01.X01Config, 'playerCount' | 'maxRounds'>; stats: X01Stats; record: X01Record }
  cricket: { config: cricket.CricketConfig; state: Limited<cricket.CricketMatch>; options: NoOptions; stats: CricketStats; record: CricketRecord }
  clock: { config: clock.ClockConfig; state: Limited<clock.ClockMatch>; options: NoOptions; stats: ClockStats; record: ClockRecord }
  killer: { config: killer.KillerConfig; state: Limited<killer.KillerMatch>; options: { lives: number }; stats: KillerStats; record: KillerRecord }
}

/** The rule family of each game mode: Crazy Cricket is Cricket dealt differently. */
export const FAMILY = { x01: 'x01', cricket: 'cricket', crazy: 'cricket', clock: 'clock', killer: 'killer' } as const

export type GameModeId = keyof typeof FAMILY
export type FamilyId = keyof Families
export type FamilyOf<K extends GameModeId> = (typeof FAMILY)[K]
type TypesOf<K extends GameModeId> = Families[FamilyOf<K>]
export type ConfigOf<K extends GameModeId> = TypesOf<K>['config']
export type StateOf<K extends GameModeId> = TypesOf<K>['state']
export type OptionsOf<K extends GameModeId> = TypesOf<K>['options']
export type StatsOf<K extends GameModeId> = TypesOf<K>['stats']
export type RecordOf<K extends GameModeId> = TypesOf<K>['record']

/**
 * Who plays for each side, as indexes into the player names, in throwing
 * order. A side is a single player, or a team sharing one score.
 */
export type Sides = number[][]

/**
 * Everything needed to play a match: the game mode, its config and the player
 * names. With `teams`, each team is one side of the match (2 to 4 sides).
 */
export interface Setup<K extends GameModeId> {
  mode: K
  config: ConfigOf<K>
  names: string[]
  teams?: Sides
}

/** A setup of any game mode, its config matching its mode. */
export type MatchSetup = { [K in GameModeId]: Setup<K> }[GameModeId]

/** A source of numbers in [0, 1), like `Math.random`. Injected so dealing can be tested. */
export type Random = () => number

/** One dart of the log, with who threw it and the match state around it. */
export interface Step<State> {
  dart: Dart
  side: number
  /** The player who threw it (a team member in team play). */
  player: number
  before: State
  after: State
  events: DomainEvent[]
}

/** What a mode module needs to call the last dart. */
export interface CallContext<K extends GameModeId> {
  last: Step<StateOf<K>>
  /** The darts of the visit the last dart belongs to. */
  visit: readonly Step<StateOf<K>>[]
  config: ConfigOf<K>
  /** Display name of each side. */
  sideNames: readonly string[]
  names: readonly string[]
  /** The player who throws next. */
  nextThrower: number
}

/** What the application knows about one game mode, beyond its rules. */
export interface ModeModule<K extends GameModeId> {
  id: K
  family: FamilyOf<K>
  rules: GameMode<ConfigOf<K>, StateOf<K>>
  /** Fewest sides the mode can be played with. */
  minSides: number
  /** The config for this many sides, without a round limit. Only Crazy Cricket uses `random`. */
  deal(options: OptionsOf<K>, sides: number, random: Random): ConfigOf<K>
  /** The config of a rematch, without a round limit; the same config when missing. */
  redeal?(config: ConfigOf<K>, random: Random): ConfigOf<K>
  /** Each player's stats, by player index. Steps come in log order. */
  stats(steps: readonly Step<StateOf<K>>[], setup: Setup<K>): StatsOf<K>[]
  /** What to announce after the last dart. Missing: only the winner. Round limit and sudden death are called for every mode. */
  calls?(context: CallContext<K>): Call[]
  /** How a player's stats add up across the match history. */
  history: { empty: RecordOf<K>; add(record: RecordOf<K>, stats: StatsOf<K>): RecordOf<K> }
}
