import { useState } from 'react'
import type { Dart, Multiplier } from '../engine'
import { useI18n } from './i18n'

interface Props {
  onHit: (dart: Dart) => void
  disabled?: boolean
}

const NUMBERS = Array.from({ length: 20 }, (_, i) => i + 1)

export function Keypad({ onHit, disabled }: Props) {
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
          <button key={n} disabled={disabled} onClick={() => throwAt(n)}>{n}</button>
        ))}
        <button className="pad__bull" disabled={disabled} onClick={() => throwAt(25, mult === 3 ? 1 : mult)}>{t('bull')}</button>
        <button className="pad__miss" disabled={disabled} onClick={() => throwAt(0, 1)}>{t('miss')}</button>
      </div>
    </div>
  )
}
