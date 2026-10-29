import { useEffect, useRef } from 'react'
import { calls, mood, type Call, type Mood } from '../application/caller'
import type { MatchSetup } from '../application/match-setup'
import type { Dart } from '../domain'
import type { Settings } from '../infrastructure/preferences'
import { useI18n, type Key, type Lang } from './i18n'

function phrase(call: Call, t: (key: Key) => string): string {
  const fill = (key: Key, values: Record<string, string | number>) =>
    t(key).replace(/\{(\w+)\}/g, (_, name: string) => String(values[name] ?? ''))
  switch (call.type) {
    case 'visit': return call.score === 180 ? t('say180') : call.score >= 100 ? `${call.score}!` : String(call.score)
    case 'noScore': return t('sayNoScore')
    case 'bust': return t('sayBust')
    case 'gameShot': return t('sayGameShot')
    case 'matchShot': return fill('sayMatchShot', { name: call.winner })
    case 'winner': return fill('sayWinner', { name: call.winner })
    case 'require': return fill('sayRequire', { name: call.player, n: call.remaining })
    case 'drawn': return fill('sayDrawn', { name: call.player, n: call.number })
    case 'killer': return fill('sayKiller', { name: call.player })
    case 'out': return fill('sayOut', { name: call.player })
    case 'roundLimit': return fill('sayRoundLimit', { name: call.player })
    case 'suddenDeath': return t('saySuddenDeath')
  }
}

/** Preferred voices, when installed (macOS); otherwise the browser picks one for the language. */
const voiceNames: Record<Lang, string> = { en: 'Daniel', fr: 'Thomas' }

/** The browser voice only takes a pitch, a rate and a volume per phrase, so a mood is set phrase by phrase. */
const delivery: Record<Mood, Pick<SpeechSynthesisUtterance, 'pitch' | 'rate' | 'volume'>> = {
  roar: { pitch: 1.5, rate: 0.8, volume: 1 },
  excited: { pitch: 1.25, rate: 1.1, volume: 1 },
  neutral: { pitch: 1, rate: 1, volume: 1 },
  flat: { pitch: 0.7, rate: 0.8, volume: 0.8 },
}

function speak(lines: { text: string; mood: Mood }[], lang: Lang) {
  const synth = globalThis.speechSynthesis
  if (!synth || lines.length === 0) return
  const tag = lang === 'fr' ? 'fr-FR' : 'en-GB'
  const voice = synth.getVoices().find((v) => v.name.startsWith(voiceNames[lang]) && v.lang.startsWith(lang))
  synth.cancel()
  for (const line of lines) {
    const utterance = new SpeechSynthesisUtterance(line.text)
    Object.assign(utterance, delivery[line.mood])
    utterance.lang = tag
    if (voice) utterance.voice = voice
    synth.speak(utterance)
  }
}

function vibrate(said: Call[]) {
  const pattern = said.some((c) => c.type === 'matchShot' || c.type === 'winner')
    ? [120, 60, 120, 60, 240]
    : said.some((c) => c.type === 'bust' || c.type === 'out')
      ? [70, 50, 70]
      : 12
  navigator.vibrate?.(pattern)
}

/** Speaks and vibrates after each new dart; undo and resume stay silent. */
export function useCaller(setup: MatchSetup, darts: readonly Dart[], settings: Settings) {
  const { t, lang } = useI18n()
  const seen = useRef(darts.length)
  useEffect(() => {
    const thrown = darts.length > seen.current
    seen.current = darts.length
    if (!thrown || (!settings.caller && !settings.haptics)) return
    const said = calls(setup, darts)
    if (settings.haptics) vibrate(said)
    if (settings.caller) speak(said.map((call) => ({ text: phrase(call, t), mood: mood(call) })), lang)
    // Only a change of the dart log triggers a call, not a change of language or settings.
  }, [darts])
}
