import { isValidDart, type Dart, type DomainEvent, type Multiplier } from '../domain'
import type { Match } from './match'
import { modules, type GameModeId } from './modes'

const MULTIPLIERS: Multiplier[] = [1, 2, 3]
const MISS: Dart = { segment: 0, multiplier: 1 }
const SEGMENTS =[...Array.from({ length: 20 }, (_, i) => i + 1), 25]

/** Every dart on the board, misses aside. */
const BOARD: Dart[] = SEGMENTS.flatMap((segment) => MULTIPLIERS.map((multiplier) => ({ segment, multiplier })))
  .filter(isValidDart)

/** The darts that would win the leg (X01) or the match for the side to throw, if hit now. */
export function winningDarts<K extends GameModeId>(match: Match<K>): Dart[] {
  const { state } = match
  if (state.status === 'finished') return []
  const { rules } = modules[match.setup.mode]
  const side = state.currentPlayer
  const won = (events: DomainEvent[]) => events.some((e) => (e.type === 'LegWon' || e.type === 'MatchWon') && e.player === side)
  const wins = (dart: Dart) => won(rules.applyDart(state, dart).events)
  // A side that wins by missing out its turn (a lead at the round limit) wins
  // whatever it throws, busts included: the win isn't down to any one dart.
  let after = state
  for (let left = 3 - state.turnDarts.length; left > 0; left--) {
    const move = rules.applyDart(after, MISS)
    if (won(move.events)) return []
    if (move.state.currentPlayer !== side || move.state.status === 'finished') break
    after = move.state
  }
  return BOARD.filter(wins)
}
