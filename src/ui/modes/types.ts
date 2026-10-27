import type { ReactNode } from 'react'
import type { MatchSetup } from '../../application/match-setup'
import type { DomainEvent, GameMode, MatchCore } from '../../domain'
import type { Key } from '../i18n'

export interface ViewProps<Setup extends MatchSetup, State extends MatchCore> {
  setup: Setup
  /** Display name of each side: a player, or a team like "Ann & Cid". */
  sides: string[]
  state: State
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
  /** Blocks input and undo, e.g. while the crazy cricket roulette spins. */
  locked?: boolean
}

/** Everything the UI needs to play one game mode. */
export interface ModeView<Setup extends MatchSetup, State extends MatchCore> {
  rules: GameMode<Setup['config'], State>
  label: Key
  hint?: Key
  /** Keep the screen on during the match. */
  keepAwake?: boolean
  /** The headline stat of each player on the winner screen. */
  result: { label: Key; format: (value: number) => string }
  useView(props: ViewProps<Setup, State>): View
}
