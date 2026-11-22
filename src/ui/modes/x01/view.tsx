import type { X01Record, X01Stats } from '../../../application/modes'
import { x01 } from '../../../domain'
import { useI18n, type Key } from '../../i18n'
import type { ModeView, ViewProps } from '../types'

function useX01View({ setup, sides, state: match, events }: ViewProps<'x01'>) {
  const { t } = useI18n()
  const { config } = setup
  const finished = match.status === 'finished'
  const current = match.players[match.currentPlayer]!
  const dartsLeft = 3 - match.turnDarts.length
  // The highest finish: 170 on double out (T20 T20 Bull), 180 on single out (three T20).
  const hint = !finished && current.in && current.remaining <= (config.doubleOut ? 170 : 180)
    ? x01.checkout(current.remaining, config.doubleOut, dartsLeft)
    : null
  const busted = events.some((e) => e.type === 'Bust')

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
      <>
        {(() => {
          // The ring follows the player to throw, or the winner once the match is over.
          const shown = match.winner ?? match.currentPlayer
          const p = match.players[shown]!
          const done = Math.min(100, Math.max(0, (1 - p.remaining / config.startScore) * 100))
          return (
            <section className={`orbit${match.winner === shown ? ' is-winner' : ''}`} aria-label={sides[shown]}>
              <div className="orbit__ring">
                <svg viewBox="0 0 200 200" aria-hidden="true">
                  <circle className="orbit__track" cx="100" cy="100" r="90" />
                  <circle className="orbit__fill" cx="100" cy="100" r="90" pathLength={100} strokeDasharray={`${done} 100`} />
                </svg>
                <div className="orbit__center">
                  <span className="orbit__name">
                    {match.legStarter === shown && <i className="dot" title="leg starter" />}
                    {sides[shown]}
                  </span>
                  <span key={p.remaining} className="orbit__score">{p.remaining}</span>
                  <span className="orbit__meta">
                    <span>{t('avg')} <b>{x01.threeDartAverage(p).toFixed(1)}</b></span>
                    {showLegs && (
                      <span>
                        {showSets && <>{t('set')} <b>{p.sets}</b> · </>}
                        {t('leg')} <b>{p.legs}</b>
                      </span>
                    )}
                  </span>
                </div>
              </div>
            </section>
          )
        })()}
        {match.players.length > 1 && (
          <section className="rivals">
            {match.players.map((p, i) => i === (match.winner ?? match.currentPlayer) ? null : (
              <article key={i} className={`rival${match.winner === i ? ' is-winner' : ''}`}>
                <div className="rival__row">
                  <span className="rival__name">
                    {match.legStarter === i && <i className="dot" title="leg starter" />}
                    {sides[i]}
                  </span>
                  <span className="rival__score">{p.remaining}</span>
                </div>
                <div className="rival__bar" aria-hidden="true">
                  <i style={{ width: `${Math.min(100, Math.max(0, (1 - p.remaining / config.startScore) * 100))}%` }} />
                </div>
                {showLegs && (
                  <span className="rival__legs">
                    {showSets && <>{t('set')} {p.sets} · </>}
                    {t('leg')} {p.legs}
                  </span>
                )}
              </article>
            ))}
          </section>
        )}
      </>
    ),
    turnExtras: (
      <>
        {/* The route itself fills the empty dart slots. */}
        {hint && <span className="chip chip--checkout">{t('checkout')}</span>}
        {!current.in && <span className="chip">{t('notIn')}</span>}
      </>
    ),
    // The dart to throw now; the chip shows the rest of the route.
    aim: hint ? hint.slice(0, 1) : undefined,
    plan: hint ?? undefined,
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
