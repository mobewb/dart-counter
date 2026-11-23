import type { Dart } from '../domain'
import { isPlaceholder, playerKey } from './history'
import { openMatch, type Match } from './match'
import type { FinishedMatch } from './match-repository'
import { sidesOf } from './match-setup'
import { gameModes, type GameModeId, type StateOf, type Step } from './modes'

/**
 * Achievements are earned by players, matched by name like their records, and
 * are derived from the match history: nothing more is stored (ADR-001).
 * Secret ones stay hidden until earned.
 */
export const ACHIEVEMENTS = [
  // Career: matches played and won.
  { id: 'firstMatch', secret: false },
  { id: 'firstWin', secret: false },
  { id: 'regular', secret: false },
  { id: 'veteran', secret: false },
  { id: 'hatTrick', secret: false },
  { id: 'globetrotter', secret: false },
  { id: 'teamSpirit', secret: false },
  { id: 'fullHouse', secret: false },
  // Darts and visits, in any game mode.
  { id: 'bullseye', secret: false },
  { id: 'threeInABed', secret: false },
  { id: 'shanghai', secret: false },
  { id: 'oneEighty', secret: false },
  // One game mode.
  { id: 'tonCheckout', secret: false },
  { id: 'bullFinish', secret: false },
  { id: 'nineDarter', secret: false },
  { id: 'nineMarks', secret: false },
  { id: 'speedClock', secret: false },
  { id: 'tripleKill', secret: false },
  { id: 'knockBack', secret: false },
  // Secrets.
  { id: 'bigFish', secret: true },
  { id: 'madhouse', secret: true },
  { id: 'bedAndBreakfast', secret: true },
  { id: 'blindfolded', secret: true },
  { id: 'boing', secret: true },
  { id: 'nightOwl', secret: true },
] as const

export type AchievementId = (typeof ACHIEVEMENTS)[number]['id']

/** Matches played to be a regular, and a veteran. */
const REGULAR = 10
const VETERAN = 50
/** Darts a side may take to win Around the Clock for speedClock. */
const SPEED_CLOCK = 30

const is = (dart: Dart, segment: number, multiplier: number) => dart.segment === segment && dart.multiplier === multiplier
const same = (a: Dart, b: Dart) => is(a, b.segment, b.multiplier)

type AnyStep = Step<StateOf<GameModeId>>

/** A player's visits: runs of darts from the start of a turn. */
function visitsOf(steps: readonly AnyStep[]): AnyStep[][] {
  const visits: AnyStep[][] = []
  for (const step of steps) {
    const current = visits.at(-1)
    if (!current || step.before.turnDarts.length === 0 || current[0]!.side !== step.side) visits.push([step])
    else current.push(step)
  }
  return visits
}

/** What a full visit of three darts earns, in the order a highlight prefers them. */
function visitAchievements(mode: GameModeId, visit: readonly AnyStep[]): AchievementId[] {
  if (visit.length !== 3) return []
  const darts = visit.map((s) => s.dart)
  const [a, b, c] = darts as [Dart, Dart, Dart]
  const earned: AchievementId[] = []
  if (darts.every((d) => is(d, 20, 3))) earned.push('oneEighty')
  if (mode === 'cricket' || mode === 'crazy') {
    const marks = visit.reduce((sum, { dart, before }) => sum + ((before as StateOf<'cricket'>).targets.includes(dart.segment) ? dart.multiplier : 0), 0)
    if (marks >= 9) earned.push('nineMarks')
  }
  if (mode === 'killer') {
    const taken = visit.flatMap((s) => s.events).filter((e) => e.type === 'LifeLost' && e.player !== visit[0]!.side).length
    if (taken >= 3) earned.push('tripleKill')
  }
  const multipliers = new Set(darts.map((d) => d.multiplier))
  if (a.segment >= 1 && a.segment <= 20 && darts.every((d) => d.segment === a.segment) && multipliers.size === 3) earned.push('shanghai')
  if (darts.map((d) => (d.multiplier === 1 ? d.segment : 0)).sort((x, y) => x - y).join() === '1,5,20') earned.push('bedAndBreakfast')
  if (a.segment !== 0 && same(a, b) && same(b, c)) earned.push('threeInABed')
  if (darts.every((d) => d.segment === 0)) earned.push('blindfolded')
  return earned
}

/** The highlight of the visit the last dart completed, if it earns one; for a toast during play. */
export function visitHighlight(match: Match): AchievementId | null {
  const last = match.steps.at(-1)
  if (!last) return null
  const visit = visitsOf(match.steps).at(-1)!
  return visitAchievements(match.setup.mode, visit)[0] ?? null
}

/** Legs this player checked out with this dart. */
const finishedOn = (steps: readonly AnyStep[], player: number, segment: number, multiplier: number) =>
  steps.some((s) => s.player === player && is(s.dart, segment, multiplier) &&
    s.events.some((e) => e.type === 'LegWon') && !s.events.some((e) => e.type === 'RoundLimitReached'))

