import { useState } from 'react'
import { rematch as dealRematch, type MatchSetup } from './application/match-setup'
import { CricketGame } from './ui/CricketGame'
import { Game } from './ui/Game'
import { I18nProvider } from './ui/i18n'
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
      ) : setup.mode === 'x01' ? (
        <Game key={round} setup={setup} onRematch={rematch} onExit={exit} />
      ) : (
        <CricketGame key={round} setup={setup} onRematch={rematch} onExit={exit} />
      )}
    </I18nProvider>
  )
}
