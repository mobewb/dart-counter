export type Multiplier = 1 | 2 | 3

/** segment: 0 = miss, 1-20 = numbered segments, 25 = bull (double = 50). */
export interface Dart {
  segment: number
  multiplier: Multiplier
}

export function dartScore(dart: Dart): number {
  return dart.segment * dart.multiplier
}

export function isValidDart({ segment, multiplier }: Dart): boolean {
  if (segment === 0) return multiplier === 1
  if (segment === 25) return multiplier !== 3
  return Number.isInteger(segment) && segment >= 1 && segment <= 20
}
