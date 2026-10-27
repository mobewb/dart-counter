import { useState } from 'react'
import { rematch as dealRematch, type MatchSetup } from './application/match-setup'
import { GameScreen } from './ui/GameScreen'
import { I18nProvider } from './ui/i18n'
import { viewFor } from './ui/registry'
import { Setup } from './ui/Setup'

export function App() {
  const [setup, setSetup] = useState<MatchSetup | null>(null)
  const [last, setLast] = useState<MatchSetup | undefined>()
  const [round, setRound] = useState(0)

  const start = (s: MatchSetup) => {
    setSetup(s)
    setLast(s)
  }

  const rematch = () => {
    if (setup) start(dealRematch(setup))
    setRound((r) => r + 1)
  }
  const exit = () => setSetup(null)

  return (
    <I18nProvider>
      {!setup ? (
        <Setup initial={last} onStart={start} />
      ) : (
        <GameScreen key={round} view={viewFor(setup)} setup={setup} onRematch={rematch} onExit={exit} />
      )}
    </I18nProvider>
  )
}
