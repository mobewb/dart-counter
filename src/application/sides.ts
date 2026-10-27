import { toResult, type Dart, type PlayerResult, type Tally } from '../domain'
import { rulesFor, type MatchSetup, type Sides } from './match-setup'

export function sidesOf(setup: MatchSetup): Sides {
  return setup.teams ?? setup.names.map((_, i) => [i])
}

/** A player's name, or the team members' names, e.g. "Ann & Cid". */
export function sideNames(setup: MatchSetup): string[] {
  return sidesOf(setup).map((members) => members.map((i) => setup.names[i]).join(' & '))
}

export interface TeamPlay {
  /** The player who throws next. */
  thrower: number
  /** Each player's own results, by player index. */
  players: PlayerResult[]
}

/**
 * Replays the dart log to tell who threw each dart. Members of a side take
 * turns: every completed turn of a side passes to its next member, across
 * legs too. Each dart's change to its side's tally is credited to its thrower.
 */
export function teamPlay(setup: MatchSetup, darts: readonly Dart[]): TeamPlay {
  const rules = rulesFor(setup.mode)
  const sides = sidesOf(setup)
  const turns = sides.map(() => 0)
  const throwerOf = (side: number) => sides[side]![turns[side]! % sides[side]!.length]!
  const tallies: Tally[] = setup.names.map(() => ({ points: 0, dartsThrown: 0 }))

  let state = rules.newMatch(setup.config)
  for (const dart of darts) {
    const side = state.currentPlayer
    const mine = tallies[throwerOf(side)]!
    const before = rules.tally(state)[side]!
    const move = rules.applyDart(state, dart)
    const after = rules.tally(move.state)[side]!
    mine.points += after.points - before.points
    mine.dartsThrown += after.dartsThrown - before.dartsThrown
    for (const event of move.events) if (event.type === 'TurnEnded') turns[event.player]!++
    state = move.state
  }
  return { thrower: throwerOf(state.currentPlayer), players: tallies.map((t) => toResult(rules, t)) }
}
