import type { ClockRecord, ClockStats } from '../../../application/modes'
import { clock } from '../../../domain'
import { useI18n, type Key } from '../../i18n'
import { Orbit, Rivals, shownSide } from '../Orbit'
import type { ModeView, ViewProps } from '../types'

const label = (target: number) => (target === 25 ? 'B' : String(target))

function useClockView({ sides, state: match }: ViewProps<'clock'>) {
  const { t } = useI18n()
  const finished = match.status === 'finished'
  const steps = match.config.sequence.length
  const current = clock.targetOf(match, match.currentPlayer)

  return {
    info: <strong>{t('clock')}</strong>,
    board: (() => {
      const shown = shownSide(match.winner, match.currentPlayer)
      const value = (i: number) => {
        const next = clock.targetOf(match, i)
        return next === null ? '✓' : label(next)
      }
      return (
        <>
          <Orbit
            name={sides[shown]!}
            value={value(shown)}
            done={match.players[shown]!.progress / steps}
            winner={match.winner === shown}
            meta={<span><b>{match.players[shown]!.progress}</b> / {steps}</span>}
          />
          <Rivals
            rivals={match.players.flatMap((p, i) => i === shown ? [] : [{
              name: sides[i]!,
              value: value(i),
              done: p.progress / steps,
              winner: match.winner === i,
              meta: `${p.progress} / ${steps}`,
            }])}
          />
        </>
      )
    })(),
    turnExtras: current !== null && !finished && (
      <span className="chip chip--checkout">
        {t('aimAt')} <b>{current === 25 ? t('bull') : current}</b>
      </span>
    ),
    // Only the current target counts, so everything else is faded.
    targets: current === null ? [] : [current],
  }
}

function clockDetails(stats: ClockStats, t: (key: Key) => string): string[] {
  return [`${t('hitRate')} ${Math.round(stats.hitRate * 100)}%`]
}

export function clockRecordChips(record: ClockRecord, t: (key: Key) => string): string[] {
  return [`${t('clock')} ${Math.round(record.hitRate * 100)}%`]
}

export const clockView: ModeView<'clock'> = {
  label: 'clock',
  hint: 'clockHint',
  result: { label: 'targetsHit', format: String },
  useView: useClockView,
  details: clockDetails,
}
