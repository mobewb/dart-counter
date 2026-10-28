import type { MatchSetup } from '../../../application/match-setup'
import type { PlayerStats } from '../../../application/match-stats'
import { clock } from '../../../domain'
import { useI18n, type Key } from '../../i18n'
import type { ModeView, ViewProps } from '../types'

type ClockSetup = Extract<MatchSetup, { mode: 'clock' }>

const label = (target: number) => (target === 25 ? 'B' : String(target))

function useClockView({ sides, state: match }: ViewProps<ClockSetup, clock.ClockMatch>) {
  const { t } = useI18n()
  const finished = match.status === 'finished'
  const steps = match.config.sequence.length
  const current = clock.targetOf(match, match.currentPlayer)

  return {
    info: <strong>{t('clock')}</strong>,
    board: (
      <section className="players" data-count={match.players.length}>
        {match.players.map((p, i) => {
          const next = clock.targetOf(match, i)
          return (
            <article key={i} className={`pcard${i === match.currentPlayer && !finished ? ' is-active' : ''}${match.winner === i ? ' is-winner' : ''}`}>
              <div className="pcard__name">{sides[i]}</div>
              <div className="pcard__score">{next === null ? '✓' : label(next)}</div>
              <div className="clock-progress" role="progressbar" aria-valuemin={0} aria-valuemax={steps} aria-valuenow={p.progress}>
                <i style={{ width: `${(p.progress / steps) * 100}%` }} />
              </div>
              <div className="pcard__meta">
                <span>{p.progress} / {steps}</span>
              </div>
            </article>
          )
        })}
      </section>
    ),
    turnExtras: current !== null && !finished && (
      <span className="chip chip--checkout">
        {t('aimAt')} <b>{current === 25 ? t('bull') : current}</b>
      </span>
    ),
    // Only the current target counts, so everything else is faded.
    targets: current === null ? [] : [current],
  }
}

function clockDetails(stats: PlayerStats, t: (key: Key) => string): string[] {
  if (stats.kind !== 'clock') return []
  return [`${t('hitRate')} ${Math.round(stats.hitRate * 100)}%`]
}

export const clockView: ModeView<ClockSetup, clock.ClockMatch> = {
  rules: clock.mode,
  label: 'clock',
  hint: 'clockHint',
  result: { label: 'targetsHit', format: String },
  useView: useClockView,
  details: clockDetails,
}
