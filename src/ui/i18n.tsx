import { createContext, useContext, useState, type ReactNode } from 'react'

const dict = {
  en: {
    tagline: 'Keep score. Hit doubles.',
    newMatch: 'New match',
    players: 'Players',
    player: 'Player',
    startScore: 'Start score',
    rules: 'Rules',
    doubleIn: 'Double in',
    doubleOut: 'Double out',
    legsToWin: 'Legs to win a set',
    setsToWin: 'Sets to win the match',
    start: 'Throw!',
    avg: 'Avg',
    darts: 'Darts',
    undo: 'Undo',
    miss: 'Miss',
    board: 'Board',
    pad: 'Pad',
    single: 'Single',
    double: 'Double',
    triple: 'Triple',
    bull: 'Bull',
    checkout: 'Checkout',
    wins: 'wins the match!',
    rematch: 'Rematch',
    newGame: 'New game',
    leg: 'Legs',
    set: 'Sets',
    bust: 'BUST',
    bustHint: 'Score restored, next player',
    toThrow: 'to throw',
    notIn: 'Needs a double to start',
    quit: 'Quit',
    confirmQuit: 'Quit this match?',
    firstTo: 'First to',
  },
  fr: {
    tagline: 'Comptez. Visez les doubles.',
    newMatch: 'Nouvelle partie',
    players: 'Joueurs',
    player: 'Joueur',
    startScore: 'Score de départ',
    rules: 'Règles',
    doubleIn: 'Double pour entrer',
    doubleOut: 'Double pour finir',
    legsToWin: 'Manches pour gagner un set',
    setsToWin: 'Sets pour gagner le match',
    start: 'Lancez !',
    avg: 'Moy.',
    darts: 'Fléchettes',
    undo: 'Annuler',
    miss: 'Raté',
    board: 'Cible',
    pad: 'Pavé',
    single: 'Simple',
    double: 'Double',
    triple: 'Triple',
    bull: 'Bull',
    checkout: 'Finition',
    wins: 'remporte le match !',
    rematch: 'Revanche',
    newGame: 'Nouvelle partie',
    leg: 'Manches',
    set: 'Sets',
    bust: 'BUST',
    bustHint: 'Score rétabli, joueur suivant',
    toThrow: 'à lancer',
    notIn: 'Il faut un double pour entrer',
    quit: 'Quitter',
    confirmQuit: 'Quitter cette partie ?',
    firstTo: 'Premier à',
  },
}

export type Lang = keyof typeof dict
export type Key = keyof (typeof dict)['en']

interface I18n {
  lang: Lang
  setLang: (lang: Lang) => void
  t: (key: Key) => string
}

const I18nContext = createContext<I18n | null>(null)

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(navigator.language.startsWith('fr') ? 'fr' : 'en')
  const t = (key: Key) => dict[lang][key]
  return <I18nContext.Provider value={{ lang, setLang, t }}>{children}</I18nContext.Provider>
}

export function useI18n(): I18n {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n outside I18nProvider')
  return ctx
}
