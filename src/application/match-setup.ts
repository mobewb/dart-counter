import { clock, cricket, x01, type GameMode, type MatchCore } from '../domain'
import { cricketConfig, type Random } from './cricket-config'

export type GameModeId = 'x01' | 'cricket' | 'crazy' | 'clock'

/**
 * Who plays for each side, as indexes into the player names, in throwing
 * order. A side is a single player, or a team sharing one score.
 */
export type Sides = number[][]

/**
 * Everything needed to play a match: the game mode, its config and the player
 * names. With `teams`, each team is one side of the match (2 to 4 sides).
 */
export type MatchSetup =
  | { mode: 'x01'; config: x01.X01Config; names: string[]; teams?: Sides }
  | { mode: 'cricket' | 'crazy'; config: cricket.CricketConfig; names: string[]; teams?: Sides }
  | { mode: 'clock'; config: clock.ClockConfig; names: string[]; teams?: Sides }

export const MAX_TEAMS = 4

/**
 * Groups players by team number (one number per player). Teams come in
 * number order, members in the players' order; unused numbers are skipped.
 */
export function teamsFrom(assignment: readonly number[]): Sides {
  const numbers = [...new Set(assignment)].sort((a, b) => a - b)
  return numbers.map((n) => assignment.flatMap((team, player) => (team === n ? [player] : [])))
}

/**
 * The rules of a game mode. TypeScript cannot correlate `mode` with its config,
 * so the result takes any config of a setup.
 */
export function rulesFor(mode: GameModeId): GameMode<MatchSetup['config'], MatchCore> {
  const rules = mode === 'x01' ? x01.mode : mode === 'clock' ? clock.mode : cricket.mode
  return rules as GameMode<MatchSetup['config'], MatchCore>
}

/**
 * What the player picks before a match. `teams` gives each player a team
 * number for team play; without it, everyone plays for themselves.
 */
export type MatchRequest = { names: string[]; teams?: number[] } & (
  | { mode: 'x01'; rules: Omit<x01.X01Config, 'playerCount'> }
  | { mode: 'cricket' | 'crazy' | 'clock' }
)

export function startMatch(request: MatchRequest, random: Random = Math.random): MatchSetup {
  const { names } = request
  const teams = request.teams && teamsFrom(request.teams)
  if (teams && (teams.length < 2 || teams.length > MAX_TEAMS)) throw new Error(`Team play needs 2 to ${MAX_TEAMS} teams`)
  const sideCount = teams?.length ?? names.length
  const withTeams = teams ? { teams } : {}
  if (request.mode === 'x01') {
    return { mode: 'x01', config: { ...request.rules, playerCount: sideCount }, names, ...withTeams }
  }
  if (request.mode === 'clock') {
    return { mode: 'clock', config: { playerCount: sideCount, sequence: clock.CLOCK_SEQUENCE }, names, ...withTeams }
  }
  return { mode: request.mode, config: cricketConfig(request.mode, sideCount, random), names, ...withTeams }
}

/** Same players and rules; crazy cricket deals a fresh set of numbers. */
export function rematch(setup: MatchSetup, random: Random = Math.random): MatchSetup {
  if (setup.mode !== 'crazy') return setup
  return { ...setup, config: cricketConfig('crazy', setup.config.playerCount, random) }
}
