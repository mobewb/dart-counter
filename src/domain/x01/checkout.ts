import type { Dart } from '../shared-kernel/dart'

const SEGMENTS = [...Array.from({ length: 20 }, (_, i) => i + 1), 25]

const ALL_DARTS: Dart[] = SEGMENTS.flatMap((segment) =>
  ([1, 2, 3] as const)
    .filter((multiplier) => !(segment === 25 && multiplier === 3))
    .map((multiplier) => ({ segment, multiplier })),
)

/** Preferred finishing doubles, easiest to set up first. */
const DOUBLE_PREFERENCE = [20, 16, 8, 10, 12, 18, 4, 6, 14, 2, 22, 24, 26, 28, 30, 32, 34, 36, 38, 40, 50]

const value = (dart: Dart) => dart.segment * dart.multiplier

function routes(remaining: number, dartsLeft: number, doubleOut: boolean): Dart[][] {
  const found: Dart[][] = []
  const walk = (left: number, depth: number, path: Dart[]) => {
    for (const dart of ALL_DARTS) {
      const score = value(dart)
      if (score === left && (!doubleOut || dart.multiplier === 2)) found.push([...path, dart])
      else if (score < left && depth > 1) walk(left - score, depth - 1, [...path, dart])
    }
  }
  walk(remaining, dartsLeft, [])
  return found
}

function rank(route: Dart[]): number[] {
  const setup = route.slice(0, -1)
  const last = route.at(-1)!
  const bullSetups = setup.filter((dart) => dart.segment === 25).length
  const double = DOUBLE_PREFERENCE.indexOf(value(last))
  // Setup darts thrown highest-scoring first.
  return [route.length, bullSetups, double, ...setup.map((dart) => -value(dart))]
}

function compare(a: number[], b: number[]): number {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const diff = (a[i] ?? 0) - (b[i] ?? 0)
    if (diff !== 0) return diff
  }
  return 0
}

/**
 * Suggests the best way to finish `remaining` within `dartsLeft` darts, or
 * null when no finish exists. Heuristic, not a lookup of professional routes:
 * fewest darts first, then avoid bull setups, then the easiest finishing double.
 */
export function checkout(remaining: number, doubleOut: boolean, dartsLeft = 3): Dart[] | null {
  if (remaining < 1) return null
  const candidates = routes(remaining, dartsLeft, doubleOut).filter((route) => {
    // Canonical order only: setup darts sorted high to low avoids permutations.
    const setup = route.slice(0, -1).map(value)
    return setup.every((score, i) => i === 0 || setup[i - 1]! >= score)
  })
  if (candidates.length === 0) return null
  return candidates.reduce((best, route) => (compare(rank(route), rank(best)) < 0 ? route : best))
}
