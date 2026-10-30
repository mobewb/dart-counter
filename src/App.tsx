import { useCallback, useEffect, useState } from 'react'
import type { Match } from './application/match'
import { leaveMatch, newCurrentMatch, resumeMatch, saveProgress } from './application/match-persistence'
import type { CurrentMatch, MatchRepository } from './application/match-repository'
import { rematch as dealRematch } from './application/match-setup'
import type { MatchSetup } from './application/modes'
import { requestPersistentStorage } from './infrastructure/persistent-storage'
import { loadLastSetup, loadSettings, saveLastSetup, saveSettings, type Settings } from './infrastructure/preferences'
import { GameScreen } from './ui/GameScreen'
import { History } from './ui/History'
import { I18nProvider } from './ui/i18n'
import { Setup } from './ui/Setup'

/** Saving is best effort: the match goes on if storage fails. */
const warn = (error: unknown) => console.warn('Could not save the match', error)

export function App({ repository }: { repository: MatchRepository }) {
  const [current, setCurrent] = useState<CurrentMatch | null>(null)
  const [resuming, setResuming] = useState(true)
  const [showHistory, setShowHistory] = useState(false)
  const [last, setLast] = useState<MatchSetup | undefined>(() => loadLastSetup())
  const [settings, setSettings] = useState<Settings>(() => loadSettings())
  const changeSettings = (next: Settings) => {
    setSettings(next)
    saveSettings(next)
  }

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
    (match: Match) => {
      if (current) saveProgress(repository, current, match).catch(warn)
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
      {resuming ? null : showHistory && !current ? (
        <History repository={repository} onBack={() => setShowHistory(false)} />
      ) : !current ? (
        <Setup initial={last} onStart={start} onHistory={() => setShowHistory(true)} settings={settings} onSettings={changeSettings} />
      ) : (
        <GameScreen
          key={current.id}
          setup={current.setup}
          initialDarts={current.darts}
          onProgress={record}
          settings={settings}
          onRematch={rematch}
          onExit={exit}
        />
      )}
    </I18nProvider>
  )
}
