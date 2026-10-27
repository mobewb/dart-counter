import { useEffect, useMemo, useState } from 'react'
import { checkout, replay, threeDartAverage, type Dart } from '../engine'
import { dartLabel } from './dartLabel'
import { Dartboard } from './Dartboard'
import { useI18n } from './i18n'
import { Keypad } from './Keypad'
import type { X01Setup } from './Setup'

interface Props {
  setup: X01Setup
  onRematch: () => void
  onExit: () => void
}

function useWakeLock() {
  useEffect(() => {
    let lock: WakeLockSentinel | null = null
    navigator.wakeLock?.request('screen').then((l) => (lock = l)).catch(() => {})
    return () => void lock?.release().catch(() => {})
  }, [])
}

export function Game({ setup, onRematch, onExit }: Props) {
  const { t } = useI18n()
  const { config, names } = setup
  const [darts, setDarts] = useState<Dart[]>([])
  const [input, setInput] = useState<'board' | 'pad'>('board')
  useWakeLock()

  const match = useMemo(() => replay(config, darts), [config, darts])
  const finished = match.status === 'finished'
  const current = match.players[match.currentPlayer]!
  const dartsLeft = 3 - match.turnDarts.length
  const hint = !finished && current.in && current.remaining <= 170
    ? checkout(current.remaining, config.doubleOut, dartsLeft)
    : null

  const hit = (dart: Dart) => !finished && setDarts((log) => [...log, dart])
  const undo = () => setDarts((log) => log.slice(0, -1))
  const quit = () => window.confirm(t('confirmQuit')) && onExit()

  // Keep the active player in view on small screens.
  useEffect(() => {
    document.querySelector('.pcard.is-active')?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' })
  }, [match.currentPlayer])

  const showLegs = config.legsToWinSet > 1 || config.setsToWinMatch > 1
  const showSets = config.setsToWinMatch > 1

  return (
    <main className="screen game">
      <header className="topbar">
        <button className="ghost" onClick={quit}>✕ {t('quit')}</button>
        <div className="topbar__info">
          <strong>{config.startScore}</strong>
          <span>{config.doubleIn ? 'DI · ' : ''}{config.doubleOut ? 'DO' : 'SO'}</span>
          {showLegs && <span>· {t('firstTo')} {config.legsToWinSet}{showSets ? ` / ${config.setsToWinMatch}` : ''}</span>}
        </div>
        <button className="ghost" onClick={undo} disabled={darts.length === 0}>↶ {t('undo')}</button>
      </header>

      <section className="players" data-count={match.players.length}>
        {match.players.map((p, i) => (
          <article key={i} className={`pcard${i === match.currentPlayer && !finished ? ' is-active' : ''}${match.winner === i ? ' is-winner' : ''}`}>
            <div className="pcard__name">
              {match.legStarter === i && <i className="dot" title="leg starter" />}
              {names[i]}
            </div>
            <div className="pcard__score">{p.remaining}</div>
            <div className="pcard__meta">
              {showLegs && (
                <span>
                  {showSets && <>{t('set')} <b>{p.sets}</b> · </>}
                  {t('leg')} <b>{p.legs}</b>
                </span>
              )}
              <span>{t('avg')} <b>{threeDartAverage(p).toFixed(1)}</b></span>
            </div>
          </article>
        ))}
      </section>

      <section className="turn">
        <div className="turn__head">
          <span className="turn__who">{names[match.currentPlayer]} <small>{t('toThrow')}</small></span>
          {hint && (
            <span className="chip chip--checkout">
              {t('checkout')} <b>{hint.map((d) => dartLabel(d)).join(' · ')}</b>
            </span>
          )}
          {!current.in && <span className="chip">{t('notIn')}</span>}
        </div>
        <div className="slots">
          {[0, 1, 2].map((i) => {
            const d = match.turnDarts[i]
            return (
              <div key={i} className={`slot${d ? ' is-filled' : ''}`}>
                {d ? dartLabel(d, t('miss')) : '·'}
              </div>
            )
          })}
        </div>
        {match.busted && (
          <div className="bust" role="status">
            <strong>{t('bust')}</strong> {t('bustHint')}
          </div>
        )}
      </section>

      <section className="input">
        <div className="seg-control seg-control--small">
          <button className={input === 'board' ? 'is-active' : ''} onClick={() => setInput('board')}>{t('board')}</button>
          <button className={input === 'pad' ? 'is-active' : ''} onClick={() => setInput('pad')}>{t('pad')}</button>
        </div>
        {input === 'board' ? (
          <>
            <Dartboard onHit={hit} disabled={finished} />
            <button className="miss" disabled={finished} onClick={() => hit({ segment: 0, multiplier: 1 })}>{t('miss')}</button>
          </>
        ) : (
          <Keypad onHit={hit} disabled={finished} />
        )}
      </section>

      {finished && match.winner !== null && (
        <div className="overlay">
          <div className="overlay__card">
            <div className="trophy" aria-hidden>🏆</div>
            <h2>{names[match.winner]}</h2>
            <p>{t('wins')}</p>
            <div className="overlay__stats">
              {match.players.map((p, i) => (
                <div key={i} className={i === match.winner ? 'is-winner' : ''}>
                  <span>{names[i]}</span>
                  <b>{threeDartAverage(p).toFixed(1)}</b>
                  <small>{t('avg')} · {p.dartsThrown} {t('darts').toLowerCase()}</small>
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
