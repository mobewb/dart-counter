import { useEffect, useMemo, useState } from 'react'
import { ACHIEVEMENTS, playerAchievements, type PlayerAchievements } from '../application/achievements'
import { deleteFromHistory, loadHistory, playerRecords, type PlayerRecord } from '../application/history'
import type { FinishedMatch, MatchRepository } from '../application/match-repository'
import { sideNames } from '../application/match-setup'
import type { FamilyId } from '../application/modes'
import { achievementCopy, EGGS, eggCopy } from './achievement-copy'
import { useCelebrate } from './celebrate'
import { ConfirmDialog } from './ConfirmDialog'
import { useI18n, type Key } from './i18n'
import { recordChips, registry } from './registry'
import { SegControl } from './SegControl'

interface Props {
  repository: MatchRepository
  onBack: () => void
}

/** The chips of one rule family's record, if the player has played it. */
function familyChips<F extends FamilyId>(family: F, record: PlayerRecord, t: (key: Key) => string): string[] {
  const played = record.modes[family]
  return played ? recordChips[family](played, t) : []
}

function PlayerCard({ record }: { record: PlayerRecord }) {
  const { t } = useI18n()
  const families = Object.keys(recordChips) as FamilyId[]
  const chips = families.flatMap((family) => familyChips(family, record, t))
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

function Badge({ icon, name, how, earned, at }: { icon: string; name: string; how: string; earned: boolean; at?: number }) {
  const { lang } = useI18n()
  const when = at ? new Date(at).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-GB', { dateStyle: 'medium' }) : undefined
  return (
    <li className={`badge${earned ? ' is-earned' : ''}`}>
      <span className="badge__icon" aria-hidden="true">{icon}</span>
      <span className="badge__text">
        <b>{name}</b>
        <small>{how}{when && ` · ${when}`}</small>
      </span>
    </li>
  )
}

function AchievementsCard({ player }: { player: PlayerAchievements }) {
  const { t, lang } = useI18n()
  // Secrets show only once earned.
  const shown = ACHIEVEMENTS.filter((a) => !a.secret || player.unlocked.has(a.id))
  const hidden = ACHIEVEMENTS.length - shown.length
  return (
    <article className="hcard">
      <div className="hcard__head">
        <strong>{player.name}</strong>
        <span><b>{player.unlocked.size}</b> / {ACHIEVEMENTS.length}</span>
      </div>
      <div className="progress" aria-hidden="true"><i style={{ width: `${(player.unlocked.size / ACHIEVEMENTS.length) * 100}%` }} /></div>
      <ul className="badges">
        {shown.map(({ id }) => {
          const { icon, name, how } = achievementCopy[id]
          return <Badge key={id} icon={icon} name={name[lang]} how={how[lang]} earned={player.unlocked.has(id)} at={player.unlocked.get(id)} />
        })}
        {Array.from({ length: hidden }, (_, i) => <Badge key={`secret-${i}`} icon="❔" name={t('secret')} how={t('secretHint')} earned={false} />)}
      </ul>
    </article>
  )
}

function EggsCard() {
  const { t, lang } = useI18n()
  const { eggs } = useCelebrate()
  return (
    <article className="hcard">
      <div className="hcard__head">
        <strong>{t('easterEggs')}</strong>
        <span><b>{eggs.size}</b> / {EGGS.length}</span>
      </div>
      <p className="hint">{t('eggsHint')}</p>
      <ul className="badges">
        {EGGS.map((egg) => eggs.has(egg)
          ? <Badge key={egg} icon={eggCopy[egg].icon} name={eggCopy[egg].name[lang]} how={eggCopy[egg].how[lang]} earned />
          : <Badge key={egg} icon="🥚" name="???" how={t('secretHint')} earned={false} />)}
      </ul>
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
        <button className="hcard__delete" onClick={onDelete} aria-label={t('deleteMatch')}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
          </svg>
        </button>
      </div>
      <ul className="hcard__sides">
        {sides.map((name, i) => (
          <li key={i} className={i === match.winner ? 'is-winner' : ''}>
            <span>{name}{i === match.winner && <span className="sr-only">, {t('winner')}</span>}</span>
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
  const [tab, setTab] = useState<'players' | 'achievements' | 'matches'>('players')
  // The match waiting for the delete to be confirmed.
  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => {
    loadHistory(repository).then(setMatches, () => setMatches([]))
  }, [repository])

  const records = useMemo(() => playerRecords(matches ?? []), [matches])
  const achievements = useMemo(() => playerAchievements(matches ?? []), [matches])

  const remove = (id: string) => {
    setDeleting(null)
    deleteFromHistory(repository, id)
      .then(() => setMatches((list) => list?.filter((m) => m.id !== id) ?? null))
      .catch((error) => console.warn('Could not delete the match', error))
  }

  return (
    <main className="screen history">
      <header className="topbar">
        <button className="ghost" onClick={onBack} aria-label={t('back')}>←<span className="label"> {t('back')}</span></button>
        <h1 className="topbar__info"><strong>{t('history')}</strong></h1>
        <span />
      </header>

      <SegControl
        label={t('history')}
        options={[{ value: 'players' as const, label: t('players') }, { value: 'achievements' as const, label: t('achievements') }, { value: 'matches' as const, label: t('matches') }]}
        value={tab}
        onChange={setTab}
      />

      {matches === null ? null : tab === 'achievements' ? (
        <>
          {achievements.length === 0 && <p className="hint history__empty">{t('noAchievements')}</p>}
          {achievements.map((player) => <AchievementsCard key={player.name.toLocaleLowerCase()} player={player} />)}
          <EggsCard />
        </>
      ) : matches.length === 0 ? (
        <p className="hint history__empty">{t('noHistory')}</p>
      ) : tab === 'players' ? (
        records.map((record) => <PlayerCard key={record.name.toLocaleLowerCase()} record={record} />)
      ) : (
        matches.map((match) => <MatchCard key={match.id} match={match} onDelete={() => setDeleting(match.id)} />)
      )}

      <ConfirmDialog
        open={deleting !== null}
        title={t('confirmDelete')}
        confirmLabel={t('delete')}
        cancelLabel={t('cancel')}
        danger
        onConfirm={() => deleting !== null && remove(deleting)}
        onCancel={() => setDeleting(null)}
      />
    </main>
  )
}
