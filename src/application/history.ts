import type { FinishedMatch, MatchRepository } from './match-repository'
import { matchStats } from './match-stats'
import { sidesOf } from './sides'

/** A player's record across the match history. Players are matched by name, ignoring case. */
export interface PlayerRecord {
  name: string
  matches: number
  wins: number
  /** Most recent match, as a timestamp. */
  lastPlayed: number
  x01: {
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
  cricket: {
    matches: number
    dartsThrown: number
    marks: number
    marksPerRound: number
  }
  clock: {
    matches: number
    dartsThrown: number
    hits: number
    /** Share of darts that hit the target, 0 to 1. */
    hitRate: number
  }
  killer: {
    matches: number
    dartsThrown: number
    livesTaken: number
    eliminations: number
  }
}

const key = (name: string) => name.trim().toLocaleLowerCase()

/** Names filled in for players left unnamed ("Player 2", "Joueur 3"): not a real person to track. */
const isPlaceholder = (name: string) => /^(player|joueur) \d+$/i.test(name.trim())
const perThree = (total: number, darts: number) => (darts === 0 ? 0 : (total / darts) * 3)

function emptyRecord(name: string): PlayerRecord {
  return {
    name,
    matches: 0,
    wins: 0,
    lastPlayed: 0,
    x01: { matches: 0, dartsThrown: 0, points: 0, average: 0, highestVisit: 0, oneEighties: 0, checkouts: 0, checkoutDarts: 0, highestCheckout: 0, bestLeg: null },
    cricket: { matches: 0, dartsThrown: 0, marks: 0, marksPerRound: 0 },
    clock: { matches: 0, dartsThrown: 0, hits: 0, hitRate: 0 },
    killer: { matches: 0, dartsThrown: 0, livesTaken: 0, eliminations: 0 },
  }
}

/**
 * Every named player's record, most matches first. Stats are recomputed from
 * each match's dart log; placeholder names are left out.
 */
export function playerRecords(history: readonly FinishedMatch[]): PlayerRecord[] {
  const records = new Map<string, PlayerRecord>()
  // Oldest first, so the most recent spelling of a name wins.
  for (const match of [...history].sort((a, b) => a.finishedAt - b.finishedAt)) {
    const stats = matchStats(match.setup, match.darts)
    const winners = sidesOf(match.setup)[match.winner] ?? []
    match.setup.names.forEach((name, player) => {
      if (isPlaceholder(name)) return
      const record = records.get(key(name)) ?? emptyRecord(name)
      records.set(key(name), record)
      record.name = name.trim()
      record.matches++
      if (winners.includes(player)) record.wins++
      record.lastPlayed = Math.max(record.lastPlayed, match.finishedAt)
      const mine = stats[player]!
      if (mine.kind === 'x01') {
        const x = record.x01
        x.matches++
        x.dartsThrown += mine.dartsThrown
        x.points += mine.points
        x.highestVisit = Math.max(x.highestVisit, mine.highestVisit)
        x.oneEighties += mine.oneEighties
        x.checkouts += mine.checkouts
        x.checkoutDarts += mine.checkoutDarts ?? 0
        x.highestCheckout = Math.max(x.highestCheckout, mine.highestCheckout)
        if (mine.bestLeg !== null) x.bestLeg = Math.min(x.bestLeg ?? Infinity, mine.bestLeg)
      } else if (mine.kind === 'clock') {
        record.clock.matches++
        record.clock.dartsThrown += mine.dartsThrown
        record.clock.hits += mine.hits
      } else if (mine.kind === 'killer') {
        record.killer.matches++
        record.killer.dartsThrown += mine.dartsThrown
        record.killer.livesTaken += mine.livesTaken
        record.killer.eliminations += mine.eliminations
      } else {
        record.cricket.matches++
        record.cricket.dartsThrown += mine.dartsThrown
        record.cricket.marks += mine.marks
      }
    })
  }
  return [...records.values()]
    .map((r) => ({
      ...r,
      x01: { ...r.x01, average: perThree(r.x01.points, r.x01.dartsThrown) },
      cricket: { ...r.cricket, marksPerRound: perThree(r.cricket.marks, r.cricket.dartsThrown) },
      clock: { ...r.clock, hitRate: r.clock.dartsThrown === 0 ? 0 : r.clock.hits / r.clock.dartsThrown },
    }))
    .sort((a, b) => b.matches - a.matches || b.lastPlayed - a.lastPlayed)
}

/** The match history, most recent first. */
export function loadHistory(repository: MatchRepository): Promise<FinishedMatch[]> {
  return repository.listFinished()
}

export function deleteFromHistory(repository: MatchRepository, id: string): Promise<void> {
  return repository.removeFinished(id)
}
