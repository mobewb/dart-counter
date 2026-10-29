import { modules, toMatchSetup, type GameModeId, type MatchSetup, type OptionsOf, type Random, type Setup, type Sides } from './modes'

export const MAX_TEAMS = 4

/**
 * Groups players by team number (one number per player). Teams come in
 * number order, members in the players' order; unused numbers are skipped.
 */
export function teamsFrom(assignment: readonly number[]): Sides {
  const numbers = [...new Set(assignment)].sort((a, b) => a - b)
  return numbers.map((n) => assignment.flatMap((team, player) => (team === n ? [player] : [])))
}

/** Who plays: the player names, and the teams in team play. */
type Players = Pick<MatchSetup, 'names' | 'teams'>

export function sidesOf(setup: Players): Sides {
  return setup.teams ?? setup.names.map((_, i) => [i])
}

/** A player's name, or the team members' names, e.g. "Ann & Cid". */
export function sideNames(setup: Players): string[] {
  return sidesOf(setup).map((members) => members.map((i) => setup.names[i]).join(' & '))
}

/**
 * What the player picks before a match. `teams` gives each player a team
 * number for team play; without it, everyone plays for themselves.
 * `maxRounds` cuts the match (an X01 leg) short; 0 means no limit.
 */
interface Request<K extends GameModeId> {
  mode: K
  options: OptionsOf<K>
  names: string[]
  teams?: number[]
  maxRounds?: number
}

export type MatchRequest = { [K in GameModeId]: Request<K> }[GameModeId]

/** The round limit to add to a config, if one was picked. */
const limitOf = (maxRounds: number | undefined) => (maxRounds === undefined ? {} : { maxRounds })

function setupFor<K extends GameModeId>(request: Request<K>, random: Random): Setup<K> {
  const { mode, names } = request
  const module = modules[mode]
  const teams = request.teams && teamsFrom(request.teams)
  if (teams && (teams.length < 2 || teams.length > MAX_TEAMS)) throw new Error(`Team play needs 2 to ${MAX_TEAMS} teams`)
  const sides = teams?.length ?? names.length
  if (sides < module.minSides) throw new Error(`${mode} needs at least ${module.minSides} sides`)
  const config = { ...module.deal(request.options, sides, random), ...limitOf(request.maxRounds) }
  return { mode, config, names, ...(teams ? { teams } : {}) }
}

export function startMatch(request: MatchRequest, random: Random = Math.random): MatchSetup {
  return toMatchSetup(setupFor(request, random))
}

function redealt<K extends GameModeId>(setup: Setup<K>, random: Random): Setup<K> {
  const { redeal } = modules[setup.mode]
  if (!redeal) return setup
  return { ...setup, config: { ...redeal(setup.config, random), ...limitOf(setup.config.maxRounds) } }
}

/** Same players and rules; Crazy Cricket deals a fresh set of numbers. */
export function rematch(setup: MatchSetup, random: Random = Math.random): MatchSetup {
  return toMatchSetup(redealt(setup, random))
}
