import { useState } from 'react'
import { cricket, x01 } from '../engine'
import { useI18n } from './i18n'

export interface X01Setup {
  kind: 'x01'
  config: x01.X01Config
  names: string[]
}

export interface CricketSetup {
  kind: 'cricket' | 'crazy'
  config: cricket.CricketConfig
  names: string[]
}

export type GameSetup = X01Setup | CricketSetup

interface Props {
  initial?: GameSetup
  onStart: (setup: GameSetup) => void
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
  const x01 = initial?.kind === 'x01' ? initial.config : undefined
  const [kind, setKind] = useState<GameSetup['kind']>(initial?.kind ?? 'x01')
  const [startScore, setStartScore] = useState(x01?.startScore ?? 501)
  const [doubleIn, setDoubleIn] = useState(x01?.doubleIn ?? false)
  const [doubleOut, setDoubleOut] = useState(x01?.doubleOut ?? true)
  const [legs, setLegs] = useState(x01?.legsToWinSet ?? 3)
  const [sets, setSets] = useState(x01?.setsToWinMatch ?? 1)
  const [names, setNames] = useState(initial?.names ?? ['', ''])

  const resize = (count: number) =>
    setNames((prev) => Array.from({ length: count }, (_, i) => prev[i] ?? ''))

  const start = () => {
    const finalNames = names.map((n, i) => n.trim() || `${t('player')} ${i + 1}`)
    if (kind === 'x01') {
      onStart({
        kind,
        config: { startScore, doubleIn, doubleOut, playerCount: names.length, legsToWinSet: legs, setsToWinMatch: sets },
        names: finalNames,
      })
    } else {
      const deal = kind === 'crazy' ? cricket.crazyDeal() : { targets: cricket.CRICKET_TARGETS, rerollPool: undefined }
      onStart({ kind, config: { playerCount: names.length, ...deal }, names: finalNames })
    }
  }

  const games: [GameSetup['kind'], string][] = [['x01', t('x01')], ['cricket', t('cricket')], ['crazy', t('crazy')]]

  return (
    <main className="screen setup">
      <header className="hero">
        <button className="lang" onClick={() => setLang(lang === 'fr' ? 'en' : 'fr')}>{lang === 'fr' ? 'EN' : 'FR'}</button>
        <div className="hero__logo" aria-hidden>🎯</div>
        <h1>Dart<span>Counter</span></h1>
        <p>{t('tagline')}</p>
      </header>

      <section className="card">
        <h2>{t('game')}</h2>
        <div className="seg-control">
          {games.map(([k, label]) => (
            <button key={k} className={k === kind ? 'is-active' : ''} onClick={() => setKind(k)}>{label}</button>
          ))}
        </div>
        {kind === 'cricket' && <p className="hint">{t('cricketHint')}</p>}
        {kind === 'crazy' && <p className="hint">{t('crazyHint')}</p>}
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

      <button className="cta" onClick={start}>{t('start')}</button>
    </main>
  )
}
