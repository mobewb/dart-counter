import { toResult, type Dart, type DomainEvent, type MatchCore, type PlayerResult, type Tally } from '../domain'
import { rulesFor, type MatchSetup, type Sides } from './match-setup'

export function sidesOf(setup: MatchSetup): Sides {
  return setup.teams ?? setup.names.map((_, i) => [i])
}

/** A player's name, or the team members' names, e.g. "Ann & Cid". */
export function sideNames(setup: MatchSetup): string[] {
  return sidesOf(setup).map((members) => members.map((i) => setup.names[i]).join(' & '))
}

/** One dart of the log, with who threw it and the match state around it. */
export interface Step {
  dart: Dart
  side: number
  /** The player who threw it (a team member in team play). */
  player: number
  before: MatchCore
  after: MatchCore
  events: DomainEvent[]
}

/**
 * Replays the dart log to tell who threw each dart. Members of a side take
 * turns: every completed turn of a side passes to its next member, across
 * legs too.
 */
export function steps(setup: MatchSetup, darts: readonly Dart[]): { steps: Step[]; nextThrower: number } {
  const rules = rulesFor(setup.mode)
  const sides = sidesOf(setup)
  const turns = sides.map(() => 0)
  const throwerOf = (side: number) => sides[side]![turns[side]! % sides[side]!.length]!

  const result: Step[] = []
  let state = rules.newMatch(setup.config)
  for (const dart of darts) {
    const side = state.currentPlayer
    const move = rules.applyDart(state, dart)
    result.push({ dart, side, player: throwerOf(side), before: state, after: move.state, events: move.events })
    for (const event of move.events) if (event.type === 'TurnEnded') turns[event.player]!++
    state = move.state
  }
  return { steps: result, nextThrower: throwerOf(state.currentPlayer) }
}

export interface TeamPlay {
  /** The player who throws next. */
  thrower: number
  /** Each player's own results, by player index. */
  players: PlayerResult[]
}

/** Who throws next, and each player's results: each dart's change to its side's tally is credited to its thrower. */
export function teamPlay(setup: MatchSetup, darts: readonly Dart[]): TeamPlay {
  const rules = rulesFor(setup.mode)
  const tallies: Tally[] = setup.names.map(() => ({ points: 0, dartsThrown: 0 }))
  const replay = steps(setup, darts)
  for (const { side, player, before, after } of replay.steps) {
    const was = rules.tally(before)[side]!
    const now = rules.tally(after)[side]!
    tallies[player]!.points += now.points - was.points
    tallies[player]!.dartsThrown += now.dartsThrown - was.dartsThrown
  }
  return { thrower: replay.nextThrower, players: tallies.map((t) => toResult(rules, t)) }
}
