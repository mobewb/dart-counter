import type { Dart } from '../engine'

export function dartLabel({ segment, multiplier }: Dart, missLabel = '—'): string {
  if (segment === 0) return missLabel
  if (segment === 25) return multiplier === 2 ? 'BULL' : '25'
  return `${multiplier === 2 ? 'D' : multiplier === 3 ? 'T' : ''}${segment}`
}
