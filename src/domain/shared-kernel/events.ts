import type { Dart } from './dart'

/** What a dart made happen. The UI reacts to the events of the last dart. */
export type DomainEvent =
  /** The next player is up (not emitted when the match ends). */
  | { type: 'TurnEnded'; player: number }
  | { type: 'Bust'; player: number }
  | { type: 'LegWon'; player: number }
  | { type: 'SetWon'; player: number }
  | { type: 'MatchWon'; player: number }
  /** Crazy cricket: indexes of the targets that were replaced. */
  | { type: 'TargetsRerolled'; replaced: number[] }
  /** The round limit was reached and this side was best placed: it wins the match (a leg in X01). */
  | { type: 'RoundLimitReached'; player: number }
  /** Sides tied at the round limit; they play one more round. */
  | { type: 'SuddenDeath'; players: number[] }
  /** Killer: a side drew its number. */
  | { type: 'NumberDrawn'; player: number; number: number }
  /** Killer: a side hit its own double and can now take lives. */
  | { type: 'KillerArmed'; player: number }
  | { type: 'LifeLost'; player: number }
  /** Killer: a side lost its last life. */
  | { type: 'PlayerEliminated'; player: number }

export interface Move<State> {
  state: State
  events: DomainEvent[]
}

/** Replays a dart log from `start`; the events are those of the last dart only. */
export function replayLog<State>(
  start: State,
  apply: (state: State, dart: Dart) => Move<State>,
  darts: readonly Dart[],
): Move<State> {
  return darts.reduce<Move<State>>((move, dart) => apply(move.state, dart), { state: start, events: [] })
}
