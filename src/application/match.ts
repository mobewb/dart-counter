import { roundOf, toResult, type Dart, type DomainEvent, type PlayerResult, type Tally } from '../domain'
import type { Call } from './caller'
import { sideNames as namesOfSides, sidesOf } from './match-setup'
import { modules, type GameModeId, type ModeModule, type Setup, type StateOf, type StatsOf, type Step } from './modes'

/** Where a match with a round limit stands; null without a limit or once finished. */
export interface Round {
  /** The round of the side to throw, from 1. */
  current: number
  max: number
  /** Tied sides are playing extra rounds. */
  suddenDeath: boolean
}

/** A match as of its dart log. Everything in it is rebuilt from the setup and the log (ADR-001). */
export interface Match<K extends GameModeId = GameModeId> {
  setup: Setup<K>
  darts: readonly Dart[]
  state: StateOf<K>
  /** Events of the last dart. */
  events: DomainEvent[]
  /** The player who throws next (a team member in team play). */
  thrower: number
  /** Display name of each side: a player, or a team like "Ann & Cid". */
  sideNames: string[]
  /** Results per side. */
  results: PlayerResult[]
  /** Each player's own results, by player index; differs from `results` in team play. */
  players: PlayerResult[]
  round: Round | null
  /** Each player's stats, by player index. */
  stats: StatsOf<K>[]
  /** What a caller announces after the last dart. */
  calls: Call[]
}

/** The steps of the visit that the last step belongs to. */
function lastVisit<State extends { turnDarts: Dart[] }>(steps: readonly Step<State>[]): Step<State>[] {
  let start = steps.length - 1
  while (start > 0 && steps[start]!.before.turnDarts.length > 0) start--
  return steps.slice(start)
}

function callsOf<K extends GameModeId>(module: ModeModule<K>, setup: Setup<K>, steps: readonly Step<StateOf<K>>[], sideNames: string[], nextThrower: number): Call[] {
  const last = steps.at(-1)
  if (!last) return []
  const limit = last.events.find((e) => e.type === 'RoundLimitReached')
  if (limit) {
    const leader = sideNames[limit.player]!
    return last.after.status === 'finished' ? [{ type: 'roundLimit', player: leader }, { type: 'winner', winner: leader }] : [{ type: 'roundLimit', player: leader }]
  }
  const said: Call[] = module.calls
    ? module.calls({ last, visit: lastVisit(steps), config: setup.config, sideNames, names: setup.names, nextThrower })
    : last.events.some((e) => e.type === 'MatchWon') ? [{ type: 'winner', winner: sideNames[last.after.winner!]! }] : []
  return last.events.some((e) => e.type === 'SuddenDeath') ? [...said, { type: 'suddenDeath' }] : said
}

/**
 * Replays the dart log once. Members of a side take turns: every completed
 * turn of a side passes to its next member, across legs too (ADR-005), and
 * each dart's change to its side's tally is credited to its thrower.
 * Throws if a dart is invalid or thrown after the match is over.
 */
export function openMatch<K extends GameModeId>(setup: Setup<K>, darts: readonly Dart[] = []): Match<K> {
  const module = modules[setup.mode]
  const { rules } = module
  const sides = sidesOf(setup)
  const sideNames = namesOfSides(setup)
  const turns = sides.map(() => 0)
  const throwerOf = (side: number) => sides[side]![turns[side]! % sides[side]!.length]!
  const tallies: Tally[] = setup.names.map(() => ({ points: 0, dartsThrown: 0 }))

  const steps: Step<StateOf<K>>[] = []
  let state = rules.newMatch(setup.config)
  let events: DomainEvent[] = []
  for (const dart of darts) {
    const side = state.currentPlayer
    const player = throwerOf(side)
    const move = rules.applyDart(state, dart)
    steps.push({ dart, side, player, before: state, after: move.state, events: move.events })
    const was = rules.tally(state)[side]!
    const now = rules.tally(move.state)[side]!
    tallies[player]!.points += now.points - was.points
    tallies[player]!.dartsThrown += now.dartsThrown - was.dartsThrown
    for (const event of move.events) if (event.type === 'TurnEnded') turns[event.player]!++
    state = move.state
    events = move.events
  }

  const thrower = throwerOf(state.currentPlayer)
  const max = setup.config.maxRounds ?? 0
  const round = max > 0 && state.status !== 'finished'
    ? { current: Math.min(roundOf(state.rounds, state.currentPlayer), max), max, suddenDeath: state.rounds.contenders !== null }
    : null

  return {
    setup,
    darts,
    state,
    events,
    thrower,
    sideNames,
    results: rules.tally(state).map((tally) => toResult(rules, tally)),
    players: tallies.map((tally) => toResult(rules, tally)),
    round,
    stats: module.stats(steps, setup),
    calls: callsOf(module, setup, steps, sideNames, thrower),
  }
}

/** Adds a dart to the log. A dart thrown after the match is over is ignored; an invalid one throws. */
export function throwDart<K extends GameModeId>(match: Match<K>, dart: Dart): Match<K> {
  if (match.state.status === 'finished') return match
  return openMatch(match.setup, [...match.darts, dart])
}

/** Removes the last dart, even after the match is won. */
export function undoDart<K extends GameModeId>(match: Match<K>): Match<K> {
  if (match.darts.length === 0) return match
  return openMatch(match.setup, match.darts.slice(0, -1))
}
