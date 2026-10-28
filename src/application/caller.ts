import { x01, type Dart } from '../domain'
import type { MatchSetup } from './match-setup'
import { sideNames, steps, type Step } from './sides'

/** What a darts caller announces after a dart. The UI turns calls into words. */
export type Call =
  | { type: 'visit'; score: number }
  | { type: 'noScore' }
  | { type: 'bust' }
  | { type: 'gameShot' }
  | { type: 'matchShot'; winner: string }
  | { type: 'winner'; winner: string }
  /** X01: the next thrower is on a finish. */
  | { type: 'require'; player: string; remaining: number }

/** The darts of the visit that the last step belongs to. */
function lastVisit(log: Step[]): Step[] {
  let start = log.length - 1
  while (start > 0 && log[start]!.before.turnDarts.length > 0) start--
  return log.slice(start)
}

/** What to announce after the last dart of the log; nothing in the middle of a visit. */
export function calls(setup: MatchSetup, darts: readonly Dart[]): Call[] {
  const { steps: log, nextThrower } = steps(setup, darts)
  const last = log.at(-1)
  if (!last) return []
  const has = (type: string) => last.events.some((e) => e.type === type)
  const winner = last.after.winner === null ? '' : sideNames(setup)[last.after.winner]!

  if (setup.mode !== 'x01') return has('MatchWon') ? [{ type: 'winner', winner }] : []

  const visitOver = has('TurnEnded') || has('LegWon') || has('MatchWon')
  if (!visitOver) return []

  const result: Call[] = []
  if (has('MatchWon')) return [{ type: 'matchShot', winner }]
  if (has('LegWon')) result.push({ type: 'gameShot' })
  else if (has('Bust')) result.push({ type: 'bust' })
  else {
    const visit = lastVisit(log)
    const side = last.side
    const score = (last.after as x01.X01Match).players[side]!.pointsScored - (visit[0]!.before as x01.X01Match).players[side]!.pointsScored
    result.push(score === 0 ? { type: 'noScore' } : { type: 'visit', score })
  }

  const next = last.after as x01.X01Match
  const up = next.players[next.currentPlayer]!
  if (up.in && x01.checkout(up.remaining, setup.config.doubleOut) !== null) {
    result.push({ type: 'require', player: setup.names[nextThrower]!, remaining: up.remaining })
  }
  return result
}
