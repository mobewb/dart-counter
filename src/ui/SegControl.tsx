import { useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react'
import { optionAfterKey } from './seg-keys'

interface Option<Value extends string | number> {
  value: Value
  label: string
  /** Extra classes on the option's button, e.g. `has-win` for the keypad's aim dot. */
  className?: string
  /** Read by screen readers after the label. */
  note?: string
}

interface Props<Value extends string | number> {
  /** The group's name for screen readers, e.g. "Game". */
  label: string
  options: readonly Option<Value>[]
  value: Value
  onChange: (value: Value) => void
  small?: boolean
}

/**
 * A segmented control whose highlight slides to the picked option. The
 * highlight is measured from the active button, so options of uneven width
 * (or wrapping onto two lines) work, and it follows resizes and language changes.
 *
 * For screen readers and keyboards it is a radio group: one Tab stop on the
 * picked option, and the arrow keys, Home and End pick another.
 */
export function SegControl<Value extends string | number>({ label, options, value, onChange, small = false }: Props<Value>) {
  const ref = useRef<HTMLDivElement>(null)
  const [thumb, setThumb] = useState<CSSProperties | null>(null)
  // The first placement jumps into place; only later changes slide.
  const [ready, setReady] = useState(false)
  // Callers build `options` on each render; remeasure only when they really change.
  const labels = options.map((o) => o.label).join('|')

  useLayoutEffect(() => {
    const control = ref.current
    if (!control) return
    const place = () => {
      const active = control.querySelector<HTMLElement>('button.is-active')
      if (!active) return setThumb(null)
      setThumb({ width: active.offsetWidth, height: active.offsetHeight, transform: `translate(${active.offsetLeft}px, ${active.offsetTop}px)` })
    }
    place()
    const observer = new ResizeObserver(place)
    observer.observe(control)
    return () => observer.disconnect()
  }, [value, labels])

  useLayoutEffect(() => {
    if (!thumb || ready) return
    const frame = requestAnimationFrame(() => setReady(true))
    return () => cancelAnimationFrame(frame)
  }, [thumb, ready])

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const current = options.findIndex((o) => o.value === value)
    const next = optionAfterKey(event.key, Math.max(current, 0), options.length)
    if (next === null) return
    event.preventDefault()
    onChange(options[next]!.value)
    ref.current?.querySelectorAll<HTMLElement>('[role="radio"]')[next]?.focus()
  }

  return (
    <div ref={ref} className={`seg-control seg-control--slider${small ? ' seg-control--small' : ''}`} role="radiogroup" aria-label={label} onKeyDown={onKeyDown}>
      {thumb && <i className={`seg-control__thumb${ready ? ' is-ready' : ''}`} style={thumb} aria-hidden />}
      {options.map((o) => {
        const checked = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={checked}
            tabIndex={checked ? 0 : -1}
            className={[checked && 'is-active', o.className].filter(Boolean).join(' ') || undefined}
            onClick={() => onChange(o.value)}
          >
            {o.label}
            {o.note && <span className="sr-only">, {o.note}</span>}
          </button>
        )
      })}
    </div>
  )
}
