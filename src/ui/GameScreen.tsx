import { useEffect, useMemo, useRef, useState } from 'react'
import { newlyUnlocked, visitHighlight, type AchievementId, type Played } from '../application/achievements'
import type { Match } from '../application/match'
import { toMatchSetup, type GameModeId, type Setup } from '../application/modes'
import { winningDarts } from '../application/winning-darts'
import type { Dart } from '../domain'
import { achievementCopy } from './achievement-copy'
import { useCelebrate, useTaps } from './celebrate'
import { ConfirmDialog } from './ConfirmDialog'
import { dartLabel, spokenDart } from './dartLabel'
import { Dartboard } from './Dartboard'
import { useI18n } from './i18n'
import { Keypad } from './Keypad'
import type { Settings } from '../infrastructure/preferences'
import { registry } from './registry'
import { SegControl } from './SegControl'
import { useCaller } from './use-caller'
import { useMatch } from './use-match'

interface Props<K extends GameModeId> {
  setup: Setup<K>
  /** The dart log the screen opens with, when resuming a saved match. */
  initialDarts?: readonly Dart[]
  /** Called with the match after every dart or undo. */
  onProgress: (match: Match<K>) => void
  /** The match history before this match, once loaded: to tell what it unlocks. */
  past?: readonly Played[]
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

/** Highlights worth confetti, not just a toast. */
const BIG: readonly AchievementId[] = ['oneEighty', 'nineMarks', 'tripleKill', 'shanghai']

/** Cheers a visit that earns a highlight, and the win; undo and resume stay quiet. */
function useHighlights(match: Match) {
  const { lang } = useI18n()
  const { toast, confetti } = useCelebrate()
  const seen = useRef(match.darts.length)
  useEffect(() => {
    const thrown = match.darts.length > seen.current
    seen.current = match.darts.length
    if (!thrown) return
    const highlight = visitHighlight(match)
    if (highlight) {
      const { icon, name } = achievementCopy[highlight]
      toast({ icon, title: name[lang], text: match.setup.names[match.steps.at(-1)!.player] })
      if (BIG.includes(highlight)) confetti()
    }
    if (match.state.status === 'finished') confetti()
    // Only a new dart cheers, not a change of language.
  }, [match.darts])
}

/** The game screen of every mode; the mode's view fills in its own parts. */
export function GameScreen<K extends GameModeId>({ setup, initialDarts, onProgress, past, settings, onRematch, onExit }: Props<K>) {
  const { t, lang } = useI18n()
  const { findEgg, confetti } = useCelebrate()
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
  useHighlights(match)
  const { info, board, turnExtras, afterTurn, targets, aim: route, plan = [], marked, locked = false } = view.useView({ setup, sides, state, events: match.events, dartCount })

  const finished = state.status === 'finished'
  const winning = useMemo(() => (locked ? [] : winningDarts(match)), [match, locked])
  // What the board and pad point to: the darts that win now, else the mode's suggestion.
  const aim = winning.length > 0 ? winning : finished || locked ? [] : route ?? []
  const aimLabel = t(winning.length > 0 ? 'winningDart' : 'aimDart')
  const chips = (player: number) => (
    <div className="statline">
      {view.details(match.stats[player]!, t).map((chip) => <span key={chip}>{chip}</span>)}
    </div>
  )
  const hit = (dart: Dart) => !locked && record(dart)
  // What each player earned for the first time, once the match is won.
  const unlocks = useMemo(
    () => (finished && past ? newlyUnlocked(past, { setup: toMatchSetup(setup), darts: [...match.darts], finishedAt: Date.now() }) : []),
    [finished, past, setup, match.darts],
  )
  const polishTrophy = useTaps(5, () => {
    findEgg('trophy')
    confetti()
  })
  const [quitting, setQuitting] = useState(false)
  // Nothing to lose before the first dart, so no need to ask.
  const quit = () => (dartCount === 0 ? onExit() : setQuitting(true))

  return (
    <main className="screen game">
      <h1 className="sr-only">{t(view.label)}</h1>
      <header className="topbar" inert={finished}>
        <button className="ghost" onClick={quit} aria-label={t('quit')}>✕<span className="label"> {t('quit')}</span></button>
        <div className="topbar__info">{info}</div>
        <button className="ghost undo" onClick={undo} disabled={dartCount === 0 || locked} aria-label={t('undo')}>↶<span className="label"> {t('undo')}</span></button>
      </header>

      <div className="game__board" inert={finished}>{board}</div>

      <section className="turn" inert={finished}>
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
            // An empty slot shows the dart the plan suggests for it.
            const planned = d || finished ? undefined : plan[i - state.turnDarts.length]
            return (
              <div key={i} className={`slot${d ? ' is-filled' : ''}${planned ? ' is-plan' : ''}`}>
                {d ? dartLabel(d, t('miss')) : planned ? <><span className="sr-only">{t('checkout')} </span>{dartLabel(planned)}</> : <span aria-hidden="true">·</span>}
              </div>
            )
          })}
        </div>
        {afterTurn}
      </section>

      <section className="input" inert={finished}>
        {/* The gold highlight in words; kept mounted so screen readers announce changes. */}
        <div className="sr-only" role="status">
          {aim.length > 0 && `${t(winning.length > 0 ? 'toWin' : 'aimAt')} ${aim.map((d) => spokenDart(d, t)).join(', ')}`}
        </div>
        <SegControl
          small
          label={t('inputMethod')}
          options={[{ value: 'board' as const, label: t('board') }, { value: 'pad' as const, label: t('pad') }]}
          value={input}
          onChange={setInput}
        />
        {input === 'board' ? (
          <>
            <Dartboard label={t('board')} onHit={hit} disabled={finished || locked} targets={targets} marked={marked} aim={aim} />
            <button className="miss" disabled={finished || locked} onClick={() => hit({ segment: 0, multiplier: 1 })}>{t('miss')}</button>
          </>
        ) : (
          <Keypad onHit={hit} disabled={finished || locked} targets={targets} marked={marked} aim={aim} aimLabel={aimLabel} />
        )}
      </section>

      {finished && state.winner !== null && (
        <div className="overlay">
          <div className="overlay__card" role="dialog" aria-modal="true" aria-labelledby="winner-title" aria-describedby="winner-text">
            {/* Not a control: tapping it is an easter egg. */}
            <svg className="trophy" viewBox="0 0 100 100" aria-hidden="true" onClick={polishTrophy}>
              <circle cx="50" cy="50" r="42" />
              <path d="M32 51l12 12 24-26" />
            </svg>
            <h2 id="winner-title">{sides[state.winner]}</h2>
            <p id="winner-text">{t(setup.teams ? 'winTeam' : 'wins')}</p>
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
            {unlocks.some((ids) => ids.length > 0) && (
              <section className="unlocks" aria-labelledby="unlocks-title">
                <h3 id="unlocks-title">{t('newAchievements')}</h3>
                <ul>
                  {unlocks.flatMap((ids, player) => ids.map((id) => (
                    <li key={`${player}-${id}`}>
                      <span className="unlocks__icon" aria-hidden="true">{achievementCopy[id].icon}</span>
                      <span><b>{achievementCopy[id].name[lang]}</b><small>{names[player]}</small></span>
                    </li>
                  )))}
                </ul>
              </section>
            )}
            <div className="overlay__actions">
              <button className="ghost" onClick={undo}>↶ {t('undo')}</button>
              <button className="cta" autoFocus onClick={onRematch}>{t('rematch')}</button>
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
