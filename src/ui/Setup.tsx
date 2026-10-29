import { useState } from 'react'
import { MAX_TEAMS, startMatch } from '../application/match-setup'
import { gameModes, modules, type GameModeId, type MatchSetup, type Sides } from '../application/modes'
import type { Settings } from '../infrastructure/preferences'
import { useI18n } from './i18n'
import { registry } from './registry'

interface Props {
  initial?: MatchSetup
  onStart: (setup: MatchSetup) => void
  onHistory: () => void
  settings: Settings
  onSettings: (settings: Settings) => void
}

const SCORES = [301, 501, 701]

/** Default team for a new player: alternate between team 1 and team 2. */
const defaultTeam = (player: number) => player % 2

/** One team number per player, from the teams of a previous setup. */
function assignmentOf(teams: Sides | undefined, count: number): number[] {
  return Array.from({ length: count }, (_, player) => {
    const team = teams?.findIndex((members) => members.includes(player)) ?? -1
    return team >= 0 ? team : defaultTeam(player)
  })
}

interface StepperProps {
  value: number
  min: number
  max: number
  step?: number
  format?: (v: number) => string
  onChange: (v: number) => void
}

function Stepper({ value, min, max, step = 1, format = String, onChange }: StepperProps) {
  return (
    <div className="stepper">
      <button onClick={() => onChange(Math.max(min, value - step))} disabled={value <= min} aria-label="−">−</button>
      <output>{format(value)}</output>
      <button onClick={() => onChange(Math.min(max, value + step))} disabled={value >= max} aria-label="+">+</button>
    </div>
  )
}

const DEFAULT_MAX_ROUNDS = 20

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="toggle">
      <span>{label}</span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <i />
    </label>
  )
}

