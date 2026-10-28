import type { clock, cricket, Dart, x01 } from '../domain'
import type { MatchSetup } from './match-setup'
import { steps, type Step } from './sides'

export interface X01Stats {
  kind: 'x01'
  dartsThrown: number
  /** Points scored; busted visits score 0. */
  points: number
  /** Points per 3 darts; busted visits count their darts but no points. */
  average: number
  /** Average of each leg's first 3 visits (9 darts). */
  firstNine: number
  /** Best visit score. */
  highestVisit: number
  /** Visits of 100–139, 140–179 and 180. */
  tons: number
  tonForties: number
  oneEighties: number
  /** Darts thrown at a finishing double, and checkouts hit. Null without double-out. */
  checkoutDarts: number | null
  checkouts: number
  /** Score left before the best checkout visit. */
  highestCheckout: number
  /** Fewest darts the player's side needed in a leg this player checked out. */
  bestLeg: number | null
}

export interface CricketStats {
  kind: 'cricket'
  dartsThrown: number
  points: number
  /** Marks hit on targets, scoring marks included. */
  marks: number
  /** Marks per round of 3 darts. */
  marksPerRound: number
}

export interface ClockStats {
  kind: 'clock'
  dartsThrown: number
  /** Targets hit in order. */
  hits: number
  /** Share of darts that hit the target, 0 to 1. */
  hitRate: number
}

export type PlayerStats = X01Stats | CricketStats | ClockStats

const perThree = (total: number, darts: number) => (darts === 0 ? 0 : (total / darts) * 3)

/** A score that one double can finish. */
const finishable = (remaining: number) => remaining === 50 || (remaining >= 2 && remaining <= 40 && remaining % 2 === 0)

function x01Stats(setup: Extract<MatchSetup, { mode: 'x01' }>, log: Step[]): X01Stats[] {
  const stats = setup.names.map(() => ({
    dartsThrown: 0, points: 0, firstNinePoints: 0, firstNineDarts: 0, highestVisit: 0,
    tons: 0, tonForties: 0, oneEighties: 0, checkoutDarts: 0, checkouts: 0, highestCheckout: 0, bestLeg: null as number | null,
  }))
  const visitsInLeg = setup.names.map(() => 0)
  const legDarts = Array.from({ length: setup.config.playerCount }, () => 0)
  let visit = { startPoints: 0, darts: 0 }

  for (const { side, player, before, after, events } of log) {
    const was = (before as x01.X01Match).players[side]!
    const now = (after as x01.X01Match).players[side]!
    const me = stats[player]!
    if (before.turnDarts.length === 0) visit = { startPoints: was.pointsScored, darts: 0 }
    visit.darts++
    me.dartsThrown++
    legDarts[side]!++
    if (setup.config.doubleOut && was.in && finishable(was.remaining)) me.checkoutDarts++

    const legWon = events.some((e) => e.type === 'LegWon')
    const visitOver = legWon || events.some((e) => e.type === 'TurnEnded' || e.type === 'MatchWon')
    if (!visitOver) continue

    // A visit is a run of one side's darts; pointsScored is net of busts, so a busted visit scores 0.
    const scored = now.pointsScored - visit.startPoints
    me.points += scored
    me.highestVisit = Math.max(me.highestVisit, scored)
    if (scored === 180) me.oneEighties++
    else if (scored >= 140) me.tonForties++
    else if (scored >= 100) me.tons++
    if (visitsInLeg[player]! < 3) {
      me.firstNinePoints += scored
      me.firstNineDarts += visit.darts
    }
    visitsInLeg[player]!++

    if (legWon) {
      me.checkouts++
      me.highestCheckout = Math.max(me.highestCheckout, (before as x01.X01Match).turnStart.remaining)
      me.bestLeg = Math.min(me.bestLeg ?? Infinity, legDarts[side]!)
      visitsInLeg.fill(0)
      legDarts.fill(0)
    }
  }

  return stats.map((s) => ({
    kind: 'x01',
    dartsThrown: s.dartsThrown,
    points: s.points,
    average: perThree(s.points, s.dartsThrown),
    firstNine: perThree(s.firstNinePoints, s.firstNineDarts),
    highestVisit: s.highestVisit,
    tons: s.tons,
    tonForties: s.tonForties,
    oneEighties: s.oneEighties,
    checkoutDarts: setup.config.doubleOut ? s.checkoutDarts : null,
    checkouts: s.checkouts,
    highestCheckout: s.highestCheckout,
    bestLeg: s.bestLeg,
  }))
}

function cricketStats(setup: MatchSetup, log: Step[]): CricketStats[] {
  const stats = setup.names.map(() => ({ dartsThrown: 0, points: 0, marks: 0 }))
  for (const { dart, side, player, before, after } of log) {
    const me = stats[player]!
    const was = before as cricket.CricketMatch
    me.dartsThrown++
    if (dart.segment !== 0 && was.targets.includes(dart.segment)) me.marks += dart.multiplier
    me.points += (after as cricket.CricketMatch).players[side]!.points - was.players[side]!.points
  }
  return stats.map((s) => ({ kind: 'cricket', ...s, marksPerRound: perThree(s.marks, s.dartsThrown) }))
}

function clockStats(setup: MatchSetup, log: Step[]): ClockStats[] {
  const stats = setup.names.map(() => ({ dartsThrown: 0, hits: 0 }))
  for (const { side, player, before, after } of log) {
    stats[player]!.dartsThrown++
    stats[player]!.hits += (after as clock.ClockMatch).players[side]!.progress - (before as clock.ClockMatch).players[side]!.progress
  }
  return stats.map((s) => ({ kind: 'clock', ...s, hitRate: s.dartsThrown === 0 ? 0 : s.hits / s.dartsThrown }))
}

/** Each player's stats for the match so far, by player index. */
export function matchStats(setup: MatchSetup, darts: readonly Dart[]): PlayerStats[] {
  const log = steps(setup, darts).steps
  if (setup.mode === 'x01') return x01Stats(setup, log)
  return setup.mode === 'clock' ? clockStats(setup, log) : cricketStats(setup, log)
}
