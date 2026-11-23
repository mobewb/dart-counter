import { describe, expect, it } from 'vitest'
import type { Dart } from '../domain'
import { matchAchievements, newlyUnlocked, playerAchievements, visitHighlight, type Played } from './achievements'
import { openMatch } from './match'
import { startMatch, type MatchRequest } from './match-setup'

const s = (n: number): Dart => ({ segment: n, multiplier: 1 })
const d = (n: number): Dart => ({ segment: n, multiplier: 2 })
const t = (n: number): Dart => ({ segment: n, multiplier: 3 })
const miss: Dart = { segment: 0, multiplier: 1 }

/** 2 in the afternoon, local time; nightOwl needs a match finished before 5. */
const DAY = new Date(2026, 0, 1, 14).getTime()

const x01 = (startScore: number) => ({ startScore, doubleIn: false, doubleOut: true, legsToWinSet: 1, setsToWinMatch: 1 })

function played(request: MatchRequest, darts: Dart[], finishedAt = DAY): Played {
  return { setup: startMatch(request, () => 0), darts, finishedAt }
}

const earned = (p: Played) => matchAchievements(openMatch(p.setup, p.darts), p.finishedAt).map((ids) => [...ids].sort())

describe('match achievements', () => {
  it('finds visits worth a highlight, in any mode', () => {
    // Ann: 180; Bob: Shanghai on 5; Ann: bed and breakfast; Bob: three misses.
    const p = played({ mode: 'x01', names: ['Ann', 'Bob'], options: x01(501) }, [t(20), t(20), t(20), s(5), d(5), t(5), s(20), s(5), s(1), miss, miss, miss])
    const [ann, bob] = earned(p)
    expect(ann).toEqual(['bedAndBreakfast', 'oneEighty', 'threeInABed'])
    expect(bob).toEqual(['blindfolded', 'shanghai'])
  })

  it('names the highlight of the visit just completed', () => {
    const setup = startMatch({ mode: 'x01', names: ['Ann'], options: x01(501) })
    expect(visitHighlight(openMatch(setup, [t(20), t(20)]))).toBeNull()
    expect(visitHighlight(openMatch(setup, [t(20), t(20), t(20)]))).toBe('oneEighty')
    expect(visitHighlight(openMatch(setup, [t(20), t(20), t(20), s(1)]))).toBeNull()
  })

  it('rewards X01 finishes: a bull finish, a ton checkout, a nine-darter', () => {
    // 501 in nine darts: 180, 180, then T20 T19 D12 (141).
    const nine = played({ mode: 'x01', names: ['Ann'], options: x01(501) }, [t(20), t(20), t(20), t(20), t(20), t(20), t(20), t(19), d(12)])
    expect(earned(nine)[0]).toEqual(expect.arrayContaining(['nineDarter', 'tonCheckout']))
    const bull = played({ mode: 'x01', names: ['Ann'], options: x01(50) }, [d(25)])
    expect(earned(bull)[0]).toEqual(['bullFinish', 'bullseye'])
    const madhouse = played({ mode: 'x01', names: ['Ann'], options: x01(2) }, [d(1)])
    expect(earned(madhouse)[0]).toContain('madhouse')
  })

  it('rewards a nine-mark round in cricket', () => {
    const p = played({ mode: 'cricket', names: ['Ann'], options: {} }, [t(20), t(19), t(18)])
    expect(earned(p)[0]).toContain('nineMarks')
  })

  it('rewards a night owl only for a win before 5 in the morning', () => {
    const late = new Date(2026, 0, 1, 2).getTime()
    const p = played({ mode: 'x01', names: ['Ann', 'Bob'], options: x01(40) }, [d(20)], late)
    expect(earned(p)[0]).toContain('nightOwl')
    expect(earned(p)[1]).not.toContain('nightOwl')
  })
})

describe('player achievements', () => {
  it('adds up careers: first match, first win, three wins in a row', () => {
    const win = (at: number) => played({ mode: 'x01', names: ['Ann', 'Bob'], options: x01(40) }, [d(20)], DAY + at)
    const [ann, bob] = playerAchievements([win(1), win(2), win(3)])
    expect(ann!.name).toBe('Ann')
    expect([...ann!.unlocked.keys()]).toEqual(expect.arrayContaining(['firstMatch', 'firstWin', 'hatTrick']))
    expect(ann!.unlocked.get('hatTrick')).toBe(DAY + 3)
    expect([...bob!.unlocked.keys()]).toEqual(['firstMatch'])
  })

  it('leaves placeholder names out', () => {
    const p = played({ mode: 'x01', names: ['Player 1'], options: x01(40) }, [d(20)])
    expect(playerAchievements([p])).toEqual([])
  })
})

describe('newly unlocked', () => {
  it('lists what a named player earned for the first time', () => {
    const first = played({ mode: 'x01', names: ['Ann', 'Bob'], options: x01(40) }, [d(20)], DAY)
    const second = played({ mode: 'x01', names: ['Ann', 'Bob'], options: x01(40) }, [s(20), miss, miss, d(20)], DAY + 1)
    expect(newlyUnlocked([], first)).toEqual([['firstMatch', 'firstWin'], ['firstMatch']])
    expect(newlyUnlocked([first], second)).toEqual([[], ['firstWin']])
  })

  it('gives unnamed players what the match earned', () => {
    const p = played({ mode: 'x01', names: ['Player 1'], options: x01(50) }, [d(25)])
    expect(newlyUnlocked([], p)).toEqual([['bullseye', 'bullFinish']])
  })
})
