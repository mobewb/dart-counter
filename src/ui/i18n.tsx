import { createContext, useContext, useState, type ReactNode } from 'react'
import { loadLanguage, saveLanguage } from '../infrastructure/preferences'

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
    game: 'Game',
    x01: 'X01',
    cricket: 'Cricket',
    crazy: 'Crazy Cricket',
    crazyHint: 'Six random numbers plus the bull. After each round, numbers nobody hit that round are rerolled, marks included.',
    cricketHint: '15 to 20 and the bull. Close with 3 marks, score on open numbers.',
    points: 'Points',
    targets: 'Targets',
    closedByAll: 'Dead',
    shootFor: 'Shoot for',
    crazyRoll: 'CRAZY ROLL',
    teams: 'Teams',
    team: 'Team',
    teamsHint: 'Tap a badge to change team. Team members take turns.',
    needTwoTeams: 'Pick at least 2 teams.',
    winTeam: 'win the match!',
    firstNine: 'First 9',
    highest: 'High',
    bestLeg: 'Best leg',
    marks: 'Marks',
    history: 'History',
    matches: 'Matches',
    won: 'won',
    back: 'Back',
    noHistory: 'No finished matches yet. Finish a match and it will show up here.',
    deleteMatch: 'Delete match',
    confirmDelete: 'Delete this match from the history?',
    highCheckout: 'Best checkout',
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
    game: 'Jeu',
    x01: 'X01',
    cricket: 'Cricket',
    crazy: 'Crazy Cricket',
    crazyHint: 'Six numéros au hasard plus le bull. À chaque tour complet, les numéros que personne n\'a touchés pendant ce tour sont retirés au sort, marques comprises.',
    cricketHint: 'Du 15 au 20 et le bull. Fermez avec 3 marques, marquez sur les numéros ouverts.',
    points: 'Points',
    targets: 'Cibles',
    closedByAll: 'Mort',
    shootFor: 'Visez',
    crazyRoll: 'ROULETTE FOLLE',
    teams: 'Équipes',
    team: 'Équipe',
    teamsHint: 'Touchez un badge pour changer d\'équipe. Les coéquipiers lancent à tour de rôle.',
    needTwoTeams: 'Il faut au moins 2 équipes.',
    winTeam: 'remportent le match !',
    firstNine: '9 premières',
    highest: 'Max',
    bestLeg: 'Meilleure manche',
    marks: 'Marques',
    history: 'Historique',
    matches: 'Parties',
    won: 'gagnées',
    back: 'Retour',
    noHistory: 'Aucune partie terminée. Terminez une partie et elle apparaîtra ici.',
    deleteMatch: 'Supprimer la partie',
    confirmDelete: 'Supprimer cette partie de l\'historique ?',
    highCheckout: 'Meilleure finition',
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
  const [lang, setLangState] = useState<Lang>(
    () => loadLanguage(['en', 'fr'] as const) ?? (navigator.language.startsWith('fr') ? 'fr' : 'en'),
  )
  const setLang = (next: Lang) => {
    setLangState(next)
    saveLanguage(next)
  }
  const t = (key: Key) => dict[lang][key]
  return <I18nContext.Provider value={{ lang, setLang, t }}>{children}</I18nContext.Provider>
}

export function useI18n(): I18n {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n outside I18nProvider')
  return ctx
}
