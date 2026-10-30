import { useEffect, useRef, useState } from 'react'
import type { Match } from '../application/match'
import type { GameModeId, Setup } from '../application/modes'
import type { Dart } from '../domain'
import { ConfirmDialog } from './ConfirmDialog'
import { dartLabel } from './dartLabel'
import { Dartboard } from './Dartboard'
import { useI18n } from './i18n'
import { Keypad } from './Keypad'
import type { Settings } from '../infrastructure/preferences'
import { registry } from './registry'
import { useCaller } from './use-caller'
import { useMatch } from './use-match'

interface Props<K extends GameModeId> {
  setup: Setup<K>
  /** The dart log the screen opens with, when resuming a saved match. */
  initialDarts?: readonly Dart[]
  /** Called with the match after every dart or undo. */
  onProgress: (match: Match<K>) => void
  settings: Settings
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
export function GameScreen<K extends GameModeId>({ setup, initialDarts, onProgress, settings, onRematch, onExit }: Props<K>) {
  const { t } = useI18n()
  const { names } = setup
  const view = registry[setup.mode]
  const { match, hit: record, undo } = useMatch(setup, initialDarts)
  const { state, sideNames: sides, round } = match
  const dartCount = match.darts.length
  // Report changes only, not the log the screen opened with.
  const opened = useRef(match.darts)
  useEffect(() => {
    if (match.darts !== opened.current) onProgress(match)
  }, [match, onProgress])
  const [input, setInput] = useState<'board' | 'pad'>('board')
  useWakeLock(view.keepAwake ?? false)
  useCaller(match, settings)
  const { info, board, turnExtras, afterTurn, targets, marked, locked = false } = view.useView({ setup, sides, state, events: match.events, dartCount })

  const finished = state.status === 'finished'
  const chips = (player: number) => (
    <div className="statline">
      {view.details(match.stats[player]!, t).map((chip) => <span key={chip}>{chip}</span>)}
    </div>
  )
  const hit = (dart: Dart) => !locked && record(dart)
  const [quitting, setQuitting] = useState(false)
  // Nothing to lose before the first dart, so no need to ask.
  const quit = () => (dartCount === 0 ? onExit() : setQuitting(true))

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
          <span className="turn__who">{names[match.thrower]} <small>{t('toThrow')}</small></span>
          {turnExtras}
          {round && (
            <span className={`chip${round.suddenDeath ? ' chip--sudden' : ''}`}>
              {round.suddenDeath ? t('suddenDeath') : `${t('round')} ${round.current} / ${round.max}`}
            </span>
          )}
        </div>
        <div className="slots">
          {[0, 1, 2].map((i) => {
            const d = state.turnDarts[i]
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
            <Dartboard onHit={hit} disabled={finished || locked} targets={targets} marked={marked} />
            <button className="miss" disabled={finished || locked} onClick={() => hit({ segment: 0, multiplier: 1 })}>{t('miss')}</button>
          </>
        ) : (
          <Keypad onHit={hit} disabled={finished || locked} targets={targets} marked={marked} />
        )}
      </section>

      {finished && state.winner !== null && (
        <div className="overlay">
          <div className="overlay__card">
            <div className="trophy" aria-hidden>🏆</div>
            <h2>{sides[state.winner]}</h2>
            <p>{t(setup.teams ? 'winTeam' : 'wins')}</p>
            <div className="overlay__stats">
              {match.results.map((r, i) => (
                <div key={i} className={i === state.winner ? 'is-winner' : ''}>
                  <span>{sides[i]}</span>
                  <b>{view.result.format(r.value)}</b>
                  <small>{t(view.result.label)} · {r.dartsThrown} {t('darts').toLowerCase()}</small>
                  {!setup.teams && chips(i)}
                </div>
              ))}
            </div>
            {setup.teams && (
              <div className="overlay__stats overlay__stats--players">
                {match.players.map((r, i) => (
                  <div key={i}>
                    <span>{names[i]}</span>
                    <b>{view.result.format(r.value)}</b>
                    <small>{t(view.result.label)} · {r.dartsThrown} {t('darts').toLowerCase()}</small>
                    {chips(i)}
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
      <ConfirmDialog
        open={quitting}
        title={t('confirmQuit')}
        confirmLabel={t('quit')}
        cancelLabel={t('keepPlaying')}
        danger
        onConfirm={onExit}
        onCancel={() => setQuitting(false)}
      >
        {t('quitHint')}
      </ConfirmDialog>
    </main>
  )
}
