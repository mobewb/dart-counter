import { useEffect } from 'react'
import type { X01Record, X01Stats } from '../../../application/modes'
import { x01 } from '../../../domain'
import { dartLabel } from '../../dartLabel'
import { useI18n, type Key } from '../../i18n'
import type { ModeView, ViewProps } from '../types'

function useX01View({ setup, sides, state: match, events }: ViewProps<'x01'>) {
  const { t } = useI18n()
  const { config } = setup
  const finished = match.status === 'finished'
  const current = match.players[match.currentPlayer]!
  const dartsLeft = 3 - match.turnDarts.length
  const hint = !finished && current.in && current.remaining <= 170
    ? x01.checkout(current.remaining, config.doubleOut, dartsLeft)
    : null
  const busted = events.some((e) => e.type === 'Bust')

  // Keep the active player in view on small screens.
  useEffect(() => {
    document.querySelector('.pcard.is-active')?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' })
  }, [match.currentPlayer])

  const showLegs = config.legsToWinSet > 1 || config.setsToWinMatch > 1
  const showSets = config.setsToWinMatch > 1

  return {
    info: (
      <>
        <strong>{config.startScore}</strong>
        <span>{config.doubleIn ? 'DI · ' : ''}{config.doubleOut ? 'DO' : 'SO'}</span>
        {showLegs && <span>· {t('firstTo')} {config.legsToWinSet}{showSets ? ` / ${config.setsToWinMatch}` : ''}</span>}
      </>
    ),
    board: (
      <section className="players" data-count={match.players.length}>
        {match.players.map((p, i) => (
          <article key={i} className={`pcard${i === match.currentPlayer && !finished ? ' is-active' : ''}${match.winner === i ? ' is-winner' : ''}`}>
            <div className="pcard__name">
              {match.legStarter === i && <i className="dot" title="leg starter" />}
              {sides[i]}
            </div>
            <div className="pcard__score">{p.remaining}</div>
            <div className="pcard__meta">
              {showLegs && (
                <span>
                  {showSets && <>{t('set')} <b>{p.sets}</b> · </>}
                  {t('leg')} <b>{p.legs}</b>
                </span>
              )}
              <span>{t('avg')} <b>{x01.threeDartAverage(p).toFixed(1)}</b></span>
            </div>
          </article>
        ))}
      </section>
    ),
    turnExtras: (
      <>
        {hint && (
          <span className="chip chip--checkout">
            {t('checkout')} <b>{hint.map((d) => dartLabel(d)).join(' · ')}</b>
          </span>
        )}
        {!current.in && <span className="chip">{t('notIn')}</span>}
      </>
    ),
    afterTurn: busted && (
      <div className="bust" role="status">
        <strong>{t('bust')}</strong> {t('bustHint')}
      </div>
    ),
  }
}

function x01Details(stats: X01Stats, t: (key: Key) => string): string[] {
  const { firstNine, highestVisit, tons, tonForties, oneEighties, checkoutDarts, checkouts, bestLeg } = stats
  return [
    `${t('firstNine')} ${firstNine.toFixed(1)}`,
    `${t('highest')} ${highestVisit}`,
    oneEighties > 0 && `180 ×${oneEighties}`,
    tonForties > 0 && `140+ ×${tonForties}`,
    tons > 0 && `100+ ×${tons}`,
    checkoutDarts ? `${t('checkout')} ${Math.round((checkouts / checkoutDarts) * 100)}% (${checkouts}/${checkoutDarts})` : false,
    bestLeg !== null && `${t('bestLeg')} ${bestLeg} ${t('darts').toLowerCase()}`,
  ].filter((chip): chip is string => Boolean(chip))
}

export function x01RecordChips(record: X01Record, t: (key: Key) => string): string[] {
  return [
    `X01 ${t('avg')} ${record.average.toFixed(1)}`,
    record.highestVisit > 0 && `${t('highest')} ${record.highestVisit}`,
    record.oneEighties > 0 && `180 ×${record.oneEighties}`,
    record.checkoutDarts > 0 && `${t('checkout')} ${Math.round((record.checkouts / record.checkoutDarts) * 100)}%`,
    record.highestCheckout > 0 && `${t('highCheckout')} ${record.highestCheckout}`,
    record.bestLeg !== null && `${t('bestLeg')} ${record.bestLeg}`,
  ].filter((chip): chip is string => Boolean(chip))
}

export const x01View: ModeView<'x01'> = {
  label: 'x01',
  keepAwake: true,
  result: { label: 'avg', format: (value) => value.toFixed(1) },
  useView: useX01View,
  details: x01Details,
}
