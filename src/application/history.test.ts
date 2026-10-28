import { describe, expect, it } from 'vitest'
import type { Dart } from '../domain'
import { playerRecords } from './history'
import { newCurrentMatch, progress } from './match-persistence'
import type { FinishedMatch } from './match-repository'
import { startMatch, type MatchRequest } from './match-setup'

const s = (n: number): Dart => ({ segment: n, multiplier: 1 })
const d = (n: number): Dart => ({ segment: n, multiplier: 2 })
const t = (n: number): Dart => ({ segment: n, multiplier: 3 })
const miss: Dart = { segment: 0, multiplier: 1 }
const repeat = (dart: Dart, n: number) => Array.from({ length: n }, () => dart)

/** A finished match, built the way the app saves it. */
function finished(request: MatchRequest, darts: Dart[], at: number): FinishedMatch {
  const { match, outcome } = progress(newCurrentMatch(startMatch(request), 0, `m${at}`), darts, at)
  if (outcome.winner === null) throw new Error('match is not finished')
  return { ...match, finishedAt: at, winner: outcome.winner, results: outcome.results, players: outcome.players }
}

const rules = { startScore: 40, doubleIn: false, doubleOut: true, legsToWinSet: 1, setsToWinMatch: 1 }

describe('player records', () => {
  it('has no records without history', () => {
    expect(playerRecords([])).toEqual([])
  })

  it('adds up matches, wins and X01 stats per player, across matches', () => {
    const history = [
      // Ann wins with D20 (1 dart, 40 points).
      finished({ mode: 'x01', names: ['Ann', 'Bob'], rules }, [d(20)], 1),
      // Ann scores 20 then misses twice on 20 left (all three at a finishable double); Bob wins with D20.
      finished({ mode: 'x01', names: ['Ann', 'Bob'], rules }, [s(20), miss, miss, d(20)], 2),
    ]
    const [ann, bob] = playerRecords(history)
    expect(ann).toMatchObject({ name: 'Ann', matches: 2, wins: 1, lastPlayed: 2 })
    expect(ann!.x01).toMatchObject({ matches: 2, dartsThrown: 4, points: 60, average: 45, checkouts: 1, checkoutDarts: 4, bestLeg: 1 })
    expect(bob).toMatchObject({ name: 'Bob', matches: 2, wins: 1 })
    expect(bob!.x01).toMatchObject({ dartsThrown: 1, points: 40, checkouts: 1, highestCheckout: 40, bestLeg: 1 })
  })

  it('matches names ignoring case and spaces, keeping the latest spelling', () => {
    const history = [
      finished({ mode: 'x01', names: ['ann', 'Bob'], rules }, [d(20)], 1),
      finished({ mode: 'x01', names: [' Ann ', 'Bob'], rules }, [d(20)], 2),
    ]
    expect(playerRecords(history).find((r) => r.name === 'Ann')).toMatchObject({ matches: 2, wins: 2 })
  })

  it('counts a team win for every member', () => {
    const match = finished({ mode: 'x01', names: ['Ann', 'Bob', 'Cid'], teams: [0, 1, 0], rules }, [s(20), s(10), s(6), ...repeat(miss, 3), d(2)], 1)
    const records = playerRecords([match])
    expect(records.map((r) => [r.name, r.wins])).toEqual(
      expect.arrayContaining([['Ann', 1], ['Cid', 1], ['Bob', 0]]),
    )
  })

  it('leaves out placeholder names given to unnamed players', () => {
    const match = finished({ mode: 'x01', names: ['Ann', 'Player 2'], rules }, [d(20)], 1)
    const other = finished({ mode: 'x01', names: ['Joueur 1', 'Bob'], rules }, [d(20)], 2)
    expect(playerRecords([match, other]).map((r) => r.name).sort()).toEqual(['Ann', 'Bob'])
  })

  it('keeps cricket stats apart from X01', () => {
    const cricket = finished({ mode: 'cricket', names: ['Ann'] }, [t(20), t(19), t(18), t(17), t(16), t(15), d(25), s(25)], 1)
    const [ann] = playerRecords([cricket])
    expect(ann!.cricket).toEqual({ matches: 1, dartsThrown: 8, marks: 21, marksPerRound: (21 / 8) * 3 })
    expect(ann!.x01.matches).toBe(0)
  })
})
