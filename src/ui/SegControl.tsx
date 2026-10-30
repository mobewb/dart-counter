import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react'

interface Props<Value extends string | number> {
  options: readonly { value: Value; label: string }[]
  value: Value
  onChange: (value: Value) => void
}

/**
 * A segmented control whose highlight slides to the picked option. The
 * highlight is measured from the active button, so options of uneven width
 * (or wrapping onto two lines) work, and it follows resizes and language changes.
 */
export function SegControl<Value extends string | number>({ options, value, onChange }: Props<Value>) {
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

  return (
    <div ref={ref} className="seg-control seg-control--slider">
      {thumb && <i className={`seg-control__thumb${ready ? ' is-ready' : ''}`} style={thumb} aria-hidden />}
      {options.map((o) => (
        <button key={o.value} className={o.value === value ? 'is-active' : ''} aria-pressed={o.value === value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  )
}
