import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
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
  /** Start with every tile shown; otherwise only the picked mode until it is tapped. */
  defaultOpen?: boolean
}

function Tile({ mode }: { mode: GameModeId }) {
  const { t } = useI18n()
  const tile = TILES[mode]
  return (
    <>
      <span className="mode__figure" aria-hidden="true">{tile.figure}</span>
      <span className="mode__name">{t(registry[mode].label)}</span>
      <span className="mode__tagline">{t(tile.tagline)}</span>
    </>
  )
}

/**
 * The game modes as a grid of tiles. For screen readers and keyboards it is
 * a radio group: one Tab stop on the picked mode, and the arrow keys, Home
 * and End pick another. Folded, it shows the picked mode only; tapping a
 * tile in the grid picks it and folds the grid again.
 */
export function ModePicker({ value, onChange, defaultOpen = false }: Props) {
  const { t } = useI18n()
  const ref = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(defaultOpen)
  // Keep focus on the picker as it folds and unfolds: on the picked tile, or the folded one.
  const toggle = useRef<HTMLButtonElement>(null)
  const moved = useRef(false)
  useEffect(() => {
    if (!moved.current) return
    moved.current = false
    if (open) ref.current?.querySelector<HTMLElement>('[aria-checked="true"]')?.focus()
    else toggle.current?.focus()
  }, [open])
  const fold = (next: boolean) => {
    moved.current = true
    setOpen(next)
  }

  if (!open) {
    return (
      <button ref={toggle} type="button" className="mode mode--folded is-active" aria-expanded={false} onClick={() => fold(true)}>
        <Tile mode={value} />
        <span className="mode__change">{t('changeMode')} <span aria-hidden="true">▾</span></span>
      </button>
    )
  }

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
        return (
          <button
            key={mode}
            type="button"
            role="radio"
            aria-checked={checked}
            tabIndex={checked ? 0 : -1}
            className={`mode${checked ? ' is-active' : ''}`}
            onClick={() => {
              onChange(mode)
              fold(false)
            }}
          >
            <Tile mode={mode} />
          </button>
        )
      })}
    </div>
  )
}
