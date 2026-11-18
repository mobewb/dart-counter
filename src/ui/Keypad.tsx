import { useState } from 'react'
import type { Dart, Multiplier } from '../domain'
import { useI18n } from './i18n'

interface Props {
  onHit: (dart: Dart) => void
  disabled?: boolean
  targets?: number[]
  /** Numbers marked with a skull (Killer). */
  marked?: number[]
  /** Darts that would win now: their buttons glow, and so does a multiplier tab that has one. */
  winning?: Dart[]
}

const NUMBERS = Array.from({ length: 20 }, (_, i) => i + 1)

export function Keypad({ onHit, disabled, targets, marked, winning = [] }: Props) {
  const { t } = useI18n()
  const [mult, setMult] = useState<Multiplier>(1)
  const throwAt = (segment: number, multiplier: Multiplier = mult) => {
    onHit({ segment, multiplier })
    setMult(1)
  }
  const tabs: [Multiplier, string][] = [[1, t('single')], [2, t('double')], [3, t('triple')]]
  const wins = (segment: number, multiplier: Multiplier) => winning.some((d) => d.segment === segment && d.multiplier === multiplier)
  // The bull buttons don't follow the tabs, so only numbers light a tab up.
  const tabWins = (multiplier: Multiplier) => winning.some((d) => d.segment !== 25 && d.multiplier === multiplier)
  const cls = (...names: (string | false | undefined)[]) => names.filter(Boolean).join(' ') || undefined
  return (
    <div className="pad">
      <div className="seg-control">
        {tabs.map(([m, label]) => (
          <button key={m} className={cls(mult === m && 'is-active', tabWins(m) && 'has-win')} onClick={() => setMult(m)}>{label}</button>
        ))}
      </div>
      <div className="pad__grid">
        {NUMBERS.map((n) => (
          <button key={n} disabled={disabled} className={cls(targets && !targets.includes(n) && 'is-faded', wins(n, mult) && 'is-win')} onClick={() => throwAt(n)}>
            {n}
            {marked?.includes(n) && <span className="pad__skull" aria-label="💀">💀</span>}
          </button>
        ))}
        {/* Outer and inner bull have their own buttons: the multiplier resets after each dart. */}
        <button className={cls('pad__outer-bull', wins(25, 1) && 'is-win')} disabled={disabled} onClick={() => throwAt(25, 1)}>25</button>
        <button className={cls('pad__bull', wins(25, 2) && 'is-win')} disabled={disabled} onClick={() => throwAt(25, 2)}>{t('bull')}</button>
        <button className="pad__miss" disabled={disabled} onClick={() => throwAt(0, 1)}>{t('miss')}</button>
      </div>
    </div>
  )
}
