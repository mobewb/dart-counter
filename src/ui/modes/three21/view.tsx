import type { MatchSetup } from '../../../application/match-setup'
import type { PlayerStats } from '../../../application/match-stats'
import { three21 } from '../../../domain'
import { useI18n, type Key } from '../../i18n'
import type { ModeView, ViewProps } from '../types'

type Three21Setup = Extract<MatchSetup, { mode: 'three21' }>

function useThree21View({ sides, state: match, events }: ViewProps<Three21Setup, three21.Three21Match>) {
  const { t } = useI18n()
  const finished = match.status === 'finished'
  const bounced = events.some((e) => e.type === 'Bounced')
  const knocked = events.flatMap((e) => (e.type === 'KnockedBack' ? e.players : []))

  return {
    info: <strong>{t('three21')}</strong>,
    board: (
      <section className="players" data-count={match.players.length}>
        {match.players.map((p, i) => (
          <article key={i} className={`pcard${i === match.currentPlayer && !finished ? ' is-active' : ''}${match.winner === i ? ' is-winner' : ''}`}>
            <div className="pcard__name">{sides[i]}</div>
            <div className="pcard__score">{p.score}</div>
            <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={three21.TARGET} aria-valuenow={p.score}>
              <i style={{ width: `${(p.score / three21.TARGET) * 100}%` }} />
            </div>
            <div className="pcard__meta">
              <span><b>{three21.TARGET - p.score}</b> {t('toGo')}</span>
            </div>
          </article>
        ))}
      </section>
    ),
    afterTurn: (bounced || knocked.length > 0) && (
      <>
        {bounced && (
          <div className="bust" role="status">
            <strong>{t('bounce')}</strong> {t('bounceHint')}
          </div>
        )}
        {knocked.length > 0 && (
          <div className="bust" role="status">
            <strong>{t('knockedBack')}</strong> {t('knockedBackHint').replace('{name}', knocked.map((i) => sides[i]).join(', '))}
          </div>
        )}
      </>
    ),
  }
}

function three21Details(stats: PlayerStats, t: (key: Key) => string): string[] {
  if (stats.kind !== 'three21') return []
  return [`${t('knockBacks')} ${stats.knockBacks}`]
}

export const three21View: ModeView<Three21Setup, three21.Three21Match> = {
  rules: three21.mode,
  label: 'three21',
  hint: 'three21Hint',
  result: { label: 'score', format: String },
  useView: useThree21View,
  details: three21Details,
}
