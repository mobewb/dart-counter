import { useEffect, useMemo, useRef, useState } from 'react'
import type { MatchSetup } from '../application/match-setup'
import { sideNames, teamPlay } from '../application/sides'
import { results, type Dart, type MatchCore } from '../domain'
import { dartLabel } from './dartLabel'
import { Dartboard } from './Dartboard'
import { useI18n } from './i18n'
import { Keypad } from './Keypad'
import type { ModeView } from './modes/types'
import { useMatch } from './use-match'

interface Props<Setup extends MatchSetup, State extends MatchCore> {
  view: ModeView<Setup, State>
  setup: Setup
  /** The dart log the screen opens with, when resuming a saved match. */
  initialDarts?: readonly Dart[]
  /** Called with the new dart log after every dart or undo. */
  onProgress: (darts: readonly Dart[]) => void
  onRematch: () => void
  onExit: () => void
}

function useWakeLock(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return
    let lock: WakeLockSentinel | null = null
    navigator.wakeLock?.request('screen').then((l) => (lock = l)).catch(() => {})
    return () => void lock?.release().catch(() => {})
  }, [enabled])
}

/** The game screen of every mode; the mode's view fills in its own parts. */
export function GameScreen<Setup extends MatchSetup, State extends MatchCore>({ view, setup, initialDarts, onProgress, onRematch, onExit }: Props<Setup, State>) {
  const { t } = useI18n()
  const { names } = setup
  const sides = useMemo(() => sideNames(setup), [setup])
  const { state: match, events, darts, dartCount, hit: record, undo } = useMatch(view.rules, setup.config, initialDarts)
  // Report changes only, not the log the screen opened with.
  const opened = useRef(darts)
  useEffect(() => {
    if (darts !== opened.current) onProgress(darts)
  }, [darts, onProgress])
  const [input, setInput] = useState<'board' | 'pad'>('board')
  useWakeLock(view.keepAwake ?? false)
  const play = useMemo(() => teamPlay(setup, darts), [setup, darts])
  const { info, board, turnExtras, afterTurn, targets, locked = false } = view.useView({ setup, sides, state: match, events, dartCount })

  const finished = match.status === 'finished'
  const hit = (dart: Dart) => !locked && record(dart)
  const quit = () => window.confirm(t('confirmQuit')) && onExit()

  return (
    <main className="screen game">
      <header className="topbar">
        <button className="ghost" onClick={quit} aria-label={t('quit')}>✕<span className="label"> {t('quit')}</span></button>
        <div className="topbar__info">{info}</div>
        <button className="ghost undo" onClick={undo} disabled={dartCount === 0 || locked} aria-label={t('undo')}>↶<span className="label"> {t('undo')}</span></button>
      </header>

      {board}

      <section className="turn">
        <div className="turn__head">
          <span className="turn__who">{names[play.thrower]} <small>{t('toThrow')}</small></span>
          {turnExtras}
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
        {afterTurn}
      </section>

      <section className="input">
        <div className="seg-control seg-control--small">
          <button className={input === 'board' ? 'is-active' : ''} onClick={() => setInput('board')}>{t('board')}</button>
          <button className={input === 'pad' ? 'is-active' : ''} onClick={() => setInput('pad')}>{t('pad')}</button>
        </div>
        {input === 'board' ? (
          <>
            <Dartboard onHit={hit} disabled={finished || locked} targets={targets} />
            <button className="miss" disabled={finished || locked} onClick={() => hit({ segment: 0, multiplier: 1 })}>{t('miss')}</button>
          </>
        ) : (
          <Keypad onHit={hit} disabled={finished || locked} targets={targets} />
        )}
      </section>

      {finished && match.winner !== null && (
        <div className="overlay">
          <div className="overlay__card">
            <div className="trophy" aria-hidden>🏆</div>
            <h2>{sides[match.winner]}</h2>
            <p>{t(setup.teams ? 'winTeam' : 'wins')}</p>
            <div className="overlay__stats">
              {results(view.rules, match).map((r, i) => (
                <div key={i} className={i === match.winner ? 'is-winner' : ''}>
                  <span>{sides[i]}</span>
                  <b>{view.result.format(r.value)}</b>
                  <small>{t(view.result.label)} · {r.dartsThrown} {t('darts').toLowerCase()}</small>
                </div>
              ))}
            </div>
            {setup.teams && (
              <div className="overlay__stats overlay__stats--players">
                {play.players.map((r, i) => (
                  <div key={i}>
                    <span>{names[i]}</span>
                    <b>{view.result.format(r.value)}</b>
                    <small>{t(view.result.label)} · {r.dartsThrown} {t('darts').toLowerCase()}</small>
                  </div>
                ))}
              </div>
            )}
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
