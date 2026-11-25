import type { AchievementId } from '../application/achievements'
import type { Lang } from './i18n'

interface Copy {
  icon: string
  name: Record<Lang, string>
  /** How to earn it. */
  how: Record<Lang, string>
}

const copy = (icon: string, en: [string, string], fr: [string, string]): Copy => ({
  icon,
  name: { en: en[0], fr: fr[0] },
  how: { en: en[1], fr: fr[1] },
})

export const achievementCopy: Record<AchievementId, Copy> = {
  firstMatch: copy('🎯', ['First steps', 'Finish a match'], ['Premiers pas', 'Terminer une partie']),
  firstWin: copy('🏆', ['First blood', 'Win a match'], ['Première victoire', 'Gagner une partie']),
  regular: copy('🍺', ['Regular', `Play 10 matches`], ['Habitué', 'Jouer 10 parties']),
  veteran: copy('🎖️', ['Veteran', 'Play 50 matches'], ['Vétéran', 'Jouer 50 parties']),
  hatTrick: copy('🔥', ['Hat-trick', 'Win 3 matches in a row'], ['Coup du chapeau', 'Gagner 3 parties d\'affilée']),
  globetrotter: copy('🧭', ['Globetrotter', 'Play every game mode'], ['Globe-trotteur', 'Jouer à tous les modes de jeu']),
  teamSpirit: copy('🤝', ['Team spirit', 'Win a team match'], ['Esprit d\'équipe', 'Gagner une partie en équipe']),
  fullHouse: copy('🎉', ['Full house', 'Play a match with 8 players'], ['Salle comble', 'Jouer une partie à 8']),
  bullseye: copy('🔴', ['Bull\'s eye', 'Hit the bull\'s eye'], ['Dans le mille', 'Toucher le bull (50)']),
  threeInABed: copy('🛏️', ['Three in a bed', 'Three darts in the same bed'], ['Trois dans le lit', 'Trois fléchettes dans la même case']),
  shanghai: copy('🐉', ['Shanghai', 'Single, double and triple of one number in a visit'], ['Shanghai', 'Simple, double et triple du même numéro en une volée']),
  oneEighty: copy('💯', ['One hundred and eighty!', 'Three triple 20s'], ['Cent quatre-vingts !', 'Trois triples 20']),
  tonCheckout: copy('💰', ['Ton-up finish', 'Check out from 100 or more (X01)'], ['Finition à trois chiffres', 'Finir depuis 100 ou plus (X01)']),
  bullFinish: copy('🐂', ['Bull finish', 'Win a leg on the bull\'s eye (X01)'], ['Finir au bull', 'Gagner une manche sur le bull (X01)']),
  nineDarter: copy('👑', ['Nine-darter', 'Win a 501 leg in 9 darts'], ['Neuf fléchettes', 'Gagner une manche de 501 en 9 fléchettes']),
  nineMarks: copy('🏏', ['Nine marks', 'Three triples on targets in a visit (Cricket)'], ['Neuf marques', 'Trois triples sur des cibles en une volée (Cricket)']),
  speedClock: copy('⏱️', ['Clockwork', 'Win Around the Clock in 30 darts or fewer'], ['Réglé comme une horloge', 'Gagner l\'Horloge en 30 fléchettes ou moins']),
  tripleKill: copy('💀', ['Triple kill', 'Take 3 lives in one visit (Killer)'], ['Triplé mortel', 'Prendre 3 vies en une volée (Killer)']),
  knockBack: copy('↩️', ['Back to square one', 'Send an opponent back to 0 (321)'], ['Retour à la case départ', 'Renvoyer un adversaire à 0 (321)']),
  bigFish: copy('🐟', ['The big fish', 'Check out 170: T20, T20, bull'], ['Le gros poisson', 'Finir 170 : T20, T20, bull']),
  madhouse: copy('🏚️', ['Madhouse', 'Win a leg on double 1'], ['La maison de fous', 'Gagner une manche sur le double 1']),
  bedAndBreakfast: copy('🍳', ['Bed & breakfast', '20, 5 and 1: the classic 26'], ['Bed & breakfast', '20, 5 et 1 : le fameux 26']),
  blindfolded: copy('🙈', ['Blindfolded', 'Miss with all three darts'], ['Les yeux bandés', 'Rater les trois fléchettes']),
  boing: copy('🦘', ['Boing boing boing', 'Bounce 3 times in one 321 match'], ['Boing boing boing', 'Rebondir 3 fois dans une partie de 321']),
  nightOwl: copy('🦉', ['Night owl', 'Win a match between midnight and 5 am'], ['Oiseau de nuit', 'Gagner une partie entre minuit et 5 h']),
}

/** Easter eggs, found on this device rather than earned by a player. */
export const EGGS = ['logo', 'konami', 'ghost', 'trophy', 'night'] as const
export type EggId = (typeof EGGS)[number]

export const eggCopy: Record<EggId, Copy> = {
  logo: copy('🌀', ['Spin doctor', 'Played with the logo'], ['Tête qui tourne', 'Joué avec le logo']),
  konami: copy('🕹️', ['Old school', '↑ ↑ ↓ ↓ ← → ← → B A'], ['Vieille école', '↑ ↑ ↓ ↓ ← → ← → B A']),
  ghost: copy('👻', ['The ghost is back', 'Invited the old mascot'], ['Le fantôme est de retour', 'Invité l\'ancienne mascotte']),
  trophy: copy('🎊', ['Trophy polisher', 'Could not stop touching the trophy'], ['Polisseur de trophée', 'N\'a pas pu s\'empêcher de toucher le trophée']),
  night: copy('🌙', ['Last orders', 'Opened the app in the dead of night'], ['Dernière tournée', 'Ouvert l\'appli en pleine nuit']),
}
