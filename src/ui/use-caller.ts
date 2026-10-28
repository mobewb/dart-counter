import { useEffect, useRef } from 'react'
import { calls, type Call } from '../application/caller'
import type { MatchSetup } from '../application/match-setup'
import type { Dart } from '../domain'
import type { Settings } from '../infrastructure/preferences'
import { useI18n, type Key, type Lang } from './i18n'

function phrase(call: Call, t: (key: Key) => string): string {
  const fill = (key: Key, values: Record<string, string | number>) =>
    t(key).replace(/\{(\w+)\}/g, (_, name: string) => String(values[name] ?? ''))
  switch (call.type) {
    case 'visit': return call.score === 180 ? t('say180') : String(call.score)
    case 'noScore': return t('sayNoScore')
    case 'bust': return t('sayBust')
    case 'gameShot': return t('sayGameShot')
    case 'matchShot': return fill('sayMatchShot', { name: call.winner })
    case 'winner': return fill('sayWinner', { name: call.winner })
    case 'require': return fill('sayRequire', { name: call.player, n: call.remaining })
  }
}

/** Preferred voices, when installed (macOS); otherwise the browser picks one for the language. */
const voiceNames: Record<Lang, string> = { en: 'Daniel', fr: 'Thomas' }

function speak(texts: string[], lang: Lang) {
  const synth = globalThis.speechSynthesis
  if (!synth || texts.length === 0) return
  const tag = lang === 'fr' ? 'fr-FR' : 'en-GB'
  const voice = synth.getVoices().find((v) => v.name.startsWith(voiceNames[lang]) && v.lang.startsWith(lang))
  synth.cancel()
  for (const text of texts) {
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = tag
    if (voice) utterance.voice = voice
    synth.speak(utterance)
  }
}

function vibrate(said: Call[]) {
  const pattern = said.some((c) => c.type === 'matchShot' || c.type === 'winner')
    ? [120, 60, 120, 60, 240]
    : said.some((c) => c.type === 'bust')
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
    if (settings.caller) speak(said.map((call) => phrase(call, t)), lang)
    // Only a change of the dart log triggers a call, not a change of language or settings.
  }, [darts])
}
