/** What a darts caller announces after a dart. The UI turns calls into words. */
export type Call =
  | { type: 'visit'; score: number }
  | { type: 'noScore' }
  | { type: 'bust' }
  | { type: 'gameShot' }
  | { type: 'matchShot'; winner: string }
  | { type: 'winner'; winner: string }
  /** X01: the next thrower is on a finish. */
  | { type: 'require'; player: string; remaining: number }
  /** Killer: a side drew its number, became a killer, or is out. */
  | { type: 'drawn'; player: string; number: number }
  | { type: 'killer'; player: string }
  | { type: 'out'; player: string }
  /** The round limit is reached; `player` leads and takes the match (an X01 leg). */
  | { type: 'roundLimit'; player: string }
  | { type: 'suddenDeath' }

/** How a caller delivers a call: roaring for a maximum or a win, flat for a poor visit. */
export type Mood = 'roar' | 'excited' | 'neutral' | 'flat'

/** A ton (100) or more lifts the caller; under 30 lets them down. */
export function mood(call: Call): Mood {
  switch (call.type) {
    case 'visit':
      if (call.score === 180) return 'roar'
      if (call.score >= 100) return 'excited'
      return call.score < 30 ? 'flat' : 'neutral'
    case 'gameShot':
    case 'matchShot':
    case 'winner':
      return 'roar'
    case 'noScore':
    case 'bust':
      return 'flat'
    case 'killer':
    case 'out':
    case 'roundLimit':
    case 'suddenDeath':
      return 'excited'
    case 'require':
    case 'drawn':
      return 'neutral'
  }
}
