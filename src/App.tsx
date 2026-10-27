import { useState } from 'react'
import { Game } from './ui/Game'
import { I18nProvider } from './ui/i18n'
import { Setup, type MatchSetup } from './ui/Setup'

export function App() {
  const [setup, setSetup] = useState<MatchSetup | null>(null)
  const [last, setLast] = useState<MatchSetup | undefined>()
  const [round, setRound] = useState(0)

  const start = (s: MatchSetup) => {
    setSetup(s)
    setLast(s)
  }

  return (
    <I18nProvider>
      {setup ? (
        <Game
          key={round}
          setup={setup}
          onRematch={() => setRound((r) => r + 1)}
          onExit={() => setSetup(null)}
        />
      ) : (
        <Setup initial={last} onStart={start} />
      )}
    </I18nProvider>
  )
}
