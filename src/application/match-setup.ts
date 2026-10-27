import type { cricket, x01 } from '../domain'
import { cricketConfig, type Random } from './cricket-config'

export type GameModeId = 'x01' | 'cricket' | 'crazy'

/** Everything needed to play a match: the game mode, its config and the player names. */
export type MatchSetup =
  | { mode: 'x01'; config: x01.X01Config; names: string[] }
  | { mode: 'cricket' | 'crazy'; config: cricket.CricketConfig; names: string[] }

/** What the player picks before a match; the player count comes from the names. */
export type MatchRequest =
  | { mode: 'x01'; names: string[]; rules: Omit<x01.X01Config, 'playerCount'> }
  | { mode: 'cricket' | 'crazy'; names: string[] }

export function startMatch(request: MatchRequest, random: Random = Math.random): MatchSetup {
  const { names } = request
  if (request.mode === 'x01') {
    return { mode: 'x01', config: { ...request.rules, playerCount: names.length }, names }
  }
  return { mode: request.mode, config: cricketConfig(request.mode, names.length, random), names }
}

/** Same players and rules; crazy cricket deals a fresh set of numbers. */
export function rematch(setup: MatchSetup, random: Random = Math.random): MatchSetup {
  if (setup.mode !== 'crazy') return setup
  return { ...setup, config: cricketConfig('crazy', setup.config.playerCount, random) }
}
