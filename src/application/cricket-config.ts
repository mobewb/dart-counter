import { cricket } from '../domain'

/** A source of numbers in [0, 1), like `Math.random`. Injected so dealing can be tested. */
export type Random = () => number

/**
 * Builds the config of a cricket match. Standard cricket uses 20 to 15 and the
 * bull. Crazy cricket deals six random numbers (high to low) plus the bull, and
 * keeps the shuffled numbers left over as its reroll pool.
 */
export function cricketConfig(variant: 'cricket' | 'crazy', playerCount: number, random: Random = Math.random): cricket.CricketConfig {
  if (variant === 'cricket') {
    return { playerCount, targets: cricket.CRICKET_TARGETS, targetPolicy: { kind: 'fixed' } }
  }
  const numbers = Array.from({ length: 20 }, (_, i) => i + 1)
  for (let i = numbers.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[numbers[i], numbers[j]] = [numbers[j]!, numbers[i]!]
  }
  const targets = [...numbers.slice(0, 6).sort((a, b) => b - a), cricket.BULL]
  return { playerCount, targets, targetPolicy: { kind: 'reroll', pool: numbers.slice(6) } }
}
