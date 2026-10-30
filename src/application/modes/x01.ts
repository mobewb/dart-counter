import { x01 } from '../../domain'
import type { Call } from '../caller'
import type { ModeModule } from './types'

export interface X01Stats {
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

/** A player's X01 figures across the match history. */
export interface X01Record {
  matches: number
  dartsThrown: number
  points: number
  /** Points per 3 darts over every X01 match. */
  average: number
  highestVisit: number
  oneEighties: number
  checkouts: number
  /** Darts at a finishing double, in double-out matches. */
  checkoutDarts: number
  highestCheckout: number
  bestLeg: number | null
}

const perThree = (total: number, darts: number) => (darts === 0 ? 0 : (total / darts) * 3)

/** A score that one double can finish. */
const finishable = (remaining: number) => remaining === 50 || (remaining >= 2 && remaining <= 40 && remaining % 2 === 0)

export const x01Module: ModeModule<'x01'> = {
  id: 'x01',
  family: 'x01',
  rules: x01.mode,
  minSides: 1,
  deal: (options, sides) => ({ ...options, playerCount: sides }),

  stats(log, setup) {
    const stats = setup.names.map(() => ({
      dartsThrown: 0, points: 0, firstNinePoints: 0, firstNineDarts: 0, highestVisit: 0,
      tons: 0, tonForties: 0, oneEighties: 0, checkoutDarts: 0, checkouts: 0, highestCheckout: 0, bestLeg: null as number | null,
    }))
    const visitsInLeg = setup.names.map(() => 0)
    const legDarts = Array.from({ length: setup.config.playerCount }, () => 0)
    let visit = { startPoints: 0, darts: 0 }

    for (const { side, player, before, after, events } of log) {
      const was = before.players[side]!
      const now = after.players[side]!
      const me = stats[player]!
      if (before.turnDarts.length === 0) visit = { startPoints: was.pointsScored, darts: 0 }
      visit.darts++
      me.dartsThrown++
      legDarts[side]!++
      if (setup.config.doubleOut && was.in && finishable(was.remaining)) me.checkoutDarts++

      const legWon = events.some((e) => e.type === 'LegWon')
      // A leg won at the round limit ends the visit, but nobody checked out.
      const checkedOut = legWon && !events.some((e) => e.type === 'RoundLimitReached')
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

      if (checkedOut) {
        me.checkouts++
        me.highestCheckout = Math.max(me.highestCheckout, before.turnStart.remaining)
        me.bestLeg = Math.min(me.bestLeg ?? Infinity, legDarts[side]!)
      }
      if (legWon) {
        visitsInLeg.fill(0)
        legDarts.fill(0)
      }
    }

    return stats.map((s) => ({
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
  },

  /** A caller speaks once a visit is over: its score, a bust or a shot, then what the next thrower requires. */
  calls({ last, visit, config, sideNames, names, nextThrower }) {
    const has = (type: string) => last.events.some((e) => e.type === type)
    if (!(has('TurnEnded') || has('LegWon') || has('MatchWon'))) return []
    if (has('MatchWon')) return [{ type: 'matchShot', winner: sideNames[last.after.winner!]! }]

    const result: Call[] = []
    if (has('LegWon')) result.push({ type: 'gameShot' })
    else if (has('Bust')) result.push({ type: 'bust' })
    else {
      const score = last.after.players[last.side]!.pointsScored - visit[0]!.before.players[last.side]!.pointsScored
      result.push(score === 0 ? { type: 'noScore' } : { type: 'visit', score })
    }

    const up = last.after.players[last.after.currentPlayer]!
    if (up.in && x01.checkout(up.remaining, config.doubleOut) !== null) {
      result.push({ type: 'require', player: names[nextThrower]!, remaining: up.remaining })
    }
    return result
  },

  history: {
    empty: { matches: 0, dartsThrown: 0, points: 0, average: 0, highestVisit: 0, oneEighties: 0, checkouts: 0, checkoutDarts: 0, highestCheckout: 0, bestLeg: null },
    add(record, stats) {
      const dartsThrown = record.dartsThrown + stats.dartsThrown
      const points = record.points + stats.points
      return {
        matches: record.matches + 1,
        dartsThrown,
        points,
        average: perThree(points, dartsThrown),
        highestVisit: Math.max(record.highestVisit, stats.highestVisit),
        oneEighties: record.oneEighties + stats.oneEighties,
        checkouts: record.checkouts + stats.checkouts,
        checkoutDarts: record.checkoutDarts + (stats.checkoutDarts ?? 0),
        highestCheckout: Math.max(record.highestCheckout, stats.highestCheckout),
        bestLeg: stats.bestLeg === null ? record.bestLeg : Math.min(record.bestLeg ?? Infinity, stats.bestLeg),
      }
    },
  },
}
