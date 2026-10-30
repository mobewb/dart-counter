import type { ReactNode } from 'react'
import type { GameModeId, Setup, StateOf, StatsOf } from '../../application/modes'
import type { DomainEvent } from '../../domain'
import type { Key } from '../i18n'

export interface ViewProps<K extends GameModeId> {
  setup: Setup<K>
  /** Display name of each side: a player, or a team like "Ann & Cid". */
  sides: string[]
  state: StateOf<K>
  /** Events of the last dart. */
  events: DomainEvent[]
  dartCount: number
}

/** The mode-specific parts of the game screen. */
export interface View {
  /** Top bar, between Quit and Undo. */
  info: ReactNode
  /** Scoreboard, between the top bar and the turn. */
  board: ReactNode
  /** Chips next to the player to throw. */
  turnExtras?: ReactNode
  /** Below the dart slots. */
  afterTurn?: ReactNode
  /** Segments that count; others are faded on the board and pad. */
  targets?: number[]
  /** Numbers whose double takes a life, marked with a skull on the board and pad (Killer). */
  marked?: number[]
  /** Blocks input and undo, e.g. while the crazy cricket roulette spins. */
  locked?: boolean
}

/** Everything the UI needs to show one game mode; its rules are in the application's mode module. */
export interface ModeView<K extends GameModeId> {
  label: Key
  hint?: Key
  /** Keep the screen on during the match. */
  keepAwake?: boolean
  /** The headline stat of each player on the winner screen. */
  result: { label: Key; format: (value: number) => string }
  useView(props: ViewProps<K>): View
  /** A player's match stats as short chips for the winner screen. */
  details(stats: StatsOf<K>, t: (key: Key) => string): string[]
}