export function Setup({ initial, onStart, onHistory, settings, onSettings }: Props) {
  const { t, lang, setLang } = useI18n()
  const x01 = initial?.mode === 'x01' ? initial.config : undefined
  const killer = initial?.mode === 'killer' ? initial.config : undefined
  const [kind, setKind] = useState<GameModeId>(initial?.mode ?? 'x01')
  const [startScore, setStartScore] = useState(x01?.startScore ?? 501)
  const [doubleIn, setDoubleIn] = useState(x01?.doubleIn ?? false)
  const [doubleOut, setDoubleOut] = useState(x01?.doubleOut ?? true)
  const [legs, setLegs] = useState(x01?.legsToWinSet ?? 3)
  const [sets, setSets] = useState(x01?.setsToWinMatch ?? 1)
  const [lives, setLives] = useState(killer?.lives ?? 3)
  // 0 is no limit.
  const [maxRounds, setMaxRounds] = useState(x01?.maxRounds ?? DEFAULT_MAX_ROUNDS)
  const [names, setNames] = useState(initial?.names ?? ['', ''])
  const [teamPlay, setTeamPlay] = useState(Boolean(initial?.teams))
  const [teams, setTeams] = useState(() => assignmentOf(initial?.teams, names.length))

  const resize = (count: number) => {
    setNames((prev) => Array.from({ length: count }, (_, i) => prev[i] ?? ''))
    setTeams((prev) => Array.from({ length: count }, (_, i) => prev[i] ?? defaultTeam(i)))
  }
  const teamCount = Math.min(MAX_TEAMS, names.length)
  const cycleTeam = (player: number) =>
    setTeams((prev) => prev.map((team, i) => (i === player ? (team + 1) % teamCount : team)))

  const teamMode = teamPlay && names.length >= 2
  const usedTeams = [...new Set(teams)].sort((a, b) => a - b)
  const enoughSides = (teamMode ? usedTeams.length : names.length) >= modules[kind].minSides
  const canStart = (!teamMode || usedTeams.length >= 2) && enoughSides
  const displayName = (i: number) => names[i]!.trim() || `${t('player')} ${i + 1}`

  const hint = registry[kind].hint

  const start = () => {
    const finalNames = names.map((_, i) => displayName(i))
    const rules = { startScore, doubleIn, doubleOut, legsToWinSet: legs, setsToWinMatch: sets }
    const common = { names: finalNames, teams: teamMode ? teams : undefined }
    onStart(startMatch(
      kind === 'x01' ? { mode: kind, options: rules, maxRounds, ...common }
        : kind === 'killer' ? { mode: kind, options: { lives }, ...common }
          : { mode: kind, options: {}, ...common },
    ))
  }


  return (
    <main className="screen setup">
      <header className="hero">
        <button className="history-link" onClick={onHistory}>{t('history')}</button>
        <button className="lang" onClick={() => setLang(lang === 'fr' ? 'en' : 'fr')}>{lang === 'fr' ? 'EN' : 'FR'}</button>
        <div className="hero__logo" aria-hidden>🎯</div>
        <h1>Dart<span>Counter</span></h1>
        <p>{t('tagline')}</p>
      </header>

      <section className="card">
        <h2>{t('game')}</h2>
        <div className="seg-control">
          {gameModes.map((k) => (
            <button key={k} className={k === kind ? 'is-active' : ''} onClick={() => setKind(k)}>{t(registry[k].label)}</button>
          ))}
        </div>
        {hint && <p className="hint">{t(hint)}</p>}
      </section>

      {kind === 'x01' && (
        <section className="card">
          <h2>{t('startScore')}</h2>
          <div className="seg-control">
            {SCORES.map((s) => (
              <button key={s} className={s === startScore ? 'is-active' : ''} onClick={() => setStartScore(s)}>{s}</button>
            ))}
          </div>
        </section>
      )}

      <section className="card">
        <div className="card__row">
          <h2>{t('players')}</h2>
          <Stepper value={names.length} min={1} max={8} onChange={resize} />
        </div>
        <div className="names">
          {names.map((name, i) => (
            <div key={i} className="name-row">
              <input
                value={name}
                maxLength={16}
                placeholder={`${t('player')} ${i + 1}`}
                onChange={(e) => setNames((prev) => prev.map((n, j) => (j === i ? e.target.value : n)))}
              />
              {teamMode && (
                <button className={`team-badge team-${teams[i]}`} onClick={() => cycleTeam(i)} aria-label={`${t('team')} ${teams[i]! + 1}`}>
                  T{teams[i]! + 1}
                </button>
              )}
            </div>
          ))}
        </div>
        {!enoughSides && !teamMode && <p className="hint">{t('needTwoPlayers')}</p>}
        {names.length >= 2 && <Toggle label={t('teams')} checked={teamPlay} onChange={setTeamPlay} />}
        {teamMode && (
          <div className="team-summary">
            {usedTeams.map((team) => (
              <p key={team}>
                <span className={`team-badge team-${team}`}>T{team + 1}</span>
                {teams.flatMap((n, i) => (n === team ? [displayName(i)] : [])).join(' & ')}
              </p>
            ))}
            <p className="hint">{canStart ? t('teamsHint') : t('needTwoTeams')}</p>
          </div>
        )}
      </section>

      {kind === 'x01' && (
        <section className="card">
          <h2>{t('rules')}</h2>
          <Toggle label={t('doubleIn')} checked={doubleIn} onChange={setDoubleIn} />
          <Toggle label={t('doubleOut')} checked={doubleOut} onChange={setDoubleOut} />
          <div className="card__row">
            <span>{t('legsToWin')}</span>
            <Stepper value={legs} min={1} max={11} onChange={setLegs} />
          </div>
          <div className="card__row">
            <span>{t('setsToWin')}</span>
            <Stepper value={sets} min={1} max={7} onChange={setSets} />
          </div>
        </section>
      )}

      {kind === 'killer' && (
        <section className="card">
          <h2>{t('rules')}</h2>
          <div className="card__row">
            <span>{t('lives')}</span>
            <Stepper value={lives} min={1} max={5} onChange={setLives} />
          </div>
        </section>
      )}

      {kind === 'x01' && (
        <section className="card">
          <div className="card__row">
            <h2>{t('maxRounds')}</h2>
            <Stepper value={maxRounds} min={0} max={50} step={5} format={(v) => (v === 0 ? t('off') : String(v))} onChange={setMaxRounds} />
          </div>
          {maxRounds > 0 && <p className="hint">{t('maxRoundsHint')}</p>}
        </section>
      )}

      <section className="card">
        <h2>{t('sound')}</h2>
        <Toggle label={t('callerVoice')} checked={settings.caller} onChange={(caller) => onSettings({ ...settings, caller })} />
        <Toggle label={t('vibration')} checked={settings.haptics} onChange={(haptics) => onSettings({ ...settings, haptics })} />
      </section>

      <button className="cta" onClick={start} disabled={!canStart}>{t('start')}</button>
    </main>
  )
}
