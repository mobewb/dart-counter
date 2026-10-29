import type { MatchSetup } from '../../../application/match-setup'
import type { PlayerStats } from '../../../application/match-stats'
import { killer } from '../../../domain'
import { useI18n, type Key } from '../../i18n'
import type { ModeView, ViewProps } from '../types'

type KillerSetup = Extract<MatchSetup, { mode: 'killer' }>

function useKillerView({ sides, state: match }: ViewProps<KillerSetup, killer.KillerMatch>) {
  const { t } = useI18n()
  const finished = match.status === 'finished'
  const drawing = match.phase === 'draw'
  const me = match.players[match.currentPlayer]!
  // A killer aims at every number still in play, its own included; others only at their own double.
  const targets = drawing
    ? killer.freeNumbers(match)
    : me.killer
      ? match.players.flatMap((p) => (killer.isAlive(p) && p.number !== null ? [p.number] : []))
      : [me.number!]
  // The opponents a killer can take a life from.
  const marked = !drawing && me.killer ? targets.filter((n) => n !== me.number) : []

  return {
    info: <strong>{t('killer')}</strong>,
    board: (
      <section className="players" data-count={match.players.length}>
        {match.players.map((p, i) => (
          <article
            key={i}
            className={`pcard${i === match.currentPlayer && !finished ? ' is-active' : ''}${match.winner === i ? ' is-winner' : ''}${killer.isAlive(p) ? '' : ' is-out'}`}
          >
            <div className="pcard__name">{sides[i]}</div>
            <div className="pcard__score">{p.number ?? '?'}</div>
            <div className="killer-lives" aria-label={`${p.lives} ${t('lives')}`}>
              {Array.from({ length: match.config.lives }, (_, life) => (
                <i key={life} className={life < p.lives ? 'is-on' : ''} />
              ))}
            </div>
            <div className="pcard__meta">
              {!killer.isAlive(p) ? <span>{t('out')}</span> : p.killer ? <b className="killer-badge">{t('killerBadge')}</b> : <span>{t('notKiller')}</span>}
            </div>
          </article>
        ))}
      </section>
    ),
    turnExtras: !finished && (
      <span className="chip chip--checkout">
        {drawing ? t('drawNumber') : me.killer ? t('killerAim') : <>{t('aimAt')} <b>D{me.number}</b></>}
      </span>
    ),
    targets,
    marked,
  }
}

function killerDetails(stats: PlayerStats, t: (key: Key) => string): string[] {
  if (stats.kind !== 'killer') return []
  return [`${t('knockouts')} ${stats.eliminations}`]
}

export const killerView: ModeView<KillerSetup, killer.KillerMatch> = {
  rules: killer.mode,
  label: 'killer',
  hint: 'killerHint',
  minSides: 2,
  result: { label: 'livesTaken', format: String },
  useView: useKillerView,
  details: killerDetails,
}
