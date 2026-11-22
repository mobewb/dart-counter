import type { KillerRecord, KillerStats } from '../../../application/modes'
import { killer } from '../../../domain'
import { useI18n, type Key } from '../../i18n'
import { Orbit, Rivals, shownSide } from '../Orbit'
import type { ModeView, ViewProps } from '../types'

function useKillerView({ sides, state: match }: ViewProps<'killer'>) {
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
    board: (() => {
      const shown = shownSide(match.winner, match.currentPlayer)
      const lives = (p: typeof me) => (
        <div className="killer-lives" aria-label={`${p.lives} ${t('lives')}`}>
          {Array.from({ length: match.config.lives }, (_, life) => (
            <i key={life} className={life < p.lives ? 'is-on' : ''} />
          ))}
        </div>
      )
      const status = (p: typeof me) => (!killer.isAlive(p) ? t('out') : p.killer ? <b className="killer-badge">{t('killerBadge')}</b> : t('notKiller'))
      const p = match.players[shown]!
      return (
        <>
          <Orbit
            name={sides[shown]!}
            value={p.number ?? '?'}
            done={p.lives / match.config.lives}
            hot
            winner={match.winner === shown}
            meta={<span>{status(p)}</span>}
            extra={lives(p)}
          />
          <Rivals
            rivals={match.players.flatMap((q, i) => i === shown ? [] : [{
              name: sides[i]!,
              value: q.number ?? '?',
              winner: match.winner === i,
              out: !killer.isAlive(q),
              extra: lives(q),
              meta: status(q),
            }])}
          />
        </>
      )
    })(),
    turnExtras: !finished && (
      <span className="chip chip--checkout">
        {drawing ? t('drawNumber') : me.killer ? t('killerAim') : <>{t('aimAt')} <b>D{me.number}</b></>}
      </span>
    ),
    targets,
    marked,
  }
}

function killerDetails(stats: KillerStats, t: (key: Key) => string): string[] {
  return [`${t('knockouts')} ${stats.eliminations}`]
}

export function killerRecordChips(record: KillerRecord, t: (key: Key) => string): string[] {
  return [`${t('killer')} ${t('knockouts')} ${record.eliminations}`]
}

export const killerView: ModeView<'killer'> = {
  label: 'killer',
  hint: 'killerHint',
  result: { label: 'livesTaken', format: String },
  useView: useKillerView,
  details: killerDetails,
}
