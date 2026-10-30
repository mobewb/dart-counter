import { useEffect, useMemo, useState } from 'react'
import { deleteFromHistory, loadHistory, playerRecords, type PlayerRecord } from '../application/history'
import type { FinishedMatch, MatchRepository } from '../application/match-repository'
import { sideNames } from '../application/sides'
import { useI18n } from './i18n'
import { registry } from './registry'

interface Props {
  repository: MatchRepository
  onBack: () => void
}

function PlayerCard({ record }: { record: PlayerRecord }) {
  const { t } = useI18n()
  const { x01, cricket } = record
  const chips = [
    x01.matches > 0 && `X01 ${t('avg')} ${x01.average.toFixed(1)}`,
    x01.highestVisit > 0 && `${t('highest')} ${x01.highestVisit}`,
    x01.oneEighties > 0 && `180 ×${x01.oneEighties}`,
    x01.checkoutDarts > 0 && `${t('checkout')} ${Math.round((x01.checkouts / x01.checkoutDarts) * 100)}%`,
    x01.highestCheckout > 0 && `${t('highCheckout')} ${x01.highestCheckout}`,
    x01.bestLeg !== null && `${t('bestLeg')} ${x01.bestLeg}`,
    cricket.matches > 0 && `MPR ${cricket.marksPerRound.toFixed(2)}`,
    record.clock.matches > 0 && `${t('clock')} ${Math.round(record.clock.hitRate * 100)}%`,
    record.three21.matches > 0 && `321 ${t('knockBacks')} ${record.three21.knockBacks}`,
  ].filter((chip): chip is string => Boolean(chip))
  return (
    <article className="hcard">
      <div className="hcard__head">
        <strong>{record.name}</strong>
        <span>
          <b>{record.wins}</b> / {record.matches} {t('won')}
        </span>
      </div>
      <div className="statline">{chips.map((chip) => <span key={chip}>{chip}</span>)}</div>
    </article>
  )
}

function MatchCard({ match, onDelete }: { match: FinishedMatch; onDelete: () => void }) {
  const { t, lang } = useI18n()
  const view = registry[match.setup.mode]
  const sides = sideNames(match.setup)
  const when = new Date(match.finishedAt).toLocaleString(lang === 'fr' ? 'fr-FR' : 'en-GB', { dateStyle: 'medium', timeStyle: 'short' })
  const variant = match.setup.mode === 'x01' ? ` ${match.setup.config.startScore}` : ''
  return (
    <article className="hcard">
      <div className="hcard__head">
        <strong>{t(view.label)}{variant}</strong>
        <span>{when}</span>
        <button className="hcard__delete" onClick={onDelete} aria-label={t('deleteMatch')}>🗑</button>
      </div>
      <ul className="hcard__sides">
        {sides.map((name, i) => (
          <li key={i} className={i === match.winner ? 'is-winner' : ''}>
            <span>{i === match.winner ? '🏆 ' : ''}{name}</span>
            <b>{view.result.format(match.results[i]?.value ?? 0)}</b>
          </li>
        ))}
      </ul>
    </article>
  )
}

export function History({ repository, onBack }: Props) {
  const { t } = useI18n()
  const [matches, setMatches] = useState<FinishedMatch[] | null>(null)
  const [tab, setTab] = useState<'players' | 'matches'>('players')

  useEffect(() => {
    loadHistory(repository).then(setMatches, () => setMatches([]))
  }, [repository])

  const records = useMemo(() => playerRecords(matches ?? []), [matches])

  const remove = (id: string) => {
    if (!window.confirm(t('confirmDelete'))) return
    deleteFromHistory(repository, id)
      .then(() => setMatches((list) => list?.filter((m) => m.id !== id) ?? null))
      .catch((error) => console.warn('Could not delete the match', error))
  }

  return (
    <main className="screen history">
      <header className="topbar">
        <button className="ghost" onClick={onBack} aria-label={t('back')}>←<span className="label"> {t('back')}</span></button>
        <div className="topbar__info"><strong>{t('history')}</strong></div>
        <span />
      </header>

      <div className="seg-control">
        <button className={tab === 'players' ? 'is-active' : ''} onClick={() => setTab('players')}>{t('players')}</button>
        <button className={tab === 'matches' ? 'is-active' : ''} onClick={() => setTab('matches')}>{t('matches')}</button>
      </div>

      {matches === null ? null : matches.length === 0 ? (
        <p className="hint history__empty">{t('noHistory')}</p>
      ) : tab === 'players' ? (
        records.map((record) => <PlayerCard key={record.name.toLocaleLowerCase()} record={record} />)
      ) : (
        matches.map((match) => <MatchCard key={match.id} match={match} onDelete={() => remove(match.id)} />)
      )}
    </main>
  )
}