/** What each player earned in one match, by player index; career achievements aside. */
export function matchAchievements(match: Match, finishedAt: number): Set<AchievementId>[] {
  const { setup, steps, state } = match
  const sides = sidesOf(setup)
  const earned = setup.names.map(() => new Set<AchievementId>())
  const add = (player: number, ...ids: AchievementId[]) => ids.forEach((id) => earned[player]!.add(id))

  for (const visit of visitsOf(steps)) add(visit[0]!.player, ...visitAchievements(setup.mode, visit))
  for (const step of steps) if (is(step.dart, 25, 2)) add(step.player, 'bullseye')

  setup.names.forEach((_, player) => {
    const won = state.winner !== null && sides[state.winner]!.includes(player)
    if (won && new Date(finishedAt).getHours() < 5) add(player, 'nightOwl')
    switch (setup.mode) {
      case 'x01': {
        const { stats, setup: { config } } = match as Match<'x01'>
        const { highestCheckout, bestLeg } = stats[player]!
        if (highestCheckout >= 100) add(player, 'tonCheckout')
        if (highestCheckout === 170) add(player, 'bigFish')
        if (config.startScore === 501 && bestLeg !== null && bestLeg <= 9) add(player, 'nineDarter')
        if (finishedOn(steps, player, 25, 2)) add(player, 'bullFinish')
        if (finishedOn(steps, player, 1, 2)) add(player, 'madhouse')
        break
      }
      case 'clock':
        if (won && match.results[state.winner!]!.dartsThrown <= SPEED_CLOCK) add(player, 'speedClock')
        break
      case 'three21': {
        const stats = (match as Match<'three21'>).stats[player]!
        if (stats.knockBacks > 0) add(player, 'knockBack')
        if (stats.bounces >= 3) add(player, 'boing')
        break
      }
    }
  })
  return earned
}

/** A finished match, as far as achievements are concerned. */
export type Played = Pick<FinishedMatch, 'setup' | 'darts' | 'finishedAt'>

/** A named player's achievements, with when each was first earned. */
export interface PlayerAchievements {
  name: string
  unlocked: Map<AchievementId, number>
}

interface Career {
  name: string
  matches: number
  wins: number
  /** Wins in a row, up to the last match. */
  streak: number
  modes: Set<GameModeId>
  unlocked: Map<AchievementId, number>
}

/** Adds one match to the careers of its named players. */
function addMatch(careers: Map<string, Career>, played: Played): void {
  const match = openMatch(played.setup, played.darts)
  const { setup, state } = match
  if (state.winner === null) return
  const sides = sidesOf(setup)
  const earned = matchAchievements(match, played.finishedAt)
  setup.names.forEach((name, player) => {
    if (isPlaceholder(name)) return
    const career = careers.get(playerKey(name)) ?? { name, matches: 0, wins: 0, streak: 0, modes: new Set(), unlocked: new Map() }
    careers.set(playerKey(name), career)
    const won = sides[state.winner!]!.includes(player)
    career.name = name.trim()
    career.matches++
    career.wins += won ? 1 : 0
    career.streak = won ? career.streak + 1 : 0
    career.modes.add(setup.mode)

    const ids = [...earned[player]!]
    const when = (ok: boolean, id: AchievementId) => ok && ids.push(id)
    when(true, 'firstMatch')
    when(career.wins >= 1, 'firstWin')
    when(career.matches >= REGULAR, 'regular')
    when(career.matches >= VETERAN, 'veteran')
    when(career.streak >= 3, 'hatTrick')
    when(career.modes.size === gameModes.length, 'globetrotter')
    when(won && sides[state.winner!]!.length > 1, 'teamSpirit')
    when(setup.names.length === 8, 'fullHouse')
    for (const id of ids) if (!career.unlocked.has(id)) career.unlocked.set(id, played.finishedAt)
  })
}

function careersOf(history: readonly Played[]): Map<string, Career> {
  const careers = new Map<string, Career>()
  for (const played of [...history].sort((a, b) => a.finishedAt - b.finishedAt)) addMatch(careers, played)
  return careers
}

/** Every named player's achievements, most achievements first. Placeholder names are left out. */
export function playerAchievements(history: readonly Played[]): PlayerAchievements[] {
  return [...careersOf(history).values()]
    .map(({ name, unlocked }) => ({ name, unlocked }))
    .sort((a, b) => b.unlocked.size - a.unlocked.size)
}

/**
 * What each player of a just-finished match earned for the first time, by
 * player index. Unnamed players have no career: they get what the match itself earned.
 */
export function newlyUnlocked(past: readonly Played[], played: Played): AchievementId[][] {
  const before = careersOf(past)
  const after = careersOf([...past, played])
  const earned = matchAchievements(openMatch(played.setup, played.darts), played.finishedAt)
  const order = (ids: Iterable<AchievementId>) => ACHIEVEMENTS.map((a) => a.id).filter((id) => [...ids].includes(id))
  return played.setup.names.map((name, player) => {
    if (isPlaceholder(name)) return order(earned[player]!)
    const had = before.get(playerKey(name))?.unlocked ?? new Map()
    const has = after.get(playerKey(name))?.unlocked ?? new Map()
    return order([...has.keys()].filter((id) => !had.has(id)))
  })
}
