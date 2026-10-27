import { useCallback, useEffect, useState } from 'react'
import { leaveMatch, newCurrentMatch, progress, resumeMatch, saveProgress } from './application/match-persistence'
import type { CurrentMatch, MatchRepository } from './application/match-repository'
import { rematch as dealRematch, type MatchSetup } from './application/match-setup'
import type { Dart } from './domain'
import { requestPersistentStorage } from './infrastructure/persistent-storage'
import { loadLastSetup, saveLastSetup } from './infrastructure/preferences'
import { GameScreen } from './ui/GameScreen'
import { I18nProvider } from './ui/i18n'
import { viewFor } from './ui/registry'
import { Setup } from './ui/Setup'

/** Saving is best effort: the match goes on if storage fails. */
const warn = (error: unknown) => console.warn('Could not save the match', error)

export function App({ repository }: { repository: MatchRepository }) {
  const [current, setCurrent] = useState<CurrentMatch | null>(null)
  const [resuming, setResuming] = useState(true)
  const [last, setLast] = useState<MatchSetup | undefined>(() => loadLastSetup())

  // Pick up the match in progress after a refresh.
  useEffect(() => {
    let active = true
    resumeMatch(repository)
      .then((match) => active && match && setCurrent(match))
      .catch(warn)
      .finally(() => active && setResuming(false))
    return () => void (active = false)
  }, [repository])

  const start = (setup: MatchSetup) => {
    const match = newCurrentMatch(setup)
    setCurrent(match)
    setLast(setup)
    saveLastSetup(setup)
    requestPersistentStorage()
    repository.saveCurrent(match).catch(warn)
  }

  const record = useCallback(
    (darts: readonly Dart[]) => {
      if (!current) return
      const next = progress(current, darts)
      saveProgress(repository, next.match, next.outcome).catch(warn)
    },
    [current, repository],
  )

  // The finished match is already in the history; a rematch is a new match.
  const rematch = () => current && start(dealRematch(current.setup))
  const exit = () => {
    leaveMatch(repository).catch(warn)
    setCurrent(null)
  }

  return (
    <I18nProvider>
      {resuming ? null : !current ? (
        <Setup initial={last} onStart={start} />
      ) : (
        <GameScreen
          key={current.id}
          view={viewFor(current.setup)}
          setup={current.setup}
          initialDarts={current.darts}
          onProgress={record}
          onRematch={rematch}
          onExit={exit}
        />
      )}
    </I18nProvider>
  )
}
