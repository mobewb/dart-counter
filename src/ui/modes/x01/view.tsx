import { useEffect } from 'react'
import type { MatchSetup } from '../../../application/match-setup'
import { x01 } from '../../../domain'
import { dartLabel } from '../../dartLabel'
import { useI18n } from '../../i18n'
import type { ModeView, ViewProps } from '../types'

type X01Setup = Extract<MatchSetup, { mode: 'x01' }>

function useX01View({ setup, sides, state: match, events }: ViewProps<X01Setup, x01.X01Match>) {
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

export const x01View: ModeView<X01Setup, x01.X01Match> = {
  rules: x01.mode,
  label: 'x01',
  keepAwake: true,
  result: { label: 'avg', format: (value) => value.toFixed(1) },
  useView: useX01View,
}
