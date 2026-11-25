import type { ReactNode } from 'react'
import { useI18n } from '../i18n'

/** Clamps a share of the way done to the 0–100 a ring or bar draws. */
function percent(done: number): number {
  return Math.min(100, Math.max(0, done * 100))
}

interface OrbitProps {
  name: string
  /** The big figure in the ring: a score, a target, a number. */
  value: ReactNode
  /** How far along the side is, from 0 to 1: the share of the ring that is filled. */
  done: number
  /** A short line under the value, e.g. the average. */
  meta?: ReactNode
  /** Under the meta line, e.g. Killer's lives. */
  extra?: ReactNode
  starter?: boolean
  winner?: boolean
  /** Paints the ring red, for a ring that counts down what is left (Killer's lives). */
  hot?: boolean
}

/** The side to throw, its figure in a ring that fills as it nears the goal. */
export function Orbit({ name, value, done, meta, extra, starter = false, winner = false, hot = false }: OrbitProps) {
  const { t } = useI18n()
  return (
    <section className={`orbit${winner ? ' is-winner' : ''}${hot ? ' orbit--hot' : ''}`} aria-label={name}>
      <div className="orbit__ring">
        <svg viewBox="0 0 200 200" aria-hidden="true">
          <circle className="orbit__track" cx="100" cy="100" r="90" />
          {/* Left out at zero: a round cap alone would draw a dot. */}
          {percent(done) > 0 && <circle className="orbit__fill" cx="100" cy="100" r="90" pathLength={100} strokeDasharray={`${percent(done)} 100`} />}
        </svg>
        <div className="orbit__center">
          <span className="orbit__name">
            {starter && <i className="dot" aria-hidden="true" />}
            {name}
            {starter && <span className="sr-only">, {t('legStarter')}</span>}
          </span>
          {/* Keyed on the value so each change pops in. */}
          <span key={String(value)} className="orbit__score">{value}</span>
          {meta && <span className="orbit__meta">{meta}</span>}
          {extra}
        </div>
      </div>
      {/* Says who is up and their figure after every dart and turn change. */}
      <span className="sr-only" role="status">{typeof value === 'string' || typeof value === 'number' ? `${name}, ${value}` : name}</span>
    </section>
  )
}

export interface Rival {
  name: string
  value: ReactNode
  /** Fills the bar, from 0 to 1; no bar when left out. */
  done?: number
  meta?: ReactNode
  extra?: ReactNode
  starter?: boolean
  winner?: boolean
  /** Out of the game: dimmed. */
  out?: boolean
}

/** The other sides, compact. */
export function Rivals({ rivals }: { rivals: Rival[] }) {
  const { t } = useI18n()
  if (rivals.length === 0) return null
  return (
    <section className="rivals">
      {rivals.map((r, i) => (
        <article key={i} className={`rival${r.winner ? ' is-winner' : ''}${r.out ? ' is-out' : ''}`}>
          <div className="rival__row">
            <span className="rival__name">
              {r.starter && <i className="dot" aria-hidden="true" />}
              {r.name}
              {r.starter && <span className="sr-only">, {t('legStarter')}</span>}
            </span>
            <span className="rival__score">{r.value}</span>
          </div>
          {r.done !== undefined && (
            <div className="rival__bar" aria-hidden="true">
              <i style={{ width: `${percent(r.done)}%` }} />
            </div>
          )}
          {r.extra}
          {r.meta && <span className="rival__legs">{r.meta}</span>}
        </article>
      ))}
    </section>
  )
}

/** The side the ring follows: the winner once there is one, else the side to throw. */
export function shownSide(winner: number | null, current: number): number {
  return winner ?? current
}
