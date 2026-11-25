import { useState } from 'react'
import type { Dart, Multiplier } from '../domain'
import { useI18n } from './i18n'
import { SegControl } from './SegControl'

interface Props {
  onHit: (dart: Dart) => void
  disabled?: boolean
  targets?: number[]
  /** Numbers marked with a skull (Killer). */
  marked?: number[]
  /** Darts to aim at: their buttons glow with the matching multiplier, a tab holding one gets a dot, and the other buttons fade. */
  aim?: Dart[]
  /** Read by screen readers on a glowing button, e.g. "wins". */
  aimLabel?: string
}

const NUMBERS = Array.from({ length: 20 }, (_, i) => i + 1)

export function Keypad({ onHit, disabled, targets, marked, aim = [], aimLabel = '' }: Props) {
  const { t } = useI18n()
  const [mult, setMult] = useState<Multiplier>(1)
  const throwAt = (segment: number, multiplier: Multiplier = mult) => {
    onHit({ segment, multiplier })
    setMult(1)
  }
  const tabs: [Multiplier, string][] = [[1, t('single')], [2, t('double')], [3, t('triple')]]
  const aimed = (segment: number, multiplier: Multiplier) => aim.some((d) => d.segment === segment && d.multiplier === multiplier)
  // The bull buttons don't follow the tabs, so only numbers light a tab up.
  const tabAimed = (multiplier: Multiplier) => aim.some((d) => d.segment !== 25 && d.multiplier === multiplier)
  // A number stays bright while any of its beds is aimed at: the tab dot says which multiplier.
  const faded = (segment: number) => (targets && !targets.includes(segment)) || (aim.length > 0 && !aim.some((d) => d.segment === segment))
  const cls = (...names: (string | false | undefined)[]) => names.filter(Boolean).join(' ') || undefined
  return (
    <div className="pad">
      <SegControl
        label={t('multiplier')}
        options={tabs.map(([m, label]) => ({ value: m, label, className: tabAimed(m) ? 'has-win' : undefined, note: tabAimed(m) ? t('hasAimDart') : undefined }))}
        value={mult}
        onChange={setMult}
      />
      <div className="pad__grid">
        {NUMBERS.map((n) => (
          <button key={n} disabled={disabled} className={cls(faded(n) && 'is-faded', aimed(n, mult) && 'is-win')} onClick={() => throwAt(n)}>
            {n}
            {aimed(n, mult) && <span className="sr-only">, {aimLabel}</span>}
            {marked?.includes(n) && <><span className="pad__skull" aria-hidden="true">💀</span><span className="sr-only">, {t('takesLife')}</span></>}
          </button>
        ))}
        {/* Outer and inner bull have their own buttons: the multiplier resets after each dart. */}
        <button className={cls('pad__outer-bull', aim.length > 0 && !aimed(25, 1) && 'is-faded', aimed(25, 1) && 'is-win')} disabled={disabled} onClick={() => throwAt(25, 1)}>
          25{aimed(25, 1) && <span className="sr-only">, {aimLabel}</span>}
        </button>
        <button className={cls('pad__bull', aim.length > 0 && !aimed(25, 2) && 'is-faded', aimed(25, 2) && 'is-win')} disabled={disabled} onClick={() => throwAt(25, 2)}>
          {t('bull')}{aimed(25, 2) && <span className="sr-only">, {aimLabel}</span>}
        </button>
        <button className="pad__miss" disabled={disabled} onClick={() => throwAt(0, 1)}>{t('miss')}</button>
      </div>
    </div>
  )
}
