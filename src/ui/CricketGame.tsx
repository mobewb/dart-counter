import { useCallback, useMemo, useState } from 'react'
import { isClosed, marksOn, replayCricket, type Dart } from '../engine'
import { dartLabel } from './dartLabel'
import { Dartboard } from './Dartboard'
import { useI18n } from './i18n'
import { Keypad } from './Keypad'
import type { CricketSetup } from './Setup'
import { TargetsStrip } from './TargetsStrip'

interface Props {
  setup: CricketSetup
  onRematch: () => void
  onExit: () => void
}

const MARK = ['', '／', '✕', '⊗']
const targetLabel = (target: number) => (target === 25 ? 'B' : String(target))

export function CricketGame({ setup, onRematch, onExit }: Props) {
  const { t } = useI18n()
  const { config, names } = setup
  const [darts, setDarts] = useState<Dart[]>([])
  const [input, setInput] = useState<'board' | 'pad'>('board')

  const game = useMemo(() => replayCricket(config, darts), [config, darts])
  const finished = game.status === 'finished'

  // Crazy cricket spins a roulette for the opening numbers and for every reroll.
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const [spin, setSpin] = useState<number[] | null>(() =>
    setup.kind === 'crazy' && !reduced ? config.targets.flatMap((n, i) => (n === 25 ? [] : [i])) : null,
  )
  const [seenRolls, setSeenRolls] = useState(0)
  if (game.rollCount !== seenRolls) {
    // Derived during render so the new numbers never flash before the spin.
    setSeenRolls(game.rollCount)
    if (game.rollCount > seenRolls && !reduced) setSpin(game.lastRoll)
  }
  const spinning = spin !== null
  const endSpin = useCallback(() => setSpin(null), [])
  const dead = useMemo(
    () => new Set(game.targets.filter((target) => game.players.every((p) => isClosed(p, target)))),
    [game.targets, game.players],
  )

  const hit = (dart: Dart) => !finished && !spinning && setDarts((log) => [...log, dart])
  const undo = () => setDarts((log) => log.slice(0, -1))
  const quit = () => window.confirm(t('confirmQuit')) && onExit()

  return (
    <main className="screen game">
      <header className="topbar">
        <button className="ghost" onClick={quit} aria-label={t('quit')}>✕<span className="label"> {t('quit')}</span></button>
        <div className="topbar__info">
          <strong>{setup.kind === 'crazy' ? t('crazy') : t('cricket')}</strong>
        </div>
        <button className="ghost undo" onClick={undo} disabled={darts.length === 0 || spinning} aria-label={t('undo')}>↶<span className="label"> {t('undo')}</span></button>
      </header>

      <TargetsStrip targets={game.targets} dead={dead} spin={spin} onSpinEnd={endSpin} />

      <section className={`cricket${spinning ? ' cricket--hidden' : ''}`} style={{ ['--cols' as string]: game.players.length }}>
        <div className="cricket__head">
          <div className="cricket__corner">{t('points')}</div>
          {game.players.map((p, i) => (
            <div key={i} className={`cricket__player${i === game.currentPlayer && !finished ? ' is-active' : ''}${game.winner === i ? ' is-winner' : ''}`}>
              <span className="cricket__name">{names[i]}</span>
              <span className="cricket__points">{p.points}</span>
            </div>
          ))}
        </div>
        {game.targets.map((target) => {
          const dead = game.players.every((p) => isClosed(p, target))
          return (
            <div key={target} className={`cricket__row${dead ? ' is-dead' : ''}`} title={dead ? t('closedByAll') : undefined}>
              <div className="cricket__target">{targetLabel(target)}</div>
              {game.players.map((p, i) => {
                const marks = marksOn(p, target)
                return (
                  <div key={i} className={`cricket__cell marks-${marks}${i === game.currentPlayer && !finished ? ' is-active' : ''}`}>
                    {MARK[marks]}
                  </div>
                )
              })}
            </div>
          )
        })}
      </section>

      <section className="turn">
        <div className="turn__head">
          <span className="turn__who">{names[game.currentPlayer]} <small>{t('toThrow')}</small></span>
        </div>
        <div className="slots">
          {[0, 1, 2].map((i) => {
            const d = game.turnDarts[i]
            return (
              <div key={i} className={`slot${d ? ' is-filled' : ''}`}>
                {d ? dartLabel(d, t('miss')) : '·'}
              </div>
            )
          })}
        </div>
      </section>

      <section className="input">
        <div className="seg-control seg-control--small">
          <button className={input === 'board' ? 'is-active' : ''} onClick={() => setInput('board')}>{t('board')}</button>
          <button className={input === 'pad' ? 'is-active' : ''} onClick={() => setInput('pad')}>{t('pad')}</button>
        </div>
        {input === 'board' ? (
          <>
            <Dartboard onHit={hit} disabled={finished || spinning} targets={game.targets} />
            <button className="miss" disabled={finished || spinning} onClick={() => hit({ segment: 0, multiplier: 1 })}>{t('miss')}</button>
          </>
        ) : (
          <Keypad onHit={hit} disabled={finished || spinning} targets={game.targets} />
        )}
      </section>

      {finished && game.winner !== null && (
        <div className="overlay">
          <div className="overlay__card">
            <div className="trophy" aria-hidden>🏆</div>
            <h2>{names[game.winner]}</h2>
            <p>{t('wins')}</p>
            <div className="overlay__stats">
              {game.players.map((p, i) => (
                <div key={i} className={i === game.winner ? 'is-winner' : ''}>
                  <span>{names[i]}</span>
                  <b>{p.points}</b>
                  <small>{t('points')} · {p.dartsThrown} {t('darts').toLowerCase()}</small>
                </div>
              ))}
            </div>
            <div className="overlay__actions">
              <button className="ghost" onClick={undo}>↶ {t('undo')}</button>
              <button className="cta" onClick={onRematch}>{t('rematch')}</button>
              <button className="ghost" onClick={onExit}>{t('newGame')}</button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
