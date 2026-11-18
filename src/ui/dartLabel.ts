import type { Dart } from '../domain'
import type { Key } from './i18n'

export function dartLabel({ segment, multiplier }: Dart, missLabel = '—'): string {
  if (segment === 0) return missLabel
  if (segment === 25) return multiplier === 2 ? 'BULL' : '25'
  return `${multiplier === 2 ? 'D' : multiplier === 3 ? 'T' : ''}${segment}`
}

/** A dart in words for screen readers: "Double 20", "Bull". */
export function spokenDart({ segment, multiplier }: Dart, t: (key: Key) => string): string {
  if (segment === 25) return multiplier === 2 ? t('bull') : '25'
  return `${t(multiplier === 3 ? 'triple' : multiplier === 2 ? 'double' : 'single')} ${segment}`
}
