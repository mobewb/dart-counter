import { useRef, type KeyboardEvent } from 'react'
import { gameModes, type GameModeId } from '../application/modes'
import { useI18n, type Key } from './i18n'
import { registry } from './registry'
import { optionAfterKey } from './seg-keys'

/** Each mode's figure on its tile and the line under its name. */
const TILES: Record<GameModeId, { figure: string; tagline: Key }> = {
  x01: { figure: '501', tagline: 'x01Tagline' },
  cricket: { figure: '15–20', tagline: 'cricketTagline' },
  crazy: { figure: '?·?·?', tagline: 'crazyTagline' },
  clock: { figure: '1→20', tagline: 'clockTagline' },
  killer: { figure: 'D×3', tagline: 'killerTagline' },
  three21: { figure: '0→321', tagline: 'three21Tagline' },
}

interface Props {
  value: GameModeId
  onChange: (mode: GameModeId) => void
}

/**
 * The game modes as a grid of tiles. For screen readers and keyboards it is
 * a radio group: one Tab stop on the picked mode, and the arrow keys, Home
 * and End pick another.
 */
export function ModePicker({ value, onChange }: Props) {
  const { t } = useI18n()
  const ref = useRef<HTMLDivElement>(null)
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const next = optionAfterKey(event.key, Math.max(gameModes.indexOf(value), 0), gameModes.length)
    if (next === null) return
    event.preventDefault()
    onChange(gameModes[next]!)
    ref.current?.querySelectorAll<HTMLElement>('[role="radio"]')[next]?.focus()
  }
  return (
    <div ref={ref} className="modes" role="radiogroup" aria-label={t('game')} onKeyDown={onKeyDown}>
      {gameModes.map((mode) => {
        const checked = mode === value
        const tile = TILES[mode]
        return (
          <button
            key={mode}
            type="button"
            role="radio"
            aria-checked={checked}
            tabIndex={checked ? 0 : -1}
            className={`mode${checked ? ' is-active' : ''}`}
            onClick={() => onChange(mode)}
          >
            <span className="mode__figure" aria-hidden="true">{tile.figure}</span>
            <span className="mode__name">{t(registry[mode].label)}</span>
            <span className="mode__tagline">{t(tile.tagline)}</span>
          </button>
        )
      })}
    </div>
  )
}
