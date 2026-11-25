import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { loadEggs, saveEggs } from '../infrastructure/preferences'
import { EGGS, eggCopy, type EggId } from './achievement-copy'
import { useI18n } from './i18n'

/** A short message over the screen: an achievement, a highlight, an easter egg. */
export interface Toast {
  icon: string
  title: string
  text?: string
}

interface Celebrate {
  /** Easter eggs found on this device. */
  eggs: ReadonlySet<EggId>
  /** Records an easter egg; the first time, says so. */
  findEgg: (egg: EggId) => void
  toast: (toast: Toast) => void
  confetti: () => void
}

const CelebrateContext = createContext<Celebrate | null>(null)

const TOAST_MS = 3200
const CONFETTI_MS = 2600
const COLORS = ['var(--accent)', 'var(--accent2)', 'var(--gold)', 'var(--hot)', '#fff']

/** One burst of confetti; remounted for each burst. Hidden with reduced motion. */
function Confetti() {
  const pieces = useMemo(
    () => Array.from({ length: 70 }, (_, i) => ({
      '--x': `${Math.random() * 100}vw`,
      '--drift': `${(Math.random() - 0.5) * 30}vw`,
      '--spin': `${(Math.random() - 0.5) * 1440}deg`,
      '--delay': `${Math.random() * 0.4}s`,
      '--fall': `${1.6 + Math.random() * 0.9}s`,
      background: COLORS[i % COLORS.length],
    }) as CSSProperties),
    [],
  )
  return (
    <div className="confetti" aria-hidden="true">
      {pieces.map((style, i) => <i key={i} style={style} />)}
    </div>
  )
}

export function CelebrateProvider({ children }: { children: ReactNode }) {
  const { lang, t } = useI18n()
  const [eggs, setEggs] = useState<ReadonlySet<EggId>>(() => new Set(loadEggs().filter((egg): egg is EggId => (EGGS as readonly string[]).includes(egg))))
  const [toasts, setToasts] = useState<(Toast & { id: number })[]>([])
  const [burst, setBurst] = useState(0)
  const next = useRef(0)

  const toast = useCallback((message: Toast) => {
    const id = ++next.current
    setToasts((list) => [...list.slice(-2), { ...message, id }])
    setTimeout(() => setToasts((list) => list.filter((x) => x.id !== id)), TOAST_MS)
  }, [])

  const confetti = useCallback(() => setBurst((n) => n + 1), [])
  useEffect(() => {
    if (burst === 0) return
    const timer = setTimeout(() => setBurst(0), CONFETTI_MS)
    return () => clearTimeout(timer)
  }, [burst])

  const eggsRef = useRef(eggs)
  eggsRef.current = eggs
  const findEgg = useCallback((egg: EggId) => {
    if (eggsRef.current.has(egg)) return
    const found = new Set(eggsRef.current).add(egg)
    eggsRef.current = found
    setEggs(found)
    saveEggs([...found])
    const { icon, name } = eggCopy[egg]
    toast({ icon, title: t('secretFound'), text: name[lang] })
  }, [lang, t, toast])

  const value = useMemo(() => ({ eggs, findEgg, toast, confetti }), [eggs, findEgg, toast, confetti])
  return (
    <CelebrateContext.Provider value={value}>
      {children}
      {burst > 0 && <Confetti key={burst} />}
      <div className="toasts" role="status">
        {toasts.map((message) => (
          <div key={message.id} className="toast">
            <span className="toast__icon" aria-hidden="true">{message.icon}</span>
            <span><b>{message.title}</b>{message.text && <small>{message.text}</small>}</span>
          </div>
        ))}
      </div>
    </CelebrateContext.Provider>
  )
}

export function useCelebrate(): Celebrate {
  const ctx = useContext(CelebrateContext)
  if (!ctx) throw new Error('useCelebrate outside CelebrateProvider')
  return ctx
}

/** Calls `onHit` after `count` taps on the same thing within a short time. */
export function useTaps(count: number, onHit: () => void): () => void {
  const taps = useRef<number[]>([])
  return () => {
    const now = Date.now()
    taps.current = [...taps.current.filter((at) => now - at < 2000), now]
    if (taps.current.length >= count) {
      taps.current = []
      onHit()
    }
  }
}
