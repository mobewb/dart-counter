import type { DomainEvent, Move } from './events'
import type { GameMode, MatchCore } from './game-mode'

/** Config of any mode that can be cut short. */
export interface RoundLimitConfig {
  /** Rounds before the best-placed side wins; 0 or missing means no limit. */
  maxRounds?: number
}

/** Where a match stands against its round limit. */
export interface RoundCount {
  /** Turns each side has completed since the start (or, in X01, since the leg began). */
  turns: number[]
  /** Turns every side in play must complete before the next check. */
  target: number
  /** Sides tied at the limit, playing sudden death; null before. */
  contenders: number[] | null
}

export type Limited<State> = State & { rounds: RoundCount }

export interface RoundLimitRules<State> {
  /** How good a side's position is; higher wins, compared item by item. */
  standing(state: State, side: number): number[]
  /** Sides still in the game; the others are not waited for. All by default. */
  inPlay?(state: State, side: number): boolean
  /** Whether a turn played from this state counts toward the limit (not Killer's draw). */
  counts?(state: State): boolean
  /** What winning at the limit means; the match by default, a leg in X01. */
  award?(state: State, side: number): Move<State>
}

const compare = (a: number[], b: number[]) => {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const diff = (a[i] ?? 0) - (b[i] ?? 0)
    if (diff !== 0) return diff
  }
  return 0
}

const winMatch = <State extends MatchCore>(state: State, side: number): Move<State> => ({
  state: { ...state, status: 'finished', winner: side, turnDarts: [] },
  events: [{ type: 'MatchWon', player: side }],
})

/** The round of the side to throw, from 1. */
export const roundOf = (rounds: RoundCount, side: number) => rounds.turns[side]! + 1

/**
 * Adds a round limit to a mode. Once every side in play has taken `maxRounds`
 * turns, the best-placed side wins. Tied sides play sudden death: one more
 * round at a time (everyone throws, only they can win) until one leads alone.
 * A leg won (X01) starts the count again.
 */
export function withRoundLimit<Config extends RoundLimitConfig & { playerCount: number }, State extends MatchCore>(
  mode: GameMode<Config, State>,
  rules: RoundLimitRules<State>,
): GameMode<Config, Limited<State>> {
  const { inPlay = () => true, counts = () => true, award = winMatch } = rules
  const fresh = (config: Config): RoundCount => ({
    turns: Array.from({ length: config.playerCount }, () => 0),
    target: config.maxRounds ?? 0,
    contenders: null,
  })

  return {
    ...mode,
    newMatch: (config) => ({ ...mode.newMatch(config), rounds: fresh(config) }),
    applyDart(limited, dart) {
      const { rounds, ...previous } = limited
      const before = previous as unknown as State
      const move = mode.applyDart(before, dart)
      const config = (before as unknown as { config: Config }).config
      if (!config.maxRounds) return { state: { ...move.state, rounds }, events: move.events }
      if (move.events.some((e) => e.type === 'LegWon')) return { state: { ...move.state, rounds: fresh(config) }, events: move.events }

      const ended = move.events.find((e) => e.type === 'TurnEnded')
      if (!ended || move.state.status === 'finished' || !counts(before)) return { state: { ...move.state, rounds }, events: move.events }

      const turns = rounds.turns.map((n, side) => (side === ended.player ? n + 1 : n))
      const state = move.state
      const sides = turns.flatMap((_, side) => (inPlay(state, side) ? [side] : []))
      if (sides.some((side) => turns[side]! < rounds.target)) return { state: { ...state, rounds: { ...rounds, turns } }, events: move.events }

      // The round is over: rank the sides that can still win.
      const still = rounds.contenders?.filter((side) => inPlay(state, side)) ?? []
      // Killer: if every contender was knocked out, the sides left compete.
      const candidates = still.length > 0 ? still : sides
      const best = candidates.reduce((a, b) => (compare(rules.standing(state, b), rules.standing(state, a)) > 0 ? b : a))
      const leaders = candidates.filter((side) => compare(rules.standing(state, side), rules.standing(state, best)) === 0)
      if (leaders.length > 1) {
        const suddenDeath: DomainEvent = { type: 'SuddenDeath', players: leaders }
        return { state: { ...state, rounds: { turns, target: rounds.target + 1, contenders: leaders } }, events: [...move.events, suddenDeath] }
      }
      const reached: DomainEvent = { type: 'RoundLimitReached', player: best }
      const won = award(state, best)
      // A leg won at the limit starts a fresh count; a match won keeps it for display.
      const next = won.state.status === 'finished' ? { turns, target: rounds.target, contenders: null } : fresh(config)
      const events = move.events.filter((e) => e.type !== 'TurnEnded' || won.state.status !== 'finished')
      return { state: { ...won.state, rounds: next }, events: [...events, reached, ...won.events] }
    },
  }
}
