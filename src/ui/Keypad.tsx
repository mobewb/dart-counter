import { useState } from 'react'
import type { Dart, Multiplier } from '../domain'
import { useI18n } from './i18n'

interface Props {
  onHit: (dart: Dart) => void
  disabled?: boolean
  targets?: number[]
}

const NUMBERS = Array.from({ length: 20 }, (_, i) => i + 1)

export function Keypad({ onHit, disabled, targets }: Props) {
  const { t } = useI18n()
  const [mult, setMult] = useState<Multiplier>(1)
  const throwAt = (segment: number, multiplier: Multiplier = mult) => {
    onHit({ segment, multiplier })
    setMult(1)
  }
  const tabs: [Multiplier, string][] = [[1, t('single')], [2, t('double')], [3, t('triple')]]
  return (
    <div className="pad">
      <div className="seg-control">
        {tabs.map(([m, label]) => (
          <button key={m} className={mult === m ? 'is-active' : ''} onClick={() => setMult(m)}>{label}</button>
        ))}
      </div>
      <div className="pad__grid">
        {NUMBERS.map((n) => (
          <button key={n} disabled={disabled} className={targets && !targets.includes(n) ? 'is-faded' : ''} onClick={() => throwAt(n)}>{n}</button>
        ))}
        {/* Outer and inner bull have their own buttons: the multiplier resets after each dart. */}
        <button className="pad__outer-bull" disabled={disabled} onClick={() => throwAt(25, 1)}>25</button>
        <button className="pad__bull" disabled={disabled} onClick={() => throwAt(25, 2)}>{t('bull')}</button>
        <button className="pad__miss" disabled={disabled} onClick={() => throwAt(0, 1)}>{t('miss')}</button>
      </div>
    </div>
  )
}
