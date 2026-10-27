import { useEffect, useMemo, useState } from 'react'
import { useI18n } from './i18n'

interface Props {
  targets: number[]
  /** Targets every player has closed. */
  dead: ReadonlySet<number>
  /** Indexes of the reels running the roulette, or null when idle. */
  spin: number[] | null
  onSpinEnd: () => void
}

const SPIN_MS = 1500
const STAGGER_MS = 380
const FILLER = 22

const label = (target: number) => (target === 25 ? 'B' : String(target))

/** Random numbers that scroll past before landing on `target`. */
function reelColumn(target: number): string[] {
  const column: string[] = []
  for (let i = 0; i < FILLER; i++) column.push(String(1 + Math.floor(Math.random() * 20)))
  column.push(label(target))
  return column
}

export function TargetsStrip({ targets, dead, spin, onSpinEnd }: Props) {
  const { t } = useI18n()
  const [go, setGo] = useState(false)
  const columns = useMemo(() => targets.map(reelColumn), [targets])
  const total = SPIN_MS + Math.max(0, (spin?.length ?? 1) - 1) * STAGGER_MS

  useEffect(() => {
    if (!spin) return
    setGo(false)
    const start = requestAnimationFrame(() => requestAnimationFrame(() => setGo(true)))
    const done = setTimeout(onSpinEnd, total + 250)
    return () => {
      cancelAnimationFrame(start)
      clearTimeout(done)
    }
  }, [spin, total, onSpinEnd, targets])

  return (
    <section className="targets" aria-label={t('shootFor')}>
      <h2>{t('shootFor')}</h2>
      <div className="targets__row">
        {targets.map((target, i) => {
          const order = spin ? spin.indexOf(i) : -1
          const spinning = order >= 0
          const column = columns[i]!
          const duration = SPIN_MS + order * STAGGER_MS
          const cls = [
            'target',
            dead.has(target) && 'is-dead',
            target === 25 && 'target--bull',
            !spin && 'is-landed',
          ].filter(Boolean).join(' ')
          return (
            <div key={i} className={cls}>
              {spinning ? (
                <div
                  className="target__reel"
                  style={{
                    transform: go ? `translateY(calc(var(--reel-h) * -${column.length - 1}))` : 'translateY(0)',
                    transition: go ? `transform ${duration}ms cubic-bezier(0.12, 0.7, 0.18, 1)` : 'none',
                  }}
                >
                  {column.map((n, j) => <span key={j}>{n}</span>)}
                </div>
              ) : (
                <span>{label(target)}</span>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
