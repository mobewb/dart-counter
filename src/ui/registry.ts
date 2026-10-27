import type { GameModeId, MatchSetup } from '../application/match-setup'
import type { MatchCore } from '../domain'
import { crazyCricketView, cricketView } from './modes/cricket/view'
import type { ModeView } from './modes/types'
import { x01View } from './modes/x01/view'

/** One entry per game mode, in the order the setup screen lists them. */
export const registry = {
  x01: x01View,
  cricket: cricketView,
  crazy: crazyCricketView,
} satisfies { [Id in GameModeId]: ModeView<Extract<MatchSetup, { mode: Id }>, MatchCore> }

export const gameModes = Object.keys(registry) as GameModeId[]

/**
 * The view for a setup's game mode. TypeScript cannot correlate `setup.mode`
 * with the registry entry, so this is the one place that widens the type.
 */
export function viewFor(setup: MatchSetup): ModeView<MatchSetup, MatchCore> {
  return registry[setup.mode] as unknown as ModeView<MatchSetup, MatchCore>
}
