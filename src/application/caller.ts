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
  /** Killer: a side drew its number, became a killer, or is out. */
  | { type: 'drawn'; player: string; number: number }
  | { type: 'killer'; player: string }
  | { type: 'out'; player: string }
  /** The round limit is reached; `player` leads and takes the match (an X01 leg). */
  | { type: 'roundLimit'; player: string }
  | { type: 'suddenDeath' }

/** The darts of the visit that the last step belongs to. */
function lastVisit(log: Step[]): Step[] {
  let start = log.length - 1
  while (start > 0 && log[start]!.before.turnDarts.length > 0) start--
  return log.slice(start)
}

/** Killer calls every draw, arming and knockout as it happens, then the winner. */
function killerCalls(setup: MatchSetup, last: Step): Call[] {
  const names = sideNames(setup)
  return last.events.flatMap((e): Call[] => {
    switch (e.type) {
      case 'NumberDrawn': return [{ type: 'drawn', player: names[e.player]!, number: e.number }]
      case 'KillerArmed': return [{ type: 'killer', player: names[e.player]! }]
      case 'PlayerEliminated': return [{ type: 'out', player: names[e.player]! }]
      case 'MatchWon': return [{ type: 'winner', winner: names[e.player]! }]
      default: return []
    }
  })
}

/** What to announce after the last dart of the log; nothing in the middle of an X01 visit. */
export function calls(setup: MatchSetup, darts: readonly Dart[]): Call[] {
  const { steps: log, nextThrower } = steps(setup, darts)
  const last = log.at(-1)
  if (!last) return []
  const limit = last.events.find((e) => e.type === 'RoundLimitReached')
  if (limit) {
    const leader: Call = { type: 'roundLimit', player: sideNames(setup)[limit.player]! }
    return last.after.status === 'finished' ? [leader, { type: 'winner', winner: sideNames(setup)[limit.player]! }] : [leader]
  }
  const said = modeCalls(setup, log, last, nextThrower)
  return last.events.some((e) => e.type === 'SuddenDeath') ? [...said, { type: 'suddenDeath' }] : said
}

function modeCalls(setup: MatchSetup, log: Step[], last: Step, nextThrower: number): Call[] {
  const has = (type: string) => last.events.some((e) => e.type === type)
  const winner = last.after.winner === null ? '' : sideNames(setup)[last.after.winner]!

  if (setup.mode === 'killer') return killerCalls(setup, last)
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

/** How a caller delivers a call: roaring for a maximum or a win, flat for a poor visit. */
export type Mood = 'roar' | 'excited' | 'neutral' | 'flat'

/** A ton (100) or more lifts the caller; under 30 lets them down. */
export function mood(call: Call): Mood {
  switch (call.type) {
    case 'visit':
      if (call.score === 180) return 'roar'
      if (call.score >= 100) return 'excited'
      return call.score < 30 ? 'flat' : 'neutral'
    case 'gameShot':
    case 'matchShot':
    case 'winner':
      return 'roar'
    case 'noScore':
    case 'bust':
      return 'flat'
    case 'killer':
    case 'out':
    case 'roundLimit':
    case 'suddenDeath':
      return 'excited'
    case 'require':
    case 'drawn':
      return 'neutral'
  }
}
