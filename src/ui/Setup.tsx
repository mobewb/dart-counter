import { useState } from 'react'
import type { MatchConfig } from '../engine'
import { useI18n } from './i18n'

export interface MatchSetup {
  config: MatchConfig
  names: string[]
}

interface Props {
  initial?: MatchSetup
  onStart: (setup: MatchSetup) => void
}

const SCORES = [301, 501, 701]

function Stepper({ value, min, max, onChange }: { value: number; min: number; max: number; onChange: (v: number) => void }) {
  return (
    <div className="stepper">
      <button onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} aria-label="−">−</button>
      <output>{value}</output>
      <button onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} aria-label="+">+</button>
    </div>
  )
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="toggle">
      <span>{label}</span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <i />
    </label>
  )
}

export function Setup({ initial, onStart }: Props) {
  const { t, lang, setLang } = useI18n()
  const [startScore, setStartScore] = useState(initial?.config.startScore ?? 501)
  const [doubleIn, setDoubleIn] = useState(initial?.config.doubleIn ?? false)
  const [doubleOut, setDoubleOut] = useState(initial?.config.doubleOut ?? true)
  const [legs, setLegs] = useState(initial?.config.legsToWinSet ?? 3)
  const [sets, setSets] = useState(initial?.config.setsToWinMatch ?? 1)
  const [names, setNames] = useState(initial?.names ?? ['', ''])

  const resize = (count: number) =>
    setNames((prev) => Array.from({ length: count }, (_, i) => prev[i] ?? ''))

  const start = () =>
    onStart({
      config: { startScore, doubleIn, doubleOut, playerCount: names.length, legsToWinSet: legs, setsToWinMatch: sets },
      names: names.map((n, i) => n.trim() || `${t('player')} ${i + 1}`),
    })

  return (
    <main className="screen setup">
      <header className="hero">
        <button className="lang" onClick={() => setLang(lang === 'fr' ? 'en' : 'fr')}>{lang === 'fr' ? 'EN' : 'FR'}</button>
        <div className="hero__logo" aria-hidden>🎯</div>
        <h1>Dart<span>Counter</span></h1>
        <p>{t('tagline')}</p>
      </header>

      <section className="card">
        <h2>{t('startScore')}</h2>
        <div className="seg-control">
          {SCORES.map((s) => (
            <button key={s} className={s === startScore ? 'is-active' : ''} onClick={() => setStartScore(s)}>{s}</button>
          ))}
        </div>
      </section>

      <section className="card">
        <div className="card__row">
          <h2>{t('players')}</h2>
          <Stepper value={names.length} min={1} max={8} onChange={resize} />
        </div>
        <div className="names">
          {names.map((name, i) => (
            <input
              key={i}
              value={name}
              maxLength={16}
              placeholder={`${t('player')} ${i + 1}`}
              onChange={(e) => setNames((prev) => prev.map((n, j) => (j === i ? e.target.value : n)))}
            />
          ))}
        </div>
      </section>

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

      <button className="cta" onClick={start}>{t('start')}</button>
    </main>
  )
}
