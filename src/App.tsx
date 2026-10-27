import { useState } from 'react'
import { cricketConfig } from './application/cricket-config'
import { CricketGame } from './ui/CricketGame'
import { Game } from './ui/Game'
import { I18nProvider } from './ui/i18n'
import { Setup, type GameSetup } from './ui/Setup'

export function App() {
  const [setup, setSetup] = useState<GameSetup | null>(null)
  const [last, setLast] = useState<GameSetup | undefined>()
  const [round, setRound] = useState(0)

  const start = (s: GameSetup) => {
    setSetup(s)
    setLast(s)
  }

  const rematch = () => {
    // Crazy cricket deals a fresh set of numbers.
    if (setup?.kind === 'crazy') start({ ...setup, config: cricketConfig('crazy', setup.config.playerCount) })
    setRound((r) => r + 1)
  }
  const exit = () => setSetup(null)

  return (
    <I18nProvider>
      {!setup ? (
        <Setup initial={last} onStart={start} />
      ) : setup.kind === 'x01' ? (
        <Game key={round} setup={setup} onRematch={rematch} onExit={exit} />
      ) : (
        <CricketGame key={round} setup={setup} onRematch={rematch} onExit={exit} />
      )}
    </I18nProvider>
  )
}
